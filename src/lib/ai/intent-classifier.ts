import { chatCompletion } from "./providers";
import { getIntentClassificationPrompt } from "./prompts/intent-classification";
import { parseAIResponseOrThrow } from "./parse-response";

interface ClassificationContext {
  userName: string;
  projects: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string }>;
  recentTasks: Array<{ id: string; title: string; status: string }>;
}

interface ClassificationResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

export async function classifyIntent(
  text: string,
  context: ClassificationContext
): Promise<ClassificationResult> {
  const systemPrompt = getIntentClassificationPrompt(context);

  const content = await chatCompletion("classifier", {
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    jsonMode: true,
  });

  const result = parseAIResponseOrThrow<ClassificationResult>(content, "intent classification");

  // Validate required fields
  if (!result.intent || result.confidence === undefined) {
    throw new Error("Invalid classification result");
  }

  return result;
}
