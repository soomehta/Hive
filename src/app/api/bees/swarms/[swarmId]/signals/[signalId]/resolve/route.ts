import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getSwarmSession } from "@/lib/db/queries/swarm-sessions";
import { resolveSignal, hasHoldSignal } from "@/lib/bees/signals";
import { getSwarmExecutionQueue } from "@/lib/queue";
import type { SwarmExecutionJob } from "@/lib/queue/jobs";
import { createLogger } from "@/lib/logger";
import { errorResponse } from "@/lib/utils/errors";

const log = createLogger("api-signal-resolve");

interface RouteParams {
  params: Promise<{ swarmId: string; signalId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { swarmId, signalId } = await params;

    const session = await getSwarmSession(swarmId);
    if (!session || session.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const resolved = await resolveSignal(signalId);
    if (!resolved) {
      return Response.json({ error: "Signal not found" }, { status: 404 });
    }

    // If the swarm was paused and no more hold signals remain, resume it
    if (session.status === "paused") {
      const stillHolding = await hasHoldSignal(swarmId);
      if (!stillHolding) {
        log.info({ swarmId }, "Resuming paused swarm after signal resolution");
        const dispatchPlan = session.dispatchPlan as any;
        const resumeJob: SwarmExecutionJob = {
          swarmSessionId: swarmId,
          userId: session.userId,
          orgId: session.orgId,
          triggerMessage: session.triggerMessage,
          dispatchPlan,
          verbosity: "normal",
          formality: "neutral",
        };
        await getSwarmExecutionQueue().add("execute-swarm", resumeJob);
      }
    }

    return Response.json(resolved);
  } catch (error) {
    return errorResponse(error);
  }
}
