import { chatCompletion } from "./providers";
import { getIntentClassificationPrompt } from "./prompts/intent-classification";
import { parseAIResponseOrThrow } from "./parse-response";

interface ClassificationContext {
  userName: string;
  projects: Array<{ id: string; name: string }>;
  teamMembers: Array<{ id: string; name: string }>;
  recentTasks: Array<{ id: string; title: string; status: string }>;
  conversationHistory?: Array<{ role: string; content: string }>;
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

  // Include last 4 conversation messages for multi-turn context
  const historyMessages = (context.conversationHistory ?? [])
    .slice(-4)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const content = await chatCompletion("classifier", {
    messages: [
      { role: "system", content: systemPrompt },
      ...historyMessages,
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
