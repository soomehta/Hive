import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getUserSwarmSessions } from "@/lib/db/queries/swarm-sessions";
import { createLogger } from "@/lib/logger";

const log = createLogger("api-swarms");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const sessions = await getUserSwarmSessions(auth.userId, auth.orgId);
    return Response.json({ data: sessions });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Failed to list swarm sessions");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
