import * as slack from "@/lib/integrations/slack";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleSendSlack(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.text) {
    return { success: false, error: "Slack message requires text" };
  }

  try {
    const result = await slack.sendMessage(action.userId, action.orgId, {
      channel: payload.channel,
      userId: payload.userId,
      text: payload.text,
    });

    return { success: true, result: { ts: result.ts, channel: result.channel } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to send Slack message" };
  }
}
