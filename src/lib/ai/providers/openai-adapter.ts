import OpenAI from "openai";
import type {
  ChatProvider,
  EmbeddingProvider,
  ChatCompletionParams,
  ChatCompletionResult,
  EmbeddingParams,
  EmbeddingResult,
} from "./types";

export class OpenAIAdapter implements ChatProvider, EmbeddingProvider {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
    });
  }

  async chat(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const response = await this.client.chat.completions.create({
      model: params.model,
      messages: params.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      ...(params.temperature !== undefined
        ? { temperature: params.temperature }
        : {}),
      ...(params.maxTokens !== undefined
        ? { max_tokens: params.maxTokens }
        : {}),
      ...(params.jsonMode
        ? { response_format: { type: "json_object" as const } }
        : {}),
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI-compatible provider");
    }

    return {
      content,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  async embed(params: EmbeddingParams): Promise<EmbeddingResult> {
    const response = await this.client.embeddings.create({
      model: params.model,
      input: params.input,
      ...(params.dimensions !== undefined
        ? { dimensions: params.dimensions }
        : {}),
    });

    return {
      embeddings: response.data.map((d) => d.embedding),
    };
  }
}
