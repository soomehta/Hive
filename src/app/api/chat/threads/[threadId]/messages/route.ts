import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getChannelById,
  getThreadById,
  isChannelMember,
  postThreadMessage,
} from "@/lib/db/queries/chat";
import { createThreadMessageSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { sanitizePlainText } from "@/lib/utils/sanitize";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { broadcastToOrg } from "@/lib/notifications/sse";

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`thread:reply:${auth.userId}`, 30, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const { threadId } = await params;
    const thread = await getThreadById(auth.orgId, threadId);
    if (!thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    const channel = await getChannelById(auth.orgId, thread.channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!hasPermission(auth.memberRole, "chat:message_post")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const isMember = await isChannelMember(auth.orgId, channel.id, auth.userId);
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    if (!isMember && !isAdminLike) {
      return Response.json({ error: "Join this channel first" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createThreadMessageSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const message = await postThreadMessage({
      orgId: auth.orgId,
      threadId,
      authorId: auth.userId,
      content: sanitizePlainText(parsed.data.content),
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: channel.projectId,
      userId: auth.userId,
      type: "channel_message_posted",
      metadata: { threadId, messageId: message.id, channelId: channel.id },
    });

    broadcastToOrg(auth.orgId, "chat:thread_reply", {
      channelId: channel.id,
      threadId,
      messageId: message.id,
    }).catch(() => {});

    return Response.json({ data: message }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
