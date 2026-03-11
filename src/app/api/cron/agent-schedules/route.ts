import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import { agentSchedules } from "@/lib/db/schema";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron:agent-schedules");

// ─── POST /api/cron/agent-schedules ──────────────────────
// Runs every 15 minutes (configured in vercel.json).
// Finds due active schedules and marks them as run.
// Full worker dispatch is wired in a later phase.

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const now = new Date();
    // Consider a schedule "due" if it has never run, or last ran more than
    // 15 minutes ago. True cron-expression evaluation is handled by the worker;
    // this endpoint acts as the polling heartbeat.
    const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000);

    const dueSchedules = await db
      .select({ id: agentSchedules.id, scheduleType: agentSchedules.scheduleType })
      .from(agentSchedules)
      .where(
        and(
          eq(agentSchedules.isActive, true),
          or(
            isNull(agentSchedules.lastRunAt),
            lt(agentSchedules.lastRunAt, fifteenMinutesAgo)
          )
        )
      );

    if (dueSchedules.length === 0) {
      return Response.json({ data: { triggered: 0 } });
    }

    // Mark all due schedules as run.
    const ids = dueSchedules.map((s) => s.id);

    for (const id of ids) {
      await db
        .update(agentSchedules)
        .set({ lastRunAt: now, updatedAt: now })
        .where(eq(agentSchedules.id, id));
    }

    log.info({ count: ids.length }, "Agent schedules marked as run");

    return Response.json({ data: { triggered: ids.length } });
  } catch (error) {
    log.error({ err: error }, "agent-schedules cron failed");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
