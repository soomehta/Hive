import { chatCompletion } from "./providers";
import { getMessageDraftingPrompt } from "./prompts/drafting";

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
  const systemPrompt = getMessageDraftingPrompt(params.context);

  const userMessage = `## Intent
${params.intent}

## Details
${JSON.stringify(params.entities, null, 2)}

## Sender
${params.context.userName}`;

  const content = await chatCompletion("msg-drafter", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  // Parse JSON response
  let jsonStr = content;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result = JSON.parse(jsonStr) as MessageDraftResult;

  if (!result.content) {
    throw new Error("Invalid message draft result: missing content");
  }

  return result;
}
