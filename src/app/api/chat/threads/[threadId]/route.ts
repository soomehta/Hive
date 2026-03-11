import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  getChannelById,
  getThreadById,
  isChannelMember,
  listThreadMessages,
} from "@/lib/db/queries/chat";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ threadId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { threadId } = await params;
    const thread = await getThreadById(auth.orgId, threadId);
    if (!thread) {
      return Response.json({ error: "Thread not found" }, { status: 404 });
    }

    const channel = await getChannelById(auth.orgId, thread.channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const isMember = await isChannelMember(auth.orgId, channel.id, auth.userId);
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    if (!isMember && !isAdminLike) {
      return Response.json({ error: "Join this channel first" }, { status: 403 });
    }

    const messages = await listThreadMessages(auth.orgId, thread.id);
    return Response.json({ data: { thread, messages } });
  } catch (error) {
    return errorResponse(error);
  }
}
