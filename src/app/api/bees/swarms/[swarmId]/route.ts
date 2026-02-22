import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getSwarmSessionWithRuns } from "@/lib/db/queries/swarm-sessions";
import { getSwarmContext } from "@/lib/bees/context";
import { getSwarmSignals } from "@/lib/bees/signals";
import { getSwarmHandovers } from "@/lib/bees/handover";
import { createLogger } from "@/lib/logger";

const log = createLogger("api-swarm-detail");

interface RouteParams {
  params: Promise<{ swarmId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { swarmId } = await params;

    const session = await getSwarmSessionWithRuns(swarmId);
    if (!session || session.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    const [context, signals, handovers] = await Promise.all([
      getSwarmContext(swarmId),
      getSwarmSignals(swarmId),
      getSwarmHandovers(swarmId),
    ]);

    return Response.json({
      ...session,
      context,
      signals,
      handovers,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to get swarm detail");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
