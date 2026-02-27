import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { findSubscriptionByChannelId } from "@/lib/integrations/calendar-sync";
import { getCalendarSyncQueue } from "@/lib/queue";
import type { CalendarSyncJob } from "@/lib/queue/jobs";

const log = createLogger("google-calendar-webhook");

/**
 * Google Calendar push notification handler.
 * Google sends a POST with headers:
 *  - X-Goog-Channel-ID: the channel UUID we created
 *  - X-Goog-Resource-ID: the resource being watched
 *  - X-Goog-Resource-State: "sync" (initial) or "exists" (change)
 */
export async function POST(req: NextRequest) {
  try {
    const channelId = req.headers.get("x-goog-channel-id");
    const resourceState = req.headers.get("x-goog-resource-state");

    if (!channelId) {
      return new Response("Missing channel ID", { status: 400 });
    }

    // "sync" is the initial confirmation — just ACK it
    if (resourceState === "sync") {
      log.info({ channelId }, "Google watch sync confirmation received");
      return new Response(null, { status: 200 });
    }

    // Look up the subscription
    const subscription = await findSubscriptionByChannelId(channelId);
    if (!subscription) {
      log.warn({ channelId }, "Unknown Google channel ID");
      return new Response(null, { status: 200 }); // ACK to stop retries
    }

    // Enqueue a sync job
    const job: CalendarSyncJob = {
      subscriptionId: subscription.id,
      integrationId: subscription.integrationId,
      userId: subscription.userId,
      orgId: subscription.orgId,
      provider: "google",
    };

    await getCalendarSyncQueue().add("google-sync", job, {
      // Deduplicate rapid-fire notifications within 5 seconds
      jobId: `google-sync-${subscription.id}-${Math.floor(Date.now() / 5000)}`,
    });

    log.info({ channelId, userId: subscription.userId }, "Google calendar sync job enqueued");
    return new Response(null, { status: 200 });
  } catch (error) {
    log.error({ err: error }, "Google calendar webhook error");
    // Always return 200 to prevent Google from retrying
    return new Response(null, { status: 200 });
  }
}
