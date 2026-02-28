import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getSwarmSessionWithRuns } from "@/lib/db/queries/swarm-sessions";
import { getSwarmContext } from "@/lib/bees/context";
import { getSwarmSignals } from "@/lib/bees/signals";
import { getSwarmHandovers } from "@/lib/bees/handover";
import { errorResponse } from "@/lib/utils/errors";

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
    return errorResponse(error);
  }
}
