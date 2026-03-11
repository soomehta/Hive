import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  createThread,
  getChannelById,
  getChannelMessageById,
  isChannelMember,
} from "@/lib/db/queries/chat";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ messageId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { messageId } = await params;
    const message = await getChannelMessageById(auth.orgId, messageId);
    if (!message) {
      return Response.json({ error: "Message not found" }, { status: 404 });
    }

    const channel = await getChannelById(auth.orgId, message.channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const isMember = await isChannelMember(auth.orgId, channel.id, auth.userId);
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    if (!isMember && !isAdminLike) {
      return Response.json({ error: "Join this channel first" }, { status: 403 });
    }

    const thread = await createThread(auth.orgId, channel.id, message.id);
    return Response.json({ data: thread }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
