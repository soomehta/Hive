import { getChannelMessageById, toggleMessagePin } from "@/lib/db/queries/chat";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handlePinMessage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.messageId) {
    return { success: false, error: "messageId is required" };
  }

  const message = await getChannelMessageById(action.orgId, payload.messageId);
  if (!message) {
    return { success: false, error: "Message not found" };
  }

  const isPinned = payload.isPinned ?? !message.isPinned;
  const updated = await toggleMessagePin(action.orgId, payload.messageId, isPinned);

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "channel_message_edited",
    metadata: {
      messageId: payload.messageId,
      channelId: message.channelId,
      action: isPinned ? "pinned" : "unpinned",
      createdByPa: true,
    },
  });

  return { success: true, result: { messageId: payload.messageId, isPinned } };
}
