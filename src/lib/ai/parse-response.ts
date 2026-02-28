import { createLogger } from "@/lib/logger";

const log = createLogger("ai-parse");

/**
 * Safely parse an AI response that may contain JSON wrapped in markdown code blocks.
 * Falls back to the provided default if parsing fails.
 */
export function safeParseAIResponse<T>(
  content: string,
  fallback: T
): T {
  try {
    let jsonStr = content;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    log.warn(
      { err, contentLength: content.length, preview: content.slice(0, 200) },
      "Failed to parse AI response as JSON, using fallback"
    );
    return fallback;
  }
}

/**
 * Parse AI response, throwing a descriptive error on failure instead of using a fallback.
 */
export function parseAIResponseOrThrow<T>(
  content: string,
  context: string
): T {
  let jsonStr = content;
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  try {
    return JSON.parse(jsonStr) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse AI response for ${context}: ${err instanceof Error ? err.message : "unknown error"}. ` +
        `Response preview: ${content.slice(0, 200)}`
    );
  }
}
