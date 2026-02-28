import { getMessageDraftingPrompt } from "./prompts/drafting";
import { draftContent } from "./content-drafter";

export interface MessageDraftParams {
  intent: string;
  entities: Record<string, any>;
  context: {
    userName: string;
    formality: string;
  };
}

export interface MessageDraftResult {
  content: string;
}

export async function draftMessage(
  params: MessageDraftParams
): Promise<MessageDraftResult> {
  const result = await draftContent<MessageDraftResult>({
    callerId: "msg-drafter",
    systemPrompt: getMessageDraftingPrompt(params.context),
    intent: params.intent,
    entities: params.entities,
    userName: params.context.userName,
  });

  if (!result.content) {
    throw new Error("Invalid message draft result: missing content");
  }

  return result;
}
