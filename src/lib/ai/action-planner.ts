import Anthropic from "@anthropic-ai/sdk";
import { getActionPlanningPrompt } from "./prompts/action-planning";

let _anthropic: Anthropic | null = null;
function getAnthropic() {
  if (!_anthropic) {
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return _anthropic;
}

interface PlanContext {
  userName: string;
  autonomyMode: string;
  verbosity: string;
  formality: string;
}

interface PlanResult {
  tier: string;
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

  const response = await getAnthropic().messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: `Intent: ${intent}\nEntities: ${JSON.stringify(entities, null, 2)}`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Empty response from action planner");
  }

  // Extract JSON from response (may be wrapped in markdown code block)
  let jsonStr = textBlock.text;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const result = JSON.parse(jsonStr) as PlanResult;

  if (!result.tier || !result.payload || !result.confirmationMessage) {
    throw new Error("Invalid action plan result");
  }

  return result;
}
