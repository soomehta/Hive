import type { ProviderType } from "./types";

export interface AIRoleConfig {
  provider: ProviderType;
  model: string;
  apiKey?: string;
  baseURL?: string;
  temperature?: number;
  maxTokens?: number;
}

export type AIRole =
  | "classifier"
  | "planner"
  | "reporter"
  | "briefer"
  | "email-drafter"
  | "msg-drafter"
  | "embedding"
  | "dispatcher"
  | "bee-runner";

const DEFAULTS: Record<AIRole, AIRoleConfig> = {
  classifier: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxTokens: 1024,
  },
  planner: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 1024,
  },
  reporter: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
  },
  briefer: {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 1024,
  },
  "email-drafter": {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 1024,
  },
  "msg-drafter": {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 512,
  },
  embedding: {
    provider: "openai",
    model: "text-embedding-3-small",
  },
  dispatcher: {
    provider: "openai",
    model: "gpt-4o-mini",
    temperature: 0.1,
    maxTokens: 1024,
  },
  "bee-runner": {
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    maxTokens: 2048,
  },
};

/**
 * Resolve the configuration for a given AI role.
 *
 * Env var convention (all optional, falls back to DEFAULTS):
 *   AI_<ROLE>_PROVIDER, AI_<ROLE>_MODEL, AI_<ROLE>_BASE_URL,
 *   AI_<ROLE>_API_KEY, AI_<ROLE>_TEMPERATURE, AI_<ROLE>_MAX_TOKENS
 */
export function getRoleConfig(role: AIRole): AIRoleConfig {
  const envPrefix = `AI_${role.replace("-", "_").toUpperCase()}`;
  const defaults = DEFAULTS[role];

  return {
    provider:
      (process.env[`${envPrefix}_PROVIDER`] as ProviderType | undefined) ??
      defaults.provider,
    model: process.env[`${envPrefix}_MODEL`] ?? defaults.model,
    apiKey: process.env[`${envPrefix}_API_KEY`],
    baseURL: process.env[`${envPrefix}_BASE_URL`],
    temperature:
      process.env[`${envPrefix}_TEMPERATURE`] !== undefined
        ? parseFloat(process.env[`${envPrefix}_TEMPERATURE`]!)
        : defaults.temperature,
    maxTokens:
      process.env[`${envPrefix}_MAX_TOKENS`] !== undefined
        ? parseInt(process.env[`${envPrefix}_MAX_TOKENS`]!, 10)
        : defaults.maxTokens,
  };
}

/**
 * Resolve the API key for a role config.
 * Priority: role-specific key > provider default env var.
 */
export function resolveApiKey(config: AIRoleConfig): string {
  if (config.apiKey) return config.apiKey;

  switch (config.provider) {
    case "openai":
    case "openai-compatible": {
      const key = process.env.OPENAI_API_KEY;
      if (!key) throw new Error("OPENAI_API_KEY environment variable is not set");
      return key;
    }
    case "anthropic": {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) throw new Error("ANTHROPIC_API_KEY environment variable is not set");
      return key;
    }
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
