import Anthropic from "@anthropic-ai/sdk";
import { getEmailDraftingPrompt } from "./prompts/drafting";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

export interface EmailDraftParams {
  intent: string;
  entities: Record<string, any>;
  context: {
    userName: string;
    formality: string;
  };
}

export interface EmailDraftResult {
  subject: string;
  body: string;
}

export async function draftEmail(
  params: EmailDraftParams
): Promise<EmailDraftResult> {
  const systemPrompt = getEmailDraftingPrompt(params.context);

  const userMessage = `## Intent
${params.intent}

## Details
${JSON.stringify(params.entities, null, 2)}

## Sender
${params.context.userName}`;

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
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
    throw new Error("Empty response from email drafter");
  }

  // Parse JSON response
  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result = JSON.parse(jsonStr) as EmailDraftResult;

  if (!result.subject || !result.body) {
    throw new Error("Invalid email draft result: missing subject or body");
  }

  return result;
}
