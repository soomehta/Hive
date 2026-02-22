import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { db } from "@/lib/db";
import { swarmSessions, hiveContext, beeRuns } from "@/lib/db/schema";
import { lt, and, inArray } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("cron-swarm-cleanup");

const RETENTION_DAYS = 30;

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);

    // Find old swarm sessions
    const oldSessions = await db
      .select({ id: swarmSessions.id })
      .from(swarmSessions)
      .where(lt(swarmSessions.createdAt, cutoff));

    if (oldSessions.length === 0) {
      return Response.json({ cleaned: 0 });
    }

    const sessionIds = oldSessions.map((s) => s.id);

    // Cascade deletes handle bee_runs, hive_context, bee_handovers, bee_signals
    // since they all have onDelete: cascade on swarmSessionId
    const deleted = await db
      .delete(swarmSessions)
      .where(inArray(swarmSessions.id, sessionIds))
      .returning();

    log.info({ count: deleted.length }, "Cleaned up old swarm sessions");

    return Response.json({ cleaned: deleted.length });
  } catch (error) {
    log.error({ err: error }, "Swarm cleanup failed");
    return Response.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
