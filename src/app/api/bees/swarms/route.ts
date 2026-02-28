import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getUserSwarmSessions } from "@/lib/db/queries/swarm-sessions";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const sessions = await getUserSwarmSessions(auth.userId, auth.orgId);
    return Response.json({ data: sessions });
  } catch (error) {
    return errorResponse(error);
  }
}
