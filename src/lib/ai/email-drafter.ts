import { getEmailDraftingPrompt } from "./prompts/drafting";
import { draftContent } from "./content-drafter";

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
  const result = await draftContent<EmailDraftResult>({
    callerId: "email-drafter",
    systemPrompt: getEmailDraftingPrompt(params.context),
    intent: params.intent,
    entities: params.entities,
    userName: params.context.userName,
  });

  if (!result.subject || !result.body) {
    throw new Error("Invalid email draft result: missing subject or body");
  }

  return result;
}
