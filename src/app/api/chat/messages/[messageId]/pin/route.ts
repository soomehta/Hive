import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasChannelPermission } from "@/lib/auth/permissions";
import { getChannelMessageById, toggleMessagePin, getChannelMembers } from "@/lib/db/queries/chat";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";
import { broadcastToOrg } from "@/lib/notifications/sse";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

/**
 * POST /api/chat/messages/[messageId]/pin — Toggle pin on a message.
 * Requires chat:message:moderate permission (org admin or channel moderator).
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;

    const message = await getChannelMessageById(auth.orgId, messageId);
    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    // Check moderator permissions
    const channelMembers = await getChannelMembers(auth.orgId, message.channelId);
    const userMember = channelMembers.find((m) => m.userId === auth.userId);
    const channelRole = (userMember?.role ?? null) as "owner" | "moderator" | "member" | null;
    const canModerate = hasChannelPermission(
      auth.memberRole,
      channelRole,
      "chat:message_moderate"
    );
    if (!canModerate) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const newPinned = !message.isPinned;
    const updated = await toggleMessagePin(auth.orgId, messageId, newPinned);

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "channel_message_edited",
      metadata: { messageId, channelId: message.channelId, action: newPinned ? "pinned" : "unpinned" },
    });

    broadcastToOrg(auth.orgId, "chat:message_pinned", {
      channelId: message.channelId,
      messageId,
      isPinned: newPinned,
    }).catch(() => {});

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
