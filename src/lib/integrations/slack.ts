import { WebClient } from "@slack/web-api";
import { getActiveIntegration } from "./oauth";

export async function sendMessage(
  userId: string,
  orgId: string,
  params: { channel?: string; userId?: string; text: string }
): Promise<{ ts: string; channel: string }> {
  const integration = await getActiveIntegration(userId, orgId, "slack");
  if (!integration) throw new Error("Slack integration not connected");

  const slack = new WebClient(integration.decryptedAccessToken);

  let channelId = params.channel;

  // If sending a DM to a user, open a conversation first
  if (params.userId && !channelId) {
    const conv = await slack.conversations.open({ users: params.userId });
    channelId = conv.channel?.id;
  }

  if (!channelId) {
    throw new Error("Either channel or userId must be provided");
  }

  const res = await slack.chat.postMessage({
    channel: channelId,
    text: params.text,
  });

  return {
    ts: res.ts ?? "",
    channel: res.channel ?? channelId,
  };
}
