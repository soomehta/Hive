import { chatCompletion } from "./providers";
import type { AIRole } from "./providers";
import { parseAIResponseOrThrow } from "./parse-response";

// ─── Types ───────────────────────────────────────────────

export interface ContentDraftParams {
  /** The AI role to invoke (must be a valid AIRole, e.g. "email-drafter"). */
  callerId: AIRole;
  /** The system prompt that defines the drafting persona and output format. */
  systemPrompt: string;
  /** The intent / action the user wants the content to accomplish. */
  intent: string;
  /** Arbitrary key-value entities extracted from the user's request. */
  entities: Record<string, unknown>;
  /** Name of the user on whose behalf the content is being drafted. */
  userName: string;
}

// ─── Base drafter ────────────────────────────────────────

/**
 * Generic content-drafting function.
 *
 * Both email-drafter and message-drafter share the same structural pattern:
 *   1. Build a system + user message pair.
 *   2. Call the AI provider.
 *   3. Parse the JSON response.
 *
 * Specific drafters are thin wrappers that supply their own system prompt and
 * validate the shape of the returned JSON.
 */
export async function draftContent<T>(params: ContentDraftParams): Promise<T> {
  const userMessage = `## Intent
${params.intent}

## Details
${JSON.stringify(params.entities, null, 2)}

## Sender
${params.userName}`;

  const content = await chatCompletion(params.callerId, {
    messages: [
      { role: "system", content: params.systemPrompt },
      { role: "user", content: userMessage },
    ],
  });

  return parseAIResponseOrThrow<T>(content, params.callerId);
}
