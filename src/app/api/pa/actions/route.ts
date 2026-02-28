import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getPendingActions } from "@/lib/db/queries/pa-actions";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const actions = await getPendingActions(auth.userId, auth.orgId);
    return Response.json({ data: actions });
  } catch (error) {
    return errorResponse(error);
  }
}
