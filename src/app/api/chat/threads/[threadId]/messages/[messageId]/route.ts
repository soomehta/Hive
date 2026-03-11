import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  getThreadById,
  getChannelById,
  isChannelMember,
  getThreadMessageById,
  updateThreadMessage,
  deleteThreadMessage,
} from "@/lib/db/queries/chat";
import { logActivity } from "@/lib/db/queries/activity";
import { sanitizePlainText } from "@/lib/utils/sanitize";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ threadId: string; messageId: string }>;
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { threadId, messageId } = await params;

    const thread = await getThreadById(auth.orgId, threadId);
    if (!thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    const message = await getThreadMessageById(auth.orgId, messageId);
    if (!message || message.threadId !== threadId) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    if (message.authorId !== auth.userId) {
      return Response.json({ error: "Can only edit your own messages" }, { status: 403 });
    }

    const body = await req.json();
    const content = (body.content as string)?.trim();
    if (!content) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }

    const updated = await updateThreadMessage(auth.orgId, messageId, { content: sanitizePlainText(content) });

    const channel = await getChannelById(auth.orgId, thread.channelId);
    await logActivity({
      orgId: auth.orgId,
      projectId: channel?.projectId,
      userId: auth.userId,
      type: "channel_message_edited",
      metadata: { threadId, messageId, channelId: thread.channelId },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { threadId, messageId } = await params;

    const thread = await getThreadById(auth.orgId, threadId);
    if (!thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    const message = await getThreadMessageById(auth.orgId, messageId);
    if (!message || message.threadId !== threadId) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const isOwner = message.authorId === auth.userId;
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    if (!isOwner && !isAdminLike) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const deleted = await deleteThreadMessage(auth.orgId, messageId);

    const channel = await getChannelById(auth.orgId, thread.channelId);
    await logActivity({
      orgId: auth.orgId,
      projectId: channel?.projectId,
      userId: auth.userId,
      type: "channel_message_deleted",
      metadata: { threadId, messageId, channelId: thread.channelId },
    });

    return Response.json({ data: deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
