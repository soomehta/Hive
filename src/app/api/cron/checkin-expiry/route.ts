import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import { agentCheckins } from "@/lib/db/schema";
import { and, eq, lt, inArray } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:checkin-expiry");

// ─── POST /api/cron/checkin-expiry ────────────────────────
// Runs hourly (configured in vercel.json).
// Finds pending check-ins scheduled more than 24 hours ago and marks them
// as expired. Escalated count reflects items whose task was urgent.

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Fetch stale pending check-ins.
    const staleCheckins = await db
      .select({
        id: agentCheckins.id,
        taskId: agentCheckins.taskId,
        questionContext: agentCheckins.questionContext,
      })
      .from(agentCheckins)
      .where(
        and(
          eq(agentCheckins.status, "pending"),
          lt(agentCheckins.scheduledAt, twentyFourHoursAgo)
        )
      );

    if (staleCheckins.length === 0) {
      return Response.json({ data: { expired: 0, escalated: 0 } });
    }

    const staleIds = staleCheckins.map((c) => c.id);

    // Mark all stale check-ins as expired.
    await db
      .update(agentCheckins)
      .set({ status: "expired" })
      .where(inArray(agentCheckins.id, staleIds));

    // Count escalated: check-ins whose questionContext flags urgency.
    const escalated = staleCheckins.filter((c) => {
      const ctx = c.questionContext as Record<string, unknown> | null;
      return ctx && ctx["priority"] === "urgent";
    }).length;

    log.info(
      { expired: staleIds.length, escalated },
      "Check-in expiry cron completed"
    );

    return Response.json({
      data: { expired: staleIds.length, escalated },
    });
  } catch (error) {
    log.error({ err: error }, "checkin-expiry cron failed");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
