import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasChannelPermission } from "@/lib/auth/permissions";
import {
  getChannelMessageById,
  updateChannelMessage,
  softDeleteChannelMessage,
  isChannelMember,
  getChannelMembers,
} from "@/lib/db/queries/chat";
import { updateChatMessageSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";
import { broadcastToOrg } from "@/lib/notifications/sse";
import { sanitizePlainText, sanitizeContentJson } from "@/lib/utils/sanitize";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const message = await getChannelMessageById(auth.orgId, messageId);
    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const isAuthor = message.authorId === auth.userId;
    // Get user's channel role for moderator check
    const members = await getChannelMembers(auth.orgId, message.channelId);
    const channelMember = members.find((m: any) => m.userId === auth.userId);
    const channelRole = channelMember?.role ?? null;
    const canModerate = hasChannelPermission(auth.memberRole, channelRole, "chat:message_moderate");

    if (!isAuthor && !canModerate) {
      return Response.json({ error: "Can only edit your own messages" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = updateChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateChannelMessage(auth.orgId, messageId, {
      content: sanitizePlainText(parsed.data.content),
      contentJson: parsed.data.contentJson ? sanitizeContentJson(parsed.data.contentJson) : undefined,
    });

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "channel_message_edited",
      metadata: { messageId, channelId: message.channelId },
    });

    broadcastToOrg(auth.orgId, "chat:message_edited", {
      channelId: message.channelId,
      messageId,
    }).catch(() => {});

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const message = await getChannelMessageById(auth.orgId, messageId);
    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const isAuthor = message.authorId === auth.userId;
    const delMembers = await getChannelMembers(auth.orgId, message.channelId);
    const delChannelMember = delMembers.find((m: any) => m.userId === auth.userId);
    const delChannelRole = delChannelMember?.role ?? null;
    const canModerate = hasChannelPermission(auth.memberRole, delChannelRole, "chat:message_moderate");

    if (!isAuthor && !canModerate) {
      return Response.json({ error: "Can only delete your own messages" }, { status: 403 });
    }

    const deleted = await softDeleteChannelMessage(auth.orgId, messageId);

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "channel_message_deleted",
      metadata: { messageId, channelId: message.channelId },
    });

    broadcastToOrg(auth.orgId, "chat:message_deleted", {
      channelId: message.channelId,
      messageId,
    }).catch(() => {});

    return Response.json({ data: deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
