import { getChannels, searchChannelMessages } from "@/lib/db/queries/chat";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleSearchMessages(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.query) {
    return { success: false, error: "Search query is required" };
  }

  let channelIds: string[] = [];

  if (payload.channelId) {
    channelIds = [payload.channelId];
  } else if (payload.channelName) {
    const channels = await getChannels(action.orgId);
    const match = channels.find(
      (c) => c.name.toLowerCase() === payload.channelName.toLowerCase()
    );
    if (match) channelIds = [match.id];
  }

  // If no specific channel, search all org channels
  if (channelIds.length === 0) {
    const channels = await getChannels(action.orgId);
    channelIds = channels.map((c) => c.id);
  }

  const messages = await searchChannelMessages(action.orgId, channelIds, payload.query, 20);

  return {
    success: true,
    result: {
      query: payload.query,
      matchCount: messages.length,
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content.slice(0, 200),
        channelId: m.channelId,
        authorId: m.authorId,
        createdAt: m.createdAt,
      })),
    },
  };
}
