import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { deleteIntegration } from "@/lib/db/queries/integrations";
import { stopAllSubscriptionsForIntegration } from "@/lib/integrations/calendar-sync";
import { logActivity } from "@/lib/db/queries/activity";
import { createLogger } from "@/lib/logger";
import { errorResponse } from "@/lib/utils/errors";

const log = createLogger("integrations");

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ integrationId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { integrationId } = await params;

    // Stop calendar webhook subscriptions before deleting
    await stopAllSubscriptionsForIntegration(integrationId).catch((err) =>
      log.warn({ err, integrationId }, "Failed to stop calendar subscriptions during disconnect")
    );

    const deleted = await deleteIntegration(integrationId, auth.userId, auth.orgId);
    if (!deleted) {
      return Response.json({ error: "Integration not found" }, { status: 404 });
    }
    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "member_left",
      metadata: { action: "integration_deleted", integrationId },
    });

    return Response.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
