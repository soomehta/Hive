import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { deleteItemRelation } from "@/lib/db/queries/items";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ relationId: string }>;
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { relationId } = await params;

    if (!hasPermission(auth.memberRole, "item:unlink")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const deleted = await deleteItemRelation(relationId, auth.orgId);
    if (!deleted) {
      return Response.json({ error: "Relation not found" }, { status: 404 });
    }

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "item_unlinked",
      metadata: {
        relationId,
        fromItemId: deleted.fromItemId,
        toItemId: deleted.toItemId,
        relationType: deleted.relationType,
      },
    });

    return Response.json({ data: deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
