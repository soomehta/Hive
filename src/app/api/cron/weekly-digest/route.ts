import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { db } from "@/lib/db";
import { paProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { generateReport, type ReportData } from "@/lib/ai/report-generator";
import { verifyCronSecret } from "@/lib/auth/cron-auth";

const log = createLogger("weekly-digest");

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Get profiles with weekly digest enabled ─────────
    const profiles = await db
      .select()
      .from(paProfiles)
      .where(eq(paProfiles.weeklyDigestEnabled, true));

    const now = new Date();
    const currentDayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      try {
        // ── Check if today matches user's digest day ────
        const digestDay = profile.weeklyDigestDay ?? 5; // Default: Friday
        if (currentDayOfWeek !== digestDay) {
          skipped++;
          continue;
        }

        // ── Aggregate weekly data ───────────────────────
        const oneWeekAgo = new Date(
          now.getTime() - 7 * 24 * 60 * 60 * 1000
        );

        const [allTasksResult, activityResult] = await Promise.all([
          getTasks({ orgId: profile.orgId, limit: 500 }),
          getActivityFeed({ orgId: profile.orgId, limit: 100 }),
        ]);

        const allTasks = allTasksResult.data;

        // Tasks completed this week
        const completedThisWeek = allTasks.filter((t) => {
          if (!t.completedAt) return false;
          return new Date(t.completedAt) >= oneWeekAgo;
        });

        // Current blockers
        const currentBlockers = allTasks.filter((t) => t.isBlocked);

        // tasksByStatus
        const tasksByStatus: Record<string, number> = {};
        for (const t of allTasks) {
          tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
        }

        // tasksByAssignee
        const tasksByAssignee: Record<string, number> = {};
        for (const t of allTasks) {
          const key = t.assigneeId ?? "unassigned";
          tasksByAssignee[key] = (tasksByAssignee[key] ?? 0) + 1;
        }

        // tasksByPriority
        const tasksByPriority: Record<string, number> = {};
        for (const t of allTasks) {
          tasksByPriority[t.priority] = (tasksByPriority[t.priority] ?? 0) + 1;
        }

        // Completion rate
        const doneCount = allTasks.filter(
          (t) => t.status === "done" || t.status === "cancelled"
        ).length;
        const completionRate =
          allTasks.length > 0
            ? Math.round((doneCount / allTasks.length) * 100)
            : 0;

        // Overdue tasks
        const overdueTasks = allTasks
          .filter((t) => {
            if (!t.dueDate || t.status === "done" || t.status === "cancelled")
              return false;
            return new Date(t.dueDate) < now;
          })
          .map((t) => ({
            id: t.id,
            title: t.title,
            assignee: t.assigneeId ?? undefined,
            dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
          }));

        // Velocity (trailing 4 weeks)
        const velocity: number[] = [];
        for (let w = 3; w >= 0; w--) {
          const weekStart = new Date(
            now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000
          );
          const weekEnd = new Date(
            now.getTime() - w * 7 * 24 * 60 * 60 * 1000
          );
          const count = allTasks.filter((t) => {
            if (!t.completedAt) return false;
            const completed = new Date(t.completedAt);
            return completed >= weekStart && completed < weekEnd;
          }).length;
          velocity.push(count);
        }

        // Upcoming deadlines (next 7 days)
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const upcomingDeadlines = allTasks
          .filter((t) => {
            if (!t.dueDate || t.status === "done" || t.status === "cancelled")
              return false;
            const due = new Date(t.dueDate);
            return due >= now && due <= nextWeek;
          })
          .map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
          }));

        // Workload by person
        const workloadByPerson: Record<string, number> = {};
        for (const t of allTasks) {
          if (
            t.assigneeId &&
            t.status !== "done" &&
            t.status !== "cancelled"
          ) {
            workloadByPerson[t.assigneeId] =
              (workloadByPerson[t.assigneeId] ?? 0) + 1;
          }
        }

        // Recent activity
        const recentActivity = activityResult.data
          .filter((a) => new Date(a.createdAt) >= oneWeekAgo)
          .map((a) => ({
            type: a.type,
            description: `${a.type} on ${a.taskId ?? a.projectId ?? "org"}`,
            createdAt: new Date(a.createdAt).toISOString(),
          }));

        // ── Build report data ───────────────────────────
        const reportData: ReportData = {
          tasksByStatus,
          tasksByAssignee,
          tasksByPriority,
          completionRate,
          overdueTasks,
          blockers: currentBlockers.map((t) => ({
            id: t.id,
            title: t.title,
            assignee: t.assigneeId ?? undefined,
          })),
          velocity,
          upcomingDeadlines,
          workloadByPerson,
          recentActivity,
        };

        // ── Generate weekly digest narrative ─────────────
        const question = `Generate a weekly digest summary. This week, ${completedThisWeek.length} tasks were completed. There are currently ${currentBlockers.length} blocked tasks and ${overdueTasks.length} overdue tasks. The team velocity over the past 4 weeks was: ${velocity.join(", ")} tasks per week. Provide highlights, concerns, and recommendations.`;

        const result = await generateReport(question, reportData, {
          role: "member",
          name: profile.userId,
          date: now.toISOString().split("T")[0],
        });

        // ── Send notification ───────────────────────────
        await createNotification({
          userId: profile.userId,
          orgId: profile.orgId,
          type: "pa_briefing",
          title: "Your weekly digest is ready",
          body: result.narrative,
          metadata: {
            digestType: "weekly",
            completedCount: completedThisWeek.length,
            blockerCount: currentBlockers.length,
            overdueCount: overdueTasks.length,
            generatedAt: result.generatedAt,
          },
        });

        sent++;
      } catch (userError) {
        const message =
          userError instanceof Error ? userError.message : "Unknown error";
        errors.push(`User ${profile.userId}: ${message}`);
      }
    }

    return Response.json({
      success: true,
      sent,
      skipped,
      total: profiles.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    log.error({ err: error }, "Weekly digest cron error");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
