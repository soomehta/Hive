import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { deleteIntegration } from "@/lib/db/queries/integrations";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { integrationId } = await params;

    const deleted = await deleteIntegration(integrationId, auth.userId, auth.orgId);
    if (!deleted) {
      return Response.json({ error: "Integration not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    console.error("Integration delete error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
