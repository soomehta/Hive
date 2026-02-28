import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getUserIntegrations } from "@/lib/db/queries/integrations";
import { errorResponse } from "@/lib/utils/errors";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const integrations = await getUserIntegrations(auth.userId, auth.orgId);
    return Response.json({ data: integrations });
  } catch (error) {
    return errorResponse(error);
  }
}
