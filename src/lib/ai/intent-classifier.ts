import OpenAI from "openai";
import { getIntentClassificationPrompt } from "./prompts/intent-classification";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return _openai;
}

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

  const response = await getOpenAI().chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    temperature: 0.1,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("Empty response from intent classifier");
  }

  const result = JSON.parse(content) as ClassificationResult;

  // Validate required fields
  if (!result.intent || result.confidence === undefined) {
    throw new Error("Invalid classification result");
  }

  return result;
}
