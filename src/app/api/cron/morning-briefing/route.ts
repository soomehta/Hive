import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { paProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import {
  generateBriefing,
  type BriefingContext,
} from "@/lib/ai/briefing-generator";

export async function POST(req: NextRequest) {
  // ── Verify CRON_SECRET ───────────────────────────────
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Get all profiles with morning briefing enabled ──
    const profiles = await db
      .select()
      .from(paProfiles)
      .where(eq(paProfiles.morningBriefingEnabled, true));

    const now = new Date();
    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const profile of profiles) {
      try {
        // ── Check if current time matches user's briefing time ──
        const userTimezone = profile.timezone ?? "UTC";
        const briefingTime = profile.morningBriefingTime ?? "08:45";

        // Get the current time in user's timezone
        const userNow = new Date(
          now.toLocaleString("en-US", { timeZone: userTimezone })
        );
        const userHour = userNow.getHours();
        const userMinute = userNow.getMinutes();
        const userTimeMinutes = userHour * 60 + userMinute;

        // Parse briefing target time
        const [targetHour, targetMinute] = briefingTime.split(":").map(Number);
        const targetTimeMinutes = targetHour * 60 + targetMinute;

        // Check if within +/- 15 minutes
        const diff = Math.abs(userTimeMinutes - targetTimeMinutes);
        if (diff > 15 && diff < 24 * 60 - 15) {
          skipped++;
          continue;
        }

        // ── Aggregate data for this user ────────────────
        const todayStart = new Date(
          userNow.getFullYear(),
          userNow.getMonth(),
          userNow.getDate()
        );
        const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
        const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const [myTasksResult, activityResult] = await Promise.all([
          getTasks({
            orgId: profile.orgId,
            assigneeId: profile.userId,
            limit: 100,
          }),
          getActivityFeed({ orgId: profile.orgId, limit: 20 }),
        ]);

        const myTasks = myTasksResult.data;

        const todayTasks = myTasks
          .filter((t) => {
            if (!t.dueDate || t.status === "done" || t.status === "cancelled")
              return false;
            const due = new Date(t.dueDate);
            return due >= todayStart && due < todayEnd;
          })
          .map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate
              ? new Date(t.dueDate).toISOString().split("T")[0]
              : undefined,
          }));

        const weekTasks = myTasks
          .filter((t) => {
            if (!t.dueDate || t.status === "done" || t.status === "cancelled")
              return false;
            const due = new Date(t.dueDate);
            return due >= todayEnd && due < weekEnd;
          })
          .map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate
              ? new Date(t.dueDate).toISOString().split("T")[0]
              : undefined,
          }));

        const overdueTasks = myTasks
          .filter((t) => {
            if (!t.dueDate || t.status === "done" || t.status === "cancelled")
              return false;
            return new Date(t.dueDate) < todayStart;
          })
          .map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
          }));

        const blockers = myTasks
          .filter((t) => t.isBlocked)
          .map((t) => ({
            id: t.id,
            title: t.title,
            reason: t.blockedReason ?? undefined,
          }));

        const recentActivity = activityResult.data
          .filter((a) => {
            const created = new Date(a.createdAt);
            return created >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
          })
          .map((a) => ({
            type: a.type,
            description: `${a.type} on ${a.taskId ?? a.projectId ?? "org"}`,
            createdAt: new Date(a.createdAt).toISOString(),
          }));

        // ── Determine day of week ───────────────────────
        const days = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];
        const dayOfWeek = days[userNow.getDay()];
        const dateStr = userNow.toISOString().split("T")[0];

        // ── Generate briefing ───────────────────────────
        const briefingContext: BriefingContext = {
          userName: profile.userId,
          firstName: profile.userId.split("_")[0] ?? "there",
          date: dateStr,
          dayOfWeek,
          timezone: userTimezone,
          todayTasks,
          weekTasks,
          overdueTasks,
          meetings: [], // Calendar integration data would go here
          recentActivity,
          blockers,
        };

        const briefingResult = await generateBriefing(briefingContext);

        // ── Send notification ───────────────────────────
        await createNotification({
          userId: profile.userId,
          orgId: profile.orgId,
          type: "pa_briefing",
          title: `Good ${userHour < 12 ? "morning" : "afternoon"}! Here's your daily briefing`,
          body: briefingResult.briefing,
          metadata: {
            todayTasks: todayTasks.length,
            overdueTasks: overdueTasks.length,
            blockers: blockers.length,
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
    console.error("Morning briefing cron error:", error);
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
