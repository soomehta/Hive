import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { eq, and, gte, desc } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/in-app";
import {
  generateBriefing,
  type BriefingContext,
} from "@/lib/ai/briefing-generator";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { getProfilesWithBriefingEnabled } from "@/lib/db/queries/cron-queries";
import { aggregateBriefingData } from "@/lib/data/briefing-data";

const log = createLogger("morning-briefing");

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ── Get all profiles with morning briefing enabled ──
    const profiles = await getProfilesWithBriefingEnabled();

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

        // ── Deduplication: skip if briefing already sent today ──
        const todayStartUtc = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const recentBriefing = await db
          .select()
          .from(notifications)
          .where(
            and(
              eq(notifications.userId, profile.userId),
              eq(notifications.type, "pa_briefing"),
              gte(notifications.createdAt, todayStartUtc)
            )
          )
          .orderBy(desc(notifications.createdAt))
          .limit(1);

        if (recentBriefing.length > 0) {
          skipped++;
          continue;
        }

        // ── Aggregate data for this user ────────────────
        const briefingData = await aggregateBriefingData(
          profile.userId,
          profile.orgId,
          userTimezone
        );

        const { todayTasks, weekTasks, overdueTasks, blockers, recentActivity } =
          briefingData;

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
    log.error({ err: error }, "Morning briefing cron error");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
