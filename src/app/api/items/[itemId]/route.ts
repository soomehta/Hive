import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getItemById, updateItem, deleteItem } from "@/lib/db/queries/items";
import { updateItemSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { itemId } = await params;

    const item = await getItemById(itemId, auth.orgId);
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    return Response.json({ data: item });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { itemId } = await params;
    const item = await getItemById(itemId, auth.orgId);

    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateItemSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const canEditPage =
      item.type === "page" && hasPermission(auth.memberRole, "page:edit");
    const isOwner = item.ownerId === auth.userId;
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";

    if (!isOwner && !isAdminLike && !canEditPage) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const updated = await updateItem(itemId, auth.orgId, parsed.data);

    await logActivity({
      orgId: auth.orgId,
      projectId: updated.projectId,
      userId: auth.userId,
      type: "item_updated",
      metadata: { itemId, itemType: updated.type, changes: Object.keys(parsed.data) },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { itemId } = await params;
    const item = await getItemById(itemId, auth.orgId);

    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const canDeletePage =
      item.type === "page" && hasPermission(auth.memberRole, "page:delete");
    const isOwner = item.ownerId === auth.userId;
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";

    if (!isOwner && !isAdminLike && !canDeletePage) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const deleted = await deleteItem(itemId, auth.orgId);

    await logActivity({
      orgId: auth.orgId,
      projectId: deleted.projectId,
      userId: auth.userId,
      type: "item_deleted",
      metadata: { itemId, itemType: deleted.type, title: deleted.title },
    });

    return Response.json({ data: deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
