import Anthropic from "@anthropic-ai/sdk";
import { getMessageDraftingPrompt } from "./prompts/drafting";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

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

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 512,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Empty response from message drafter");
  }

  // Parse JSON response
  let jsonStr = textBlock.text;
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
