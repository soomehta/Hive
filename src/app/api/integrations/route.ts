import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getUserIntegrations } from "@/lib/db/queries/integrations";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const integrations = await getUserIntegrations(auth.userId, auth.orgId);
    return Response.json({ data: integrations });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Integrations list error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
