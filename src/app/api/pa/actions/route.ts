import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getPendingActions } from "@/lib/db/queries/pa-actions";
import { createLogger } from "@/lib/logger";

const log = createLogger("pa-actions");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const actions = await getPendingActions(auth.userId, auth.orgId);
    return Response.json({ data: actions });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "PA actions error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
