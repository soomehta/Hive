import Anthropic from "@anthropic-ai/sdk";
import type {
  ChatProvider,
  ChatCompletionParams,
  ChatCompletionResult,
} from "./types";

export class AnthropicAdapter implements ChatProvider {
  private client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async chat(params: ChatCompletionParams): Promise<ChatCompletionResult> {
    const systemMessages = params.messages.filter((m) => m.role === "system");
    const nonSystemMessages = params.messages.filter(
      (m) => m.role !== "system"
    );

    if (nonSystemMessages.length === 0) {
      throw new Error(
        "Anthropic requires at least one user or assistant message"
      );
    }

    const response = await this.client.messages.create({
      model: params.model,
      max_tokens: params.maxTokens ?? 1024,
      ...(systemMessages.length > 0
        ? { system: systemMessages.map((m) => m.content).join("\n\n") }
        : {}),
      ...(params.temperature !== undefined
        ? { temperature: params.temperature }
        : {}),
      messages: nonSystemMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Empty response from Anthropic");
    }

    return {
      content: textBlock.text,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens:
          response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }
}
