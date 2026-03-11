import { chatCompletion } from "./providers";
import { getActionPlanningPrompt } from "./prompts/action-planning";
import { parseAIResponseOrThrow } from "./parse-response";

interface PlanContext {
  userName: string;
  autonomyMode: string;
  verbosity: string;
  formality: string;
  personalityTraits?: string;
  ragContext?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  /** Available chat channels for channel-related intents */
  channels?: Array<{ id: string; name: string; scope: string }>;
  /** Recent pages for page-related intents */
  pages?: Array<{ itemId: string; title: string }>;
}

interface PlanResult {
  tier?: string;
  payload: Record<string, any>;
  confirmationMessage: string;
  draftPreview?: string;
}

export async function planAction(
  intent: string,
  entities: Record<string, any>,
  context: PlanContext
): Promise<PlanResult> {
  const systemPrompt = getActionPlanningPrompt(context);

  // Include last 4 conversation messages for multi-turn context
  const historyMessages = (context.conversationHistory ?? [])
    .slice(-4)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const content = await chatCompletion("planner", {
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      {
        role: "user",
        content: `Intent: ${intent}\nEntities: ${JSON.stringify(entities, null, 2)}`,
      },
    ],
  });

  const result = parseAIResponseOrThrow<PlanResult>(content, "action planning");

  if (!result.payload || !result.confirmationMessage) {
    throw new Error("Invalid action plan result");
  }

  return result;
}
