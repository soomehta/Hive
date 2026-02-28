import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { updateMessageSchema } from "@/lib/utils/validation";
import {
  getMessage,
  updateMessage,
  deleteMessage,
} from "@/lib/db/queries/messages";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const message = await getMessage(messageId);

    if (!message || message.orgId !== auth.orgId) {
      return Response.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    return Response.json({ data: message });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const existing = await getMessage(messageId);

    if (!existing || existing.orgId !== auth.orgId) {
      return Response.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Only message author or admin/owner can edit
    const isAuthor = existing.userId === auth.userId;
    const isAdminOrOwner =
      auth.memberRole === "admin" || auth.memberRole === "owner";

    if (!isAuthor && !isAdminOrOwner) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateMessageSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateMessage(messageId, parsed.data);

    if (!updated) {
      return Response.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    await logActivity({
      orgId: auth.orgId,
      projectId: existing.projectId,
      userId: auth.userId,
      type: "message_posted",
      metadata: { action: "updated", messageTitle: existing.title },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const existing = await getMessage(messageId);

    if (!existing || existing.orgId !== auth.orgId) {
      return Response.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    // Only message author or admin/owner can delete
    const isAuthor = existing.userId === auth.userId;
    const isAdminOrOwner =
      auth.memberRole === "admin" || auth.memberRole === "owner";

    if (!isAuthor && !isAdminOrOwner) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const deleted = await deleteMessage(messageId);

    if (!deleted) {
      return Response.json(
        { error: "Message not found" },
        { status: 404 }
      );
    }

    await logActivity({
      orgId: auth.orgId,
      projectId: existing.projectId,
      userId: auth.userId,
      type: "message_posted",
      metadata: { action: "deleted", messageTitle: existing.title },
    });

    return Response.json({ data: { id: deleted.id } });
  } catch (error) {
    return errorResponse(error);
  }
}
