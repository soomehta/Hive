import type { ChatProvider, EmbeddingProvider } from "./types";
import type { AIRole } from "./config";
import { getRoleConfig, resolveApiKey } from "./config";
import { OpenAIAdapter } from "./openai-adapter";
import { AnthropicAdapter } from "./anthropic-adapter";
import { createLogger } from "@/lib/logger";

const retryLog = createLogger("ai-retry");

const RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 529];
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      const status = (error as { status?: number })?.status;
      const isRetryable =
        status !== undefined && RETRYABLE_STATUS_CODES.includes(status);

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw error;
      }

      const jitter = Math.random() * 500;
      const delay = BASE_DELAY_MS * Math.pow(2, attempt) + jitter;
      retryLog.warn(
        { attempt: attempt + 1, status, delay: Math.round(delay), label },
        "Retrying AI provider call"
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export type { ChatProvider, EmbeddingProvider } from "./types";
export type {
  ChatCompletionParams,
  ChatCompletionResult,
  ChatMessage,
  EmbeddingParams,
  EmbeddingResult,
} from "./types";
export type { AIRole, AIRoleConfig } from "./config";
export { getRoleConfig } from "./config";

const providerCache = new Map<string, ChatProvider | EmbeddingProvider>();

function cacheKey(provider: string, apiKey: string, baseURL?: string): string {
  return `${provider}:${apiKey.slice(0, 8)}:${baseURL ?? "default"}`;
}

export function getChatProvider(role: AIRole): ChatProvider {
  const config = getRoleConfig(role);
  const apiKey = resolveApiKey(config);
  const key = cacheKey(config.provider, apiKey, config.baseURL);

  const cached = providerCache.get(key);
  if (cached) return cached as ChatProvider;

  let provider: ChatProvider;

  switch (config.provider) {
    case "openai":
      provider = new OpenAIAdapter(apiKey);
      break;
    case "anthropic":
      provider = new AnthropicAdapter(apiKey);
      break;
    case "openai-compatible":
      if (!config.baseURL) {
        throw new Error(
          `AI role "${role}" uses openai-compatible provider but no base URL is configured. ` +
            `Set AI_${role.replace("-", "_").toUpperCase()}_BASE_URL.`
        );
      }
      provider = new OpenAIAdapter(apiKey, config.baseURL);
      break;
    default:
      throw new Error(`Unknown provider type: ${config.provider}`);
  }

  providerCache.set(key, provider);
  return provider;
}

export function getEmbeddingProvider(role: AIRole): EmbeddingProvider {
  const config = getRoleConfig(role);
  const apiKey = resolveApiKey(config);
  const key = cacheKey(config.provider, apiKey, config.baseURL);

  const cached = providerCache.get(key);
  if (cached) return cached as EmbeddingProvider;

  if (config.provider === "anthropic") {
    throw new Error(
      `AI role "${role}" is configured to use Anthropic, which does not support embeddings.`
    );
  }

  const provider = new OpenAIAdapter(
    apiKey,
    config.provider === "openai-compatible" ? config.baseURL : undefined
  );

  providerCache.set(key, provider);
  return provider;
}

/**
 * Convenience: perform a chat completion for the given role and return the text content.
 */
export async function chatCompletion(
  role: AIRole,
  params: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
): Promise<string> {
  const config = getRoleConfig(role);
  const provider = getChatProvider(role);

  const result = await withRetry(
    () =>
      provider.chat({
        model: config.model,
        messages: params.messages,
        temperature: params.temperature ?? config.temperature,
        maxTokens: params.maxTokens ?? config.maxTokens,
        jsonMode: params.jsonMode,
      }),
    `chatCompletion:${role}`
  );

  return result.content;
}

/**
 * Convenience: perform a chat completion with retry and return the full result
 * (content + usage). Useful when you need token counts.
 */
export async function chatCompletionWithUsage(
  role: AIRole,
  params: {
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
    temperature?: number;
    maxTokens?: number;
    jsonMode?: boolean;
  }
) {
  const config = getRoleConfig(role);
  const provider = getChatProvider(role);

  return withRetry(
    () =>
      provider.chat({
        model: config.model,
        messages: params.messages,
        temperature: params.temperature ?? config.temperature,
        maxTokens: params.maxTokens ?? config.maxTokens,
        jsonMode: params.jsonMode,
      }),
    `chatCompletionWithUsage:${role}`
  );
}
