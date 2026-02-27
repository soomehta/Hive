import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { findSubscriptionByMicrosoftId } from "@/lib/integrations/calendar-sync";
import { getCalendarSyncQueue } from "@/lib/queue";
import type { CalendarSyncJob } from "@/lib/queue/jobs";

const log = createLogger("microsoft-calendar-webhook");

/**
 * Microsoft Graph change notification handler.
 *
 * On subscription creation, Microsoft sends a validation request:
 *   POST with ?validationToken=<token> — must return token as text/plain.
 *
 * On change events, Microsoft sends a POST with JSON body:
 *   { value: [{ subscriptionId, clientState, changeType, resource, ... }] }
 */
export async function POST(req: NextRequest) {
  try {
    // Handle validation token challenge
    const validationToken = req.nextUrl.searchParams.get("validationToken");
    if (validationToken) {
      log.info("Microsoft webhook validation challenge received");
      return new Response(validationToken, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    const body = await req.json();
    const notifications = body?.value;

    if (!Array.isArray(notifications) || notifications.length === 0) {
      return new Response(null, { status: 202 });
    }

    const expectedClientState = process.env.MICROSOFT_WEBHOOK_SECRET ?? "hive-calendar-sync";

    for (const notification of notifications) {
      // Validate client state to prevent spoofing
      if (notification.clientState !== expectedClientState) {
        log.warn({ subscriptionId: notification.subscriptionId }, "Invalid clientState on Microsoft notification");
        continue;
      }

      const subscription = await findSubscriptionByMicrosoftId(notification.subscriptionId);
      if (!subscription) {
        log.warn({ subscriptionId: notification.subscriptionId }, "Unknown Microsoft subscription ID");
        continue;
      }

      const job: CalendarSyncJob = {
        subscriptionId: subscription.id,
        integrationId: subscription.integrationId,
        userId: subscription.userId,
        orgId: subscription.orgId,
        provider: "microsoft",
      };

      await getCalendarSyncQueue().add("microsoft-sync", job, {
        // Deduplicate rapid-fire notifications within 5 seconds
        jobId: `ms-sync-${subscription.id}-${Math.floor(Date.now() / 5000)}`,
      });

      log.info(
        { subscriptionId: notification.subscriptionId, changeType: notification.changeType, userId: subscription.userId },
        "Microsoft calendar sync job enqueued"
      );
    }

    // Microsoft requires 202 Accepted
    return new Response(null, { status: 202 });
  } catch (error) {
    log.error({ err: error }, "Microsoft calendar webhook error");
    return new Response(null, { status: 202 });
  }
}
