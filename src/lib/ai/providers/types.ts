export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionParams {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  /** When true, request JSON output format from the provider. */
  jsonMode?: boolean;
}

export interface ChatCompletionResult {
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface EmbeddingParams {
  model: string;
  input: string | string[];
  dimensions?: number;
}

export interface EmbeddingResult {
  embeddings: number[][];
}

export interface ChatProvider {
  chat(params: ChatCompletionParams): Promise<ChatCompletionResult>;
}

export interface EmbeddingProvider {
  embed(params: EmbeddingParams): Promise<EmbeddingResult>;
}

export type ProviderType = "openai" | "anthropic" | "openai-compatible";
