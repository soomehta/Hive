/**
 * ai-providers.test.ts
 *
 * Comprehensive tests for:
 *   - OpenAIAdapter  (src/lib/ai/providers/openai-adapter.ts)
 *   - AnthropicAdapter (src/lib/ai/providers/anthropic-adapter.ts)
 *   - Intent classifier (src/lib/ai/intent-classifier.ts)
 *   - Provider factory  (src/lib/ai/providers/index.ts)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// SDK mocks — must be declared BEFORE any module imports so that vi.mock
// hoisting can replace the real modules throughout the entire test file.
// ---------------------------------------------------------------------------

const mockOpenAICreate = vi.fn();
const mockOpenAIEmbeddingsCreate = vi.fn();

vi.mock("openai", () => {
  // Use a named function so `new OpenAI(...)` works correctly as a constructor.
  const OpenAIMock = function (this: any) {
    this.chat = { completions: { create: mockOpenAICreate } };
    this.embeddings = { create: mockOpenAIEmbeddingsCreate };
  };
  return { default: OpenAIMock };
});

const mockAnthropicCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => {
  // Use a named function so `new Anthropic(...)` works correctly as a constructor.
  const AnthropicMock = function (this: any) {
    this.messages = { create: mockAnthropicCreate };
  };
  return { default: AnthropicMock };
});

// Mock logger so adapter/provider imports do not crash in Node test env.
vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Now import the modules under test.  The SDK constructors above will be the
// mocked versions thanks to vi.mock hoisting.
// ---------------------------------------------------------------------------

import { OpenAIAdapter } from "@/lib/ai/providers/openai-adapter";
import { AnthropicAdapter } from "@/lib/ai/providers/anthropic-adapter";

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const OPENAI_CHAT_RESPONSE = {
  choices: [{ message: { content: "Hello from OpenAI" } }],
  usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
};

const OPENAI_EMBED_RESPONSE = {
  data: [{ embedding: [0.1, 0.2, 0.3] }, { embedding: [0.4, 0.5, 0.6] }],
};

const ANTHROPIC_CHAT_RESPONSE = {
  content: [{ type: "text", text: "Hello from Anthropic" }],
  usage: { input_tokens: 10, output_tokens: 5 },
};

// ---------------------------------------------------------------------------
// ============ 1. OpenAIAdapter ============
// ---------------------------------------------------------------------------

describe("OpenAIAdapter", () => {
  let adapter: OpenAIAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new OpenAIAdapter("test-openai-key");
  });

  // ── chat() ────────────────────────────────────────────────────────────────

  describe("chat()", () => {
    it("returns content from the API response", async () => {
      mockOpenAICreate.mockResolvedValue(OPENAI_CHAT_RESPONSE);

      const result = await adapter.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.content).toBe("Hello from OpenAI");
    });

    it("passes temperature and maxTokens to the underlying client", async () => {
      mockOpenAICreate.mockResolvedValue(OPENAI_CHAT_RESPONSE);

      await adapter.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
        temperature: 0.3,
        maxTokens: 512,
      });

      const callArg = mockOpenAICreate.mock.calls[0][0];
      expect(callArg.temperature).toBe(0.3);
      expect(callArg.max_tokens).toBe(512);
    });

    it("omits temperature and max_tokens when not provided", async () => {
      mockOpenAICreate.mockResolvedValue(OPENAI_CHAT_RESPONSE);

      await adapter.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
      });

      const callArg = mockOpenAICreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("temperature");
      expect(callArg).not.toHaveProperty("max_tokens");
    });

    it("sets response_format to json_object when jsonMode is true", async () => {
      mockOpenAICreate.mockResolvedValue(OPENAI_CHAT_RESPONSE);

      await adapter.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Return JSON" }],
        jsonMode: true,
      });

      const callArg = mockOpenAICreate.mock.calls[0][0];
      expect(callArg.response_format).toEqual({ type: "json_object" });
    });

    it("does not set response_format when jsonMode is false or absent", async () => {
      mockOpenAICreate.mockResolvedValue(OPENAI_CHAT_RESPONSE);

      await adapter.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Plain text" }],
        jsonMode: false,
      });

      const callArg = mockOpenAICreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("response_format");
    });

    it("includes usage metrics in the result", async () => {
      mockOpenAICreate.mockResolvedValue(OPENAI_CHAT_RESPONSE);

      const result = await adapter.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15,
      });
    });

    it("returns undefined usage when the response contains no usage data", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: "OK" } }],
        // no usage field
      });

      const result = await adapter.chat({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result.usage).toBeUndefined();
    });

    it("throws when the response content is empty/null", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
        usage: { prompt_tokens: 1, completion_tokens: 0, total_tokens: 1 },
      });

      await expect(
        adapter.chat({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow(/empty response/i);
    });

    it("throws when choices array is empty", async () => {
      mockOpenAICreate.mockResolvedValue({ choices: [] });

      await expect(
        adapter.chat({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow(/empty response/i);
    });

    it("maps multi-message conversations correctly", async () => {
      mockOpenAICreate.mockResolvedValue(OPENAI_CHAT_RESPONSE);

      const messages = [
        { role: "system" as const, content: "Be helpful" },
        { role: "user" as const, content: "What is 2+2?" },
        { role: "assistant" as const, content: "4" },
        { role: "user" as const, content: "Explain" },
      ];

      await adapter.chat({ model: "gpt-4o-mini", messages });

      const callArg = mockOpenAICreate.mock.calls[0][0];
      expect(callArg.messages).toHaveLength(4);
      expect(callArg.messages[0]).toEqual({ role: "system", content: "Be helpful" });
      expect(callArg.messages[3]).toEqual({ role: "user", content: "Explain" });
    });

    it("propagates API errors from the underlying client", async () => {
      mockOpenAICreate.mockRejectedValue(new Error("OpenAI API error"));

      await expect(
        adapter.chat({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow("OpenAI API error");
    });
  });

  // ── embed() ───────────────────────────────────────────────────────────────

  describe("embed()", () => {
    it("returns the embeddings array from the API response", async () => {
      mockOpenAIEmbeddingsCreate.mockResolvedValue(OPENAI_EMBED_RESPONSE);

      const result = await adapter.embed({
        model: "text-embedding-3-small",
        input: ["Hello", "World"],
      });

      expect(result.embeddings).toHaveLength(2);
      expect(result.embeddings[0]).toEqual([0.1, 0.2, 0.3]);
      expect(result.embeddings[1]).toEqual([0.4, 0.5, 0.6]);
    });

    it("passes the model and input to the underlying client", async () => {
      mockOpenAIEmbeddingsCreate.mockResolvedValue(OPENAI_EMBED_RESPONSE);

      await adapter.embed({
        model: "text-embedding-3-small",
        input: "Single sentence",
      });

      const callArg = mockOpenAIEmbeddingsCreate.mock.calls[0][0];
      expect(callArg.model).toBe("text-embedding-3-small");
      expect(callArg.input).toBe("Single sentence");
    });

    it("passes the dimensions parameter when provided", async () => {
      mockOpenAIEmbeddingsCreate.mockResolvedValue(OPENAI_EMBED_RESPONSE);

      await adapter.embed({
        model: "text-embedding-3-small",
        input: "text",
        dimensions: 256,
      });

      const callArg = mockOpenAIEmbeddingsCreate.mock.calls[0][0];
      expect(callArg.dimensions).toBe(256);
    });

    it("omits the dimensions key when dimensions is not specified", async () => {
      mockOpenAIEmbeddingsCreate.mockResolvedValue(OPENAI_EMBED_RESPONSE);

      await adapter.embed({
        model: "text-embedding-3-small",
        input: "text",
      });

      const callArg = mockOpenAIEmbeddingsCreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("dimensions");
    });

    it("handles a single-item embedding response", async () => {
      mockOpenAIEmbeddingsCreate.mockResolvedValue({
        data: [{ embedding: [1.0, 2.0] }],
      });

      const result = await adapter.embed({
        model: "text-embedding-3-small",
        input: "one sentence",
      });

      expect(result.embeddings).toHaveLength(1);
      expect(result.embeddings[0]).toEqual([1.0, 2.0]);
    });

    it("propagates API errors from the underlying client", async () => {
      mockOpenAIEmbeddingsCreate.mockRejectedValue(
        new Error("Embeddings API error")
      );

      await expect(
        adapter.embed({ model: "text-embedding-3-small", input: "text" })
      ).rejects.toThrow("Embeddings API error");
    });
  });
});

// ---------------------------------------------------------------------------
// ============ 2. AnthropicAdapter ============
// ---------------------------------------------------------------------------

describe("AnthropicAdapter", () => {
  let adapter: AnthropicAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new AnthropicAdapter("test-anthropic-key");
  });

  // ── chat() ────────────────────────────────────────────────────────────────

  describe("chat()", () => {
    it("returns the text content from the API response", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      const result = await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hello" }],
      });

      expect(result.content).toBe("Hello from Anthropic");
    });

    it("separates system messages from user/assistant messages", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Tell me a joke" },
        ],
      });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      // system extracted out of messages array
      expect(callArg.system).toBe("You are a helpful assistant.");
      expect(callArg.messages).toHaveLength(1);
      expect(callArg.messages[0]).toEqual({ role: "user", content: "Tell me a joke" });
    });

    it("concatenates multiple system messages with \\n\\n", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [
          { role: "system", content: "First system instruction." },
          { role: "system", content: "Second system instruction." },
          { role: "user", content: "Go" },
        ],
      });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      expect(callArg.system).toBe(
        "First system instruction.\n\nSecond system instruction."
      );
    });

    it("omits the system field when there are no system messages", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hello" }],
      });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("system");
    });

    it("defaults max_tokens to 1024 when maxTokens is not provided", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hi" }],
      });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      expect(callArg.max_tokens).toBe(1024);
    });

    it("passes an explicit maxTokens value to the API", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hi" }],
        maxTokens: 2048,
      });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      expect(callArg.max_tokens).toBe(2048);
    });

    it("passes temperature to the API when provided", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hi" }],
        temperature: 0.7,
      });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      expect(callArg.temperature).toBe(0.7);
    });

    it("omits temperature from the call when it is not specified", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hi" }],
      });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      expect(callArg).not.toHaveProperty("temperature");
    });

    it("throws when only system messages are provided (no user/assistant)", async () => {
      await expect(
        adapter.chat({
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "system", content: "System only" }],
        })
      ).rejects.toThrow(/user or assistant/i);
    });

    it("throws when the message list is empty", async () => {
      await expect(
        adapter.chat({
          model: "claude-sonnet-4-20250514",
          messages: [],
        })
      ).rejects.toThrow(/user or assistant/i);
    });

    it("correctly maps usage tokens from the Anthropic response format", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      const result = await adapter.chat({
        model: "claude-sonnet-4-20250514",
        messages: [{ role: "user", content: "Hi" }],
      });

      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 5,
        totalTokens: 15, // input + output
      });
    });

    it("throws when the API returns no text content block", async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [{ type: "tool_use", id: "tool-1", name: "calculator", input: {} }],
        usage: { input_tokens: 5, output_tokens: 0 },
      });

      await expect(
        adapter.chat({
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "user", content: "Use a tool" }],
        })
      ).rejects.toThrow(/empty response/i);
    });

    it("propagates API errors from the underlying client", async () => {
      mockAnthropicCreate.mockRejectedValue(new Error("Anthropic API error"));

      await expect(
        adapter.chat({
          model: "claude-sonnet-4-20250514",
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow("Anthropic API error");
    });

    it("handles a multi-turn conversation with mixed roles", async () => {
      mockAnthropicCreate.mockResolvedValue(ANTHROPIC_CHAT_RESPONSE);

      const messages = [
        { role: "system" as const, content: "Be concise" },
        { role: "user" as const, content: "Question 1" },
        { role: "assistant" as const, content: "Answer 1" },
        { role: "user" as const, content: "Question 2" },
      ];

      await adapter.chat({ model: "claude-sonnet-4-20250514", messages });

      const callArg = mockAnthropicCreate.mock.calls[0][0];
      expect(callArg.messages).toHaveLength(3);
      expect(callArg.messages[0].role).toBe("user");
      expect(callArg.messages[1].role).toBe("assistant");
      expect(callArg.messages[2].role).toBe("user");
      expect(callArg.system).toBe("Be concise");
    });
  });
});

// ---------------------------------------------------------------------------
// ============ 3. Intent Classifier ============
//
// classifyIntent calls chatCompletion("classifier", ...) from the providers
// module. Rather than re-mocking the whole providers module (which would
// conflict with the adapter tests above), we let the real providers module
// run — it creates an OpenAIAdapter under the hood — and we control the
// output through mockOpenAICreate just like the adapter tests above.
// ---------------------------------------------------------------------------

describe("Intent Classifier", () => {
  // Lazy-import so the module sees the mocked SDK.
  let classifyIntent: typeof import("@/lib/ai/intent-classifier").classifyIntent;

  const testContext = {
    userName: "Alice",
    projects: [{ id: "proj-1", name: "Alpha Project" }],
    teamMembers: [{ id: "user-2", name: "Bob" }],
    recentTasks: [{ id: "task-1", title: "Fix bug", status: "in_progress" }],
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset module registry so each test starts with a clean provider cache.
    vi.resetModules();

    // Re-set the env vars that the provider factory reads.
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";

    // Dynamically import after modules are reset so the provider cache is empty.
    const mod = await import("@/lib/ai/intent-classifier");
    classifyIntent = mod.classifyIntent;
  });

  afterEach(() => {
    vi.resetModules();
  });

  it("returns parsed intent and entities from a valid JSON response", async () => {
    const payload = {
      intent: "create_task",
      entities: { title: "New task", projectId: "proj-1" },
      confidence: 0.95,
    };

    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { prompt_tokens: 20, completion_tokens: 10, total_tokens: 30 },
    });

    const result = await classifyIntent("Create a new task in Alpha Project", testContext);

    expect(result.intent).toBe("create_task");
    expect(result.confidence).toBe(0.95);
    expect(result.entities).toEqual({ title: "New task", projectId: "proj-1" });
  });

  it("sends the request with jsonMode enabled", async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: "check_tasks",
              entities: {},
              confidence: 0.8,
            }),
          },
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    });

    await classifyIntent("Show my tasks", testContext);

    const callArg = mockOpenAICreate.mock.calls[0][0];
    expect(callArg.response_format).toEqual({ type: "json_object" });
  });

  it("includes a system message and a user message in the request", async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              intent: "check_calendar",
              entities: {},
              confidence: 0.9,
            }),
          },
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    });

    await classifyIntent("What is on my calendar today?", testContext);

    const callArg = mockOpenAICreate.mock.calls[0][0];
    const roles = callArg.messages.map((m: { role: string }) => m.role);
    expect(roles).toContain("system");
    expect(roles).toContain("user");

    const userMsg = callArg.messages.find(
      (m: { role: string; content: string }) => m.role === "user"
    );
    expect(userMsg?.content).toBe("What is on my calendar today?");
  });

  it("throws when the model returns invalid JSON", async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: "This is not JSON at all" } }],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    });

    await expect(
      classifyIntent("Create a task", testContext)
    ).rejects.toThrow();
  });

  it("throws when the JSON response is missing the intent field", async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ entities: {}, confidence: 0.5 }),
          },
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    });

    await expect(
      classifyIntent("Do something", testContext)
    ).rejects.toThrow(/invalid classification/i);
  });

  it("throws when the JSON response is missing the confidence field", async () => {
    mockOpenAICreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({ intent: "create_task", entities: {} }),
          },
        },
      ],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    });

    await expect(
      classifyIntent("Create a task", testContext)
    ).rejects.toThrow(/invalid classification/i);
  });

  it("handles a low-confidence classification without throwing", async () => {
    const payload = {
      intent: "generate_report",
      entities: { question: "Sprint summary" },
      confidence: 0.35,
    };

    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
    });

    const result = await classifyIntent("Some ambiguous request", testContext);

    expect(result.intent).toBe("generate_report");
    expect(result.confidence).toBe(0.35);
  });

  it("handles empty entities object in a valid response", async () => {
    const payload = { intent: "generate_briefing", entities: {}, confidence: 0.99 };

    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify(payload) } }],
      usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
    });

    const result = await classifyIntent("Morning briefing please", testContext);

    expect(result.intent).toBe("generate_briefing");
    expect(result.entities).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// ============ 4. Provider Factory ============
// ---------------------------------------------------------------------------

describe("Provider Factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    // Clear any role-specific overrides that might leak between tests.
    delete process.env.AI_CLASSIFIER_PROVIDER;
    delete process.env.AI_PLANNER_PROVIDER;
    delete process.env.AI_EMBEDDING_PROVIDER;
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ── getChatProvider ────────────────────────────────────────────────────────

  describe("getChatProvider()", () => {
    it("returns an OpenAIAdapter instance for the 'classifier' role", async () => {
      const { getChatProvider } = await import("@/lib/ai/providers");
      const provider = getChatProvider("classifier");

      // The instance is expected to be an OpenAIAdapter — it has a chat method.
      expect(provider).toBeDefined();
      expect(typeof provider.chat).toBe("function");
    });

    it("returns an AnthropicAdapter instance for the 'planner' role", async () => {
      const { getChatProvider } = await import("@/lib/ai/providers");
      const provider = getChatProvider("planner");

      expect(provider).toBeDefined();
      expect(typeof provider.chat).toBe("function");
    });

    it("returns an OpenAIAdapter instance for the 'dispatcher' role", async () => {
      const { getChatProvider } = await import("@/lib/ai/providers");
      const provider = getChatProvider("dispatcher");

      expect(provider).toBeDefined();
      expect(typeof provider.chat).toBe("function");
    });

    it("returns an AnthropicAdapter instance for the 'reporter' role", async () => {
      const { getChatProvider } = await import("@/lib/ai/providers");
      const provider = getChatProvider("reporter");

      expect(provider).toBeDefined();
      expect(typeof provider.chat).toBe("function");
    });

    it("caches providers — calling getChatProvider twice for the same role returns the same instance", async () => {
      const { getChatProvider } = await import("@/lib/ai/providers");
      const first = getChatProvider("classifier");
      const second = getChatProvider("classifier");

      expect(first).toBe(second);
    });

    it("caches providers per role — different roles return different instances", async () => {
      const { getChatProvider } = await import("@/lib/ai/providers");
      const classifierProvider = getChatProvider("classifier");
      const plannerProvider = getChatProvider("planner");

      expect(classifierProvider).not.toBe(plannerProvider);
    });

    it("throws when an openai-compatible role has no baseURL configured", async () => {
      process.env.AI_CLASSIFIER_PROVIDER = "openai-compatible";
      delete process.env.AI_CLASSIFIER_BASE_URL;

      const { getChatProvider } = await import("@/lib/ai/providers");

      expect(() => getChatProvider("classifier")).toThrow(/base URL/i);

      // Cleanup
      delete process.env.AI_CLASSIFIER_PROVIDER;
    });
  });

  // ── getEmbeddingProvider ───────────────────────────────────────────────────

  describe("getEmbeddingProvider()", () => {
    it("returns a provider with an embed method for the 'embedding' role", async () => {
      const { getEmbeddingProvider } = await import("@/lib/ai/providers");
      const provider = getEmbeddingProvider("embedding");

      expect(provider).toBeDefined();
      expect(typeof provider.embed).toBe("function");
    });

    it("throws when trying to get an embedding provider for an Anthropic-backed role", async () => {
      const { getEmbeddingProvider } = await import("@/lib/ai/providers");

      expect(() => getEmbeddingProvider("planner")).toThrow(/embeddings/i);
    });

    it("caches embedding providers — two calls return the same instance", async () => {
      const { getEmbeddingProvider } = await import("@/lib/ai/providers");
      const first = getEmbeddingProvider("embedding");
      const second = getEmbeddingProvider("embedding");

      expect(first).toBe(second);
    });
  });

  // ── getRoleConfig ──────────────────────────────────────────────────────────

  describe("getRoleConfig()", () => {
    it("returns the correct default config for the 'classifier' role", async () => {
      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("classifier");

      expect(config.provider).toBe("openai");
      expect(config.model).toBe("gpt-4o-mini");
      expect(config.temperature).toBe(0.1);
      expect(config.maxTokens).toBe(1024);
    });

    it("returns the correct default config for the 'planner' role", async () => {
      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("planner");

      expect(config.provider).toBe("anthropic");
      expect(config.model).toBe("claude-sonnet-4-20250514");
      expect(config.maxTokens).toBe(1024);
    });

    it("returns the correct default config for the 'reporter' role", async () => {
      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("reporter");

      expect(config.provider).toBe("anthropic");
      expect(config.maxTokens).toBe(2048);
    });

    it("returns the correct default config for the 'embedding' role", async () => {
      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("embedding");

      expect(config.provider).toBe("openai");
      expect(config.model).toBe("text-embedding-3-small");
    });

    it("allows provider to be overridden via env var", async () => {
      process.env.AI_CLASSIFIER_PROVIDER = "anthropic";

      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("classifier");

      expect(config.provider).toBe("anthropic");

      delete process.env.AI_CLASSIFIER_PROVIDER;
    });

    it("allows model to be overridden via env var", async () => {
      process.env.AI_CLASSIFIER_MODEL = "gpt-4o";

      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("classifier");

      expect(config.model).toBe("gpt-4o");

      delete process.env.AI_CLASSIFIER_MODEL;
    });

    it("allows temperature to be overridden via env var", async () => {
      process.env.AI_CLASSIFIER_TEMPERATURE = "0.9";

      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("classifier");

      expect(config.temperature).toBe(0.9);

      delete process.env.AI_CLASSIFIER_TEMPERATURE;
    });

    it("allows max_tokens to be overridden via env var", async () => {
      process.env.AI_CLASSIFIER_MAX_TOKENS = "512";

      const { getRoleConfig } = await import("@/lib/ai/providers");
      const config = getRoleConfig("classifier");

      expect(config.maxTokens).toBe(512);

      delete process.env.AI_CLASSIFIER_MAX_TOKENS;
    });
  });

  // ── chatCompletion ─────────────────────────────────────────────────────────

  describe("chatCompletion()", () => {
    it("returns the text content string from the provider response", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: "Task created." } }],
        usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 },
      });

      const { chatCompletion } = await import("@/lib/ai/providers");
      const result = await chatCompletion("classifier", {
        messages: [{ role: "user", content: "Create a task" }],
      });

      expect(result).toBe("Task created.");
    });

    it("forwards jsonMode to the underlying adapter", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '{"ok":true}' } }],
        usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
      });

      const { chatCompletion } = await import("@/lib/ai/providers");
      await chatCompletion("classifier", {
        messages: [{ role: "user", content: "JSON please" }],
        jsonMode: true,
      });

      const callArg = mockOpenAICreate.mock.calls[0][0];
      expect(callArg.response_format).toEqual({ type: "json_object" });
    });

    it("uses the role's default model when calling the API", async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: "OK" } }],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
      });

      const { chatCompletion } = await import("@/lib/ai/providers");
      await chatCompletion("classifier", {
        messages: [{ role: "user", content: "Hi" }],
      });

      const callArg = mockOpenAICreate.mock.calls[0][0];
      expect(callArg.model).toBe("gpt-4o-mini");
    });

    it("propagates errors from the underlying provider", async () => {
      mockOpenAICreate.mockRejectedValue(
        Object.assign(new Error("Rate limited"), { status: 400 })
      );

      const { chatCompletion } = await import("@/lib/ai/providers");

      await expect(
        chatCompletion("classifier", {
          messages: [{ role: "user", content: "Hi" }],
        })
      ).rejects.toThrow("Rate limited");
    });

    it("retries on retryable status codes (429) and succeeds on second attempt", async () => {
      const rateLimitError = Object.assign(new Error("Too Many Requests"), {
        status: 429,
      });

      mockOpenAICreate
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          choices: [{ message: { content: "Retried successfully" } }],
          usage: { prompt_tokens: 5, completion_tokens: 5, total_tokens: 10 },
        });

      const { chatCompletion } = await import("@/lib/ai/providers");

      // Use a short timeout to prevent the test from taking too long due to
      // exponential back-off.  We mock setTimeout to make retries instant.
      vi.useFakeTimers();
      const completionPromise = chatCompletion("classifier", {
        messages: [{ role: "user", content: "Hello" }],
      });

      // Advance timers to skip the retry delay.
      await vi.runAllTimersAsync();

      const result = await completionPromise;
      vi.useRealTimers();

      expect(result).toBe("Retried successfully");
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2);
    }, 15000);
  });
});
