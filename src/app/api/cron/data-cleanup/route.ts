import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { activityLog, notifications, voiceTranscripts } from "@/lib/db/schema";
import { lt, and, eq, sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";
import { verifyCronSecret } from "@/lib/auth/cron-auth";

const log = createLogger("data-cleanup");

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const daysAgo = (days: number) =>
      new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    // 1. Delete activity_log older than 90 days
    const [activityResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(activityLog)
      .where(lt(activityLog.createdAt, daysAgo(90)));
    await db.delete(activityLog).where(lt(activityLog.createdAt, daysAgo(90)));

    // 2. Delete read notifications older than 30 days
    const [readNotifResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.isRead, true),
          lt(notifications.createdAt, daysAgo(30))
        )
      );
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.isRead, true),
          lt(notifications.createdAt, daysAgo(30))
        )
      );

    // 3. Delete unread notifications older than 90 days
    const [unreadNotifResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.isRead, false),
          lt(notifications.createdAt, daysAgo(90))
        )
      );
    await db
      .delete(notifications)
      .where(
        and(
          eq(notifications.isRead, false),
          lt(notifications.createdAt, daysAgo(90))
        )
      );

    // 4. Delete voice_transcripts older than 30 days
    const [transcriptsResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(voiceTranscripts)
      .where(lt(voiceTranscripts.createdAt, daysAgo(30)));
    await db
      .delete(voiceTranscripts)
      .where(lt(voiceTranscripts.createdAt, daysAgo(30)));

    const stats = {
      activityLogsDeleted: activityResult?.count ?? 0,
      readNotificationsDeleted: readNotifResult?.count ?? 0,
      unreadNotificationsDeleted: unreadNotifResult?.count ?? 0,
      voiceTranscriptsDeleted: transcriptsResult?.count ?? 0,
    };

    log.info(stats, "Data cleanup completed");

    return Response.json({ success: true, stats });
  } catch (error) {
    log.error({ err: error }, "Data cleanup failed");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
