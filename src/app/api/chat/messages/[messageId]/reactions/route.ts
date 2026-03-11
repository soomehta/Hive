import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  getChannelMessageById,
  isChannelMember,
  addReaction,
  removeReaction,
  getReactionsForMessages,
} from "@/lib/db/queries/chat";
import { errorResponse } from "@/lib/utils/errors";
import { broadcastToOrg } from "@/lib/notifications/sse";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

/**
 * POST /api/chat/messages/[messageId]/reactions — Toggle a reaction.
 * Body: { emoji: string }
 * If the user already reacted with this emoji, removes it; otherwise adds it.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const message = await getChannelMessageById(auth.orgId, messageId);
    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const isMember = await isChannelMember(auth.orgId, message.channelId, auth.userId);
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    if (!isMember && !isAdminLike) {
      return Response.json({ error: "Not a channel member" }, { status: 403 });
    }

    const body = await req.json();
    const emoji = body.emoji?.trim();
    if (!emoji || emoji.length > 32) {
      return Response.json({ error: "Invalid emoji" }, { status: 400 });
    }

    // Toggle: try to add, if already exists (returns null from onConflictDoNothing), remove
    const added = await addReaction(auth.orgId, messageId, auth.userId, emoji);
    if (!added) {
      await removeReaction(auth.orgId, messageId, auth.userId, emoji);
    }

    broadcastToOrg(auth.orgId, "chat:reaction_updated", {
      channelId: message.channelId,
      messageId,
    }).catch(() => {});

    return Response.json({ data: { toggled: !!added, emoji } });
  } catch (error) {
    return errorResponse(error);
  }
}

/**
 * GET /api/chat/messages/[messageId]/reactions — Get reactions for a message.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const reactions = await getReactionsForMessages(auth.orgId, [messageId]);
    const messageReactions = (reactions[messageId] ?? []).map((r) => ({
      emoji: r.emoji,
      count: r.count,
      hasReacted: r.userIds.includes(auth.userId),
    }));

    return Response.json({ data: messageReactions });
  } catch (error) {
    return errorResponse(error);
  }
}
