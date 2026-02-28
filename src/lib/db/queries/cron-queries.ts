import { db } from "@/lib/db";
import { tasks, notifications, paProfiles, activityLog, voiceTranscripts } from "@/lib/db/schema";
import { and, lt, notInArray, eq, gte, desc, sql } from "drizzle-orm";

// ─── PA Profile Queries ──────────────────────────────────

/**
 * Returns all PA profiles that have the morning briefing feature enabled.
 */
export async function getProfilesWithBriefingEnabled() {
  return db
    .select()
    .from(paProfiles)
    .where(eq(paProfiles.morningBriefingEnabled, true));
}

// ─── Task Queries ────────────────────────────────────────

/**
 * Returns all subtasks belonging to the given parent task within an org.
 */
export async function getSubtasks(parentTaskId: string, orgId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.parentTaskId, parentTaskId), eq(tasks.orgId, orgId)));
}

/**
 * Returns all overdue tasks (dueDate < now, not done or cancelled) across all orgs.
 * Used by the overdue-nudge cron job.
 */
export async function getOverdueTasks() {
  const now = new Date();
  return db
    .select()
    .from(tasks)
    .where(
      and(
        lt(tasks.dueDate, now),
        notInArray(tasks.status, ["done", "cancelled"])
      )
    );
}

/**
 * Returns all in-progress tasks that have not been updated in the last
 * {@link staleDaysThreshold} days.
 */
export async function getStaleTasks(staleDaysThreshold = 7) {
  const cutoff = new Date(
    Date.now() - staleDaysThreshold * 24 * 60 * 60 * 1000
  );
  return db
    .select()
    .from(tasks)
    .where(
      and(eq(tasks.status, "in_progress"), lt(tasks.updatedAt, cutoff))
    );
}

// ─── Notification / Nudge Queries ───────────────────────

/**
 * Returns recent pa_nudge notifications for a given user that were created
 * after {@link since}.  Limited to {@link limit} rows so callers can check
 * for a specific taskId without pulling the whole history.
 */
export async function getRecentNudge(
  userId: string,
  since: Date,
  limit = 10
) {
  return db
    .select()
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, "pa_nudge"),
        gte(notifications.createdAt, since)
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

// ─── Cleanup Queries ─────────────────────────────────────

export interface CleanupStats {
  activityLogsDeleted: number;
  readNotificationsDeleted: number;
  unreadNotificationsDeleted: number;
  voiceTranscriptsDeleted: number;
}

/**
 * Deletes stale records according to the data-retention policy:
 *  - activity_log older than 90 days
 *  - read notifications older than 30 days
 *  - unread notifications older than 90 days
 *  - voice_transcripts older than 30 days
 *
 * Returns the number of rows deleted per table.
 */
export async function cleanupOldRecords(): Promise<CleanupStats> {
  const now = new Date();
  const daysAgo = (days: number) =>
    new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // Count rows before deleting so we can return accurate stats
  const [activityResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(activityLog)
    .where(lt(activityLog.createdAt, daysAgo(90)));
  await db.delete(activityLog).where(lt(activityLog.createdAt, daysAgo(90)));

  const [readNotifResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.isRead, true), lt(notifications.createdAt, daysAgo(30)))
    );
  await db
    .delete(notifications)
    .where(
      and(eq(notifications.isRead, true), lt(notifications.createdAt, daysAgo(30)))
    );

  const [unreadNotifResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(notifications)
    .where(
      and(eq(notifications.isRead, false), lt(notifications.createdAt, daysAgo(90)))
    );
  await db
    .delete(notifications)
    .where(
      and(eq(notifications.isRead, false), lt(notifications.createdAt, daysAgo(90)))
    );

  const [transcriptsResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(voiceTranscripts)
    .where(lt(voiceTranscripts.createdAt, daysAgo(30)));
  await db
    .delete(voiceTranscripts)
    .where(lt(voiceTranscripts.createdAt, daysAgo(30)));

  return {
    activityLogsDeleted: activityResult?.count ?? 0,
    readNotificationsDeleted: readNotifResult?.count ?? 0,
    unreadNotificationsDeleted: unreadNotifResult?.count ?? 0,
    voiceTranscriptsDeleted: transcriptsResult?.count ?? 0,
  };
}
