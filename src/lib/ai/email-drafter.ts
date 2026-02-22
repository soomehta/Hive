import { chatCompletion } from "./providers";
import { getEmailDraftingPrompt } from "./prompts/drafting";

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

  const content = await chatCompletion("email-drafter", {
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

  const result = JSON.parse(jsonStr) as EmailDraftResult;

  if (!result.subject || !result.body) {
    throw new Error("Invalid email draft result: missing subject or body");
  }

  return result;
}
