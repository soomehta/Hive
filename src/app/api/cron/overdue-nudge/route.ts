import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { createNotification } from "@/lib/notifications/in-app";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { getOverdueTasks, getRecentNudge } from "@/lib/db/queries/cron-queries";

const log = createLogger("overdue-nudge");

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    );

    // ── Find overdue tasks (dueDate < now, not done/cancelled) ──
    const overdueTasks = await getOverdueTasks();

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const task of overdueTasks) {
      try {
        // ── Skip if no assignee ──────────────────────────
        if (!task.assigneeId) {
          skipped++;
          continue;
        }

        // ── Check if already nudged within last 24 hours ─
        const recentNudge = await getRecentNudge(task.assigneeId, twentyFourHoursAgo, 5);

        // Check if any recent nudge is about this specific task
        const alreadyNudged = recentNudge.some((n) => {
          const meta = n.metadata as Record<string, unknown> | null;
          return meta?.taskId === task.id;
        });

        if (alreadyNudged) {
          skipped++;
          continue;
        }

        // ── Calculate relative time ──────────────────────
        const dueDate = new Date(task.dueDate!);
        const diffMs = now.getTime() - dueDate.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let relativeTime: string;
        if (diffDays > 0) {
          relativeTime = `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
        } else if (diffHours > 0) {
          relativeTime = `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
        } else {
          relativeTime = "just now";
        }

        // ── Send notification ────────────────────────────
        await createNotification({
          userId: task.assigneeId,
          orgId: task.orgId,
          type: "pa_nudge",
          title: `Task overdue: "${task.title}"`,
          body: `"${task.title}" was due ${relativeTime}. Want me to update the deadline or mark it done?`,
          metadata: {
            taskId: task.id,
            projectId: task.projectId,
            dueDate: dueDate.toISOString(),
            nudgeType: "overdue",
          },
        });

        sent++;
      } catch (taskError) {
        const message =
          taskError instanceof Error ? taskError.message : "Unknown error";
        errors.push(`Task ${task.id}: ${message}`);
      }
    }

    return Response.json({
      success: true,
      sent,
      skipped,
      total: overdueTasks.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    log.error({ err: error }, "Overdue nudge cron error");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
