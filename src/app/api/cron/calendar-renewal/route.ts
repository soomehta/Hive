import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { renewExpiringSubscriptions } from "@/lib/integrations/calendar-sync";

const log = createLogger("calendar-renewal-cron");

/**
 * Cron endpoint to renew expiring calendar webhook subscriptions.
 * Should be called every 6 hours via vercel.json cron schedule.
 *
 * Google watch channels expire in ~7 days, Microsoft subscriptions in ~3 days.
 * This endpoint renews any subscription expiring within the next 12 hours.
 */
export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const renewed = await renewExpiringSubscriptions();
    log.info({ renewed }, "Calendar subscription renewal cron completed");
    return Response.json({ success: true, renewed });
  } catch (error) {
    log.error({ err: error }, "Calendar subscription renewal cron error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
