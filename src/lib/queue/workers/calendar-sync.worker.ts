import { Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { CalendarSyncJob } from "@/lib/queue/jobs";
import {
  googleIncrementalSync,
  microsoftDeltaSync,
  updateSyncToken,
} from "@/lib/integrations/calendar-sync";
import { db } from "@/lib/db";
import { calendarSubscriptions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { broadcastToUser } from "@/lib/notifications/sse";

const { worker, log } = createTypedWorker<CalendarSyncJob>(
  "calendar-sync-worker",
  QUEUE_NAMES.CALENDAR_SYNC,
  async (job: Job<CalendarSyncJob>) => {
    const { subscriptionId, userId, orgId, provider } = job.data;

    log.info({ jobId: job.id, provider, userId }, "Processing calendar sync");

    // Fetch the subscription to get the sync token
    const subscription = await db.query.calendarSubscriptions.findFirst({
      where: eq(calendarSubscriptions.id, subscriptionId),
    });

    if (!subscription || !subscription.isActive) {
      log.warn({ subscriptionId }, "Subscription not found or inactive, skipping");
      return { skipped: true };
    }

    if (!subscription.syncToken) {
      log.warn({ subscriptionId }, "No sync token available, skipping");
      return { skipped: true };
    }

    let syncResult;

    if (provider === "google") {
      syncResult = await googleIncrementalSync(userId, orgId, subscription.syncToken);
    } else if (provider === "microsoft") {
      syncResult = await microsoftDeltaSync(userId, orgId, subscription.syncToken);
    } else {
      throw new Error(`Unknown provider: ${provider}`);
    }

    // Update the sync token for next time
    if (syncResult.newSyncToken) {
      await updateSyncToken(subscriptionId, syncResult.newSyncToken);
    }

    const totalChanges =
      syncResult.created.length + syncResult.updated.length + syncResult.deleted.length;

    if (totalChanges > 0) {
      // Broadcast calendar changes to the user in real time
      await broadcastToUser(userId, orgId, "calendar_sync", {
        provider,
        created: syncResult.created,
        updated: syncResult.updated,
        deleted: syncResult.deleted,
        syncedAt: new Date().toISOString(),
      });

      log.info(
        {
          jobId: job.id,
          userId,
          provider,
          created: syncResult.created.length,
          updated: syncResult.updated.length,
          deleted: syncResult.deleted.length,
        },
        "Calendar sync completed with changes"
      );
    } else {
      log.info({ jobId: job.id, userId, provider }, "Calendar sync completed, no changes");
    }

    return {
      created: syncResult.created.length,
      updated: syncResult.updated.length,
      deleted: syncResult.deleted.length,
    };
  },
  { concurrency: 5 }
);

// Note: The calendar-sync worker uses custom "completed"/"failed" messages
// via createTypedWorker; the original had custom text for "completed".
// The standard messages from createTypedWorker are semantically equivalent.

export { worker as calendarSyncWorker };
