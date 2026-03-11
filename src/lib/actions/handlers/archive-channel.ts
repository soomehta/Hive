import { getChannelById, getChannels, updateChannel } from "@/lib/db/queries/chat";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleArchiveChannel(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  let channelId = payload.channelId;

  // Resolve by name if no ID provided
  if (!channelId && payload.channelName) {
    const channels = await getChannels(action.orgId);
    const match = channels.find(
      (c) => c.name.toLowerCase() === payload.channelName.toLowerCase()
    );
    if (match) channelId = match.id;
  }

  if (!channelId) {
    return { success: false, error: "channelId or channelName is required" };
  }

  const channel = await getChannelById(action.orgId, channelId);
  if (!channel) {
    return { success: false, error: "Channel not found" };
  }

  await updateChannel(action.orgId, channelId, { isArchived: true });

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "channel_updated",
    metadata: {
      channelId,
      channelName: channel.name,
      action: "archived",
      createdByPa: true,
    },
  });

  return { success: true, result: { channelId, channelName: channel.name } };
}
