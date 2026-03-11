import { postChannelMessage, isChannelMember, getChannelById } from "@/lib/db/queries/chat";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handlePostChannelMessage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.channelId) {
    return { success: false, error: "channelId is required" };
  }
  if (!payload.content?.trim()) {
    return { success: false, error: "Message content is required" };
  }

  const channel = await getChannelById(action.orgId, payload.channelId);
  if (!channel) {
    return { success: false, error: "Channel not found" };
  }

  const isMember = await isChannelMember(action.orgId, payload.channelId, action.userId);
  if (!isMember) {
    return { success: false, error: "You are not a member of this channel" };
  }

  const message = await postChannelMessage({
    orgId: action.orgId,
    channelId: payload.channelId,
    authorId: action.userId,
    content: payload.content.trim(),
    contentJson: payload.contentJson ?? null,
  });

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "channel_message_posted",
    metadata: {
      channelId: payload.channelId,
      channelName: channel.name,
      messageId: message.id,
      createdByPa: true,
    },
  });

  return { success: true, result: { messageId: message.id } };
}
