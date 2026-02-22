import { chatCompletion } from "./providers";
import { getActionPlanningPrompt } from "./prompts/action-planning";

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

  const content = await chatCompletion("planner", {
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Intent: ${intent}\nEntities: ${JSON.stringify(entities, null, 2)}`,
      },
    ],
  });

  // Extract JSON from response (may be wrapped in markdown code block)
  let jsonStr = content;
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
