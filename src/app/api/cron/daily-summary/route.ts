import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { paProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { chatCompletion } from "@/lib/ai/providers";
import { createNotification } from "@/lib/notifications/in-app";
import { getNotificationQueue } from "@/lib/queue";
import type { NotificationJob } from "@/lib/queue/jobs";
import { createLogger } from "@/lib/logger";
import { verifyCronSecret } from "@/lib/auth/cron-auth";

const log = createLogger("daily-summary");

export async function GET(req: NextRequest) {
  // Verify cron secret (timing-safe comparison)
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get all PA profiles with end-of-day digest enabled
    const profiles = await db
      .select({
        userId: paProfiles.userId,
        orgId: paProfiles.orgId,
        emailDigest: paProfiles.emailDigest,
      })
      .from(paProfiles)
      .where(eq(paProfiles.endOfDayDigestEnabled, true));

    let processed = 0;

    for (const profile of profiles) {
      try {
        // Get today's activity for this user
        const { data: activities } = await getActivityFeed({
          orgId: profile.orgId,
          userId: profile.userId,
          limit: 30,
        });

        // Filter to today's activities
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayActivities = activities.filter(
          (a) => new Date(a.createdAt) >= today
        );

        if (todayActivities.length === 0) continue;

        // Generate summary using AI
        const activitySummary = todayActivities
          .map((a) => `- ${a.type}: ${JSON.stringify(a.metadata ?? {})}`)
          .join("\n");

        const summary = await chatCompletion("classifier", {
          messages: [
            {
              role: "system",
              content:
                "Summarize this user's day in 2-3 concise sentences. Highlight accomplishments and key activities. Be encouraging but professional. Do not use emojis.",
            },
            {
              role: "user",
              content: `Activities today:\n${activitySummary}`,
            },
          ],
          temperature: 0.5,
          maxTokens: 150,
        });

        // Create in-app notification
        await createNotification({
          userId: profile.userId,
          orgId: profile.orgId,
          type: "pa_briefing",
          title: "Your daily summary",
          body: summary,
          metadata: {
            summaryType: "daily",
            activityCount: todayActivities.length,
          },
        });

        // Send email if opted in
        if (profile.emailDigest) {
          const emailJob: NotificationJob = {
            userId: profile.userId,
            orgId: profile.orgId,
            type: "pa_briefing",
            title: "Your daily summary",
            body: summary,
            channel: "email",
            metadata: { summaryType: "daily_email" },
          };
          const dateStr = new Date().toISOString().slice(0, 10);
          await getNotificationQueue().add("daily-summary-email", emailJob, {
            jobId: `notif:daily-summary:${profile.userId}:${dateStr}`,
          });
        }

        processed++;
      } catch (err) {
        log.error(
          { err, userId: profile.userId },
          "Failed to generate daily summary"
        );
      }
    }

    return Response.json({ success: true, processed });
  } catch (error) {
    log.error({ err: error }, "Daily summary cron failed");
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
