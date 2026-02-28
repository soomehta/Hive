import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { db } from "@/lib/db";
import { paProfiles } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { createNotification } from "@/lib/notifications/in-app";
import { generateReport } from "@/lib/ai/report-generator";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { aggregateReportData } from "@/lib/data/report-data";

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

        const reportData = await aggregateReportData(profile.orgId, {
          start: oneWeekAgo,
          end: now,
        });

        // Derived summary stats needed for the digest question
        const completedThisWeekCount = reportData.velocity[reportData.velocity.length - 1] ?? 0;
        const currentBlockersCount = reportData.blockers.length;
        const overdueTasksCount = reportData.overdueTasks.length;

        // ── Generate weekly digest narrative ─────────────
        const question = `Generate a weekly digest summary. This week, ${completedThisWeekCount} tasks were completed. There are currently ${currentBlockersCount} blocked tasks and ${overdueTasksCount} overdue tasks. The team velocity over the past 4 weeks was: ${reportData.velocity.join(", ")} tasks per week. Provide highlights, concerns, and recommendations.`;

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
            completedCount: completedThisWeekCount,
            blockerCount: currentBlockersCount,
            overdueCount: overdueTasksCount,
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
