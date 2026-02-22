import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import {
  getSwarmSession,
  updateSwarmSession,
} from "@/lib/db/queries/swarm-sessions";
import { createLogger } from "@/lib/logger";

const log = createLogger("api-swarm-cancel");

interface RouteParams {
  params: Promise<{ swarmId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { swarmId } = await params;

    const session = await getSwarmSession(swarmId);
    if (!session || session.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    if (session.status === "completed" || session.status === "failed") {
      return Response.json(
        { error: "Swarm already finished" },
        { status: 400 }
      );
    }

    const updated = await updateSwarmSession(swarmId, { status: "failed" });
    return Response.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to cancel swarm");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
