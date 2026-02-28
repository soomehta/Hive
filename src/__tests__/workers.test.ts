/**
 * workers.test.ts
 *
 * Comprehensive tests for BullMQ worker processor logic.
 *
 * Strategy: mock @/lib/queue so that createWorker() captures the processor
 * function instead of connecting to Redis. We then import the worker modules
 * to trigger those createWorker() calls, retrieve the captured processors,
 * and invoke them directly with mock Job objects.
 *
 * The key challenge is that vi.mock() factory functions are hoisted before
 * all variable declarations. Any variables referenced inside the factory must
 * themselves be created via vi.hoisted() so they exist at hoist-time.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import {
  MOCK_USER_ID,
  MOCK_ORG_ID,
  MOCK_ACTION_ID,
  mockPAAction,
} from "./helpers";

// ─── Hoist shared state so factories can reference it ─────────────────────────
// vi.hoisted() runs synchronously before the vi.mock() factories, making the
// returned values safe to reference inside those factories.
const {
  processors,
  mockNotificationAdd,
  mockLearningAdd,
  mockAIProcessingAdd,
} = vi.hoisted(() => {
  return {
    processors: {} as Record<string, Function>,
    mockNotificationAdd: vi.fn(),
    mockLearningAdd: vi.fn(),
    mockAIProcessingAdd: vi.fn(),
  };
});

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("@/lib/queue", () => ({
  createWorker: vi.fn((name: string, processor: Function) => {
    processors[name] = processor;
    return { on: vi.fn() };
  }),
  QUEUE_NAMES: {
    ACTION_EXECUTION: "action-execution",
    TRANSCRIPTION: "transcription",
    SWARM_EXECUTION: "swarm-execution",
  },
  getNotificationQueue: vi.fn(() => ({ add: mockNotificationAdd })),
  getLearningQueue: vi.fn(() => ({ add: mockLearningAdd })),
  getAIProcessingQueue: vi.fn(() => ({ add: mockAIProcessingAdd })),
}));

vi.mock("@/lib/actions/executor", () => ({
  executeAction: vi.fn(),
}));

vi.mock("@/lib/db/queries/pa-actions", () => ({
  getPaAction: vi.fn(),
  updatePaAction: vi.fn(),
  createVoiceTranscript: vi.fn(),
}));

vi.mock("@/lib/db/queries/activity", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/db/queries/swarm-sessions", () => ({
  updateSwarmSession: vi.fn(),
}));

vi.mock("@/lib/voice/deepgram", () => ({
  transcribeAudio: vi.fn(),
}));

vi.mock("@/lib/bees/swarm-executor", () => ({
  executeSwarm: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: vi.fn(),
}));

// ─── Import workers — triggers createWorker() calls which populate processors ─
import "@/lib/queue/workers/action-execution.worker";
import "@/lib/queue/workers/transcription.worker";
import "@/lib/queue/workers/swarm.worker";

// ─── Import mocked dependency functions for assertion ─────────────────────────
import { executeAction } from "@/lib/actions/executor";
import {
  getPaAction,
  updatePaAction,
  createVoiceTranscript,
} from "@/lib/db/queries/pa-actions";
import { logActivity } from "@/lib/db/queries/activity";
import { updateSwarmSession } from "@/lib/db/queries/swarm-sessions";
import { transcribeAudio } from "@/lib/voice/deepgram";
import { executeSwarm } from "@/lib/bees/swarm-executor";

// ─── Helper ───────────────────────────────────────────────────────────────────

function mockJob<T>(data: T, id = "job-1") {
  return { id, data } as any;
}

// ─── Shared swarm dispatch plan fixture ──────────────────────────────────────

const MOCK_DISPATCH_PLAN = {
  mode: "swarm" as const,
  complexityScore: 7,
  complexityReasons: ["multi-step", "external-api"],
  selectedBees: [
    {
      beeInstanceId: "bee-inst-1",
      templateName: "task-planner",
      type: "task" as const,
      subtype: "creator" as const,
      order: 0,
      relevanceScore: 0.9,
      reason: "Creates tasks",
    },
  ],
  estimatedDurationMs: 15000,
};

// =============================================================================
// ACTION EXECUTION WORKER
// =============================================================================

describe("Action Execution Worker", () => {
  const getProcessor = () => processors["action-execution"];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes a pending action and marks it as executed on success", async () => {
    const action = mockPAAction({ status: "pending" });
    vi.mocked(getPaAction).mockResolvedValue(action as any);
    vi.mocked(executeAction).mockResolvedValue({
      success: true,
      result: { taskId: "t-new" },
    });
    vi.mocked(updatePaAction).mockResolvedValue({
      ...action,
      status: "executed",
    } as any);

    const result = await getProcessor()(
      mockJob({ actionId: MOCK_ACTION_ID, userId: MOCK_USER_ID, orgId: MOCK_ORG_ID })
    );

    expect(getPaAction).toHaveBeenCalledWith(MOCK_ACTION_ID);
    expect(executeAction).toHaveBeenCalledWith(action);
    expect(updatePaAction).toHaveBeenCalledWith(
      MOCK_ACTION_ID,
      expect.objectContaining({ status: "executed" })
    );
    expect(result).toEqual(
      expect.objectContaining({ success: true, actionId: MOCK_ACTION_ID })
    );
  });

  it("executes an approved action and marks it as executed on success", async () => {
    const action = mockPAAction({ status: "approved" });
    vi.mocked(getPaAction).mockResolvedValue(action as any);
    vi.mocked(executeAction).mockResolvedValue({
      success: true,
      result: { taskId: "t-approved" },
    });
    vi.mocked(updatePaAction).mockResolvedValue({
      ...action,
      status: "executed",
    } as any);

    const result = await getProcessor()(
      mockJob({ actionId: MOCK_ACTION_ID, userId: MOCK_USER_ID, orgId: MOCK_ORG_ID })
    );

    expect(updatePaAction).toHaveBeenCalledWith(
      MOCK_ACTION_ID,
      expect.objectContaining({ status: "executed" })
    );
    expect(result).toMatchObject({ success: true });
  });

  it("logs activity to the activity feed after successful execution", async () => {
    const action = mockPAAction({ actionType: "create_task", tier: "draft_approve" });
    vi.mocked(getPaAction).mockResolvedValue(action as any);
    vi.mocked(executeAction).mockResolvedValue({
      success: true,
      result: { taskId: "t-logged" },
    });

    await getProcessor()(
      mockJob({ actionId: MOCK_ACTION_ID, userId: MOCK_USER_ID, orgId: MOCK_ORG_ID })
    );

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: MOCK_ORG_ID,
        userId: MOCK_USER_ID,
        type: "pa_action_executed",
        metadata: expect.objectContaining({
          actionId: MOCK_ACTION_ID,
          actionType: "create_task",
          tier: "draft_approve",
        }),
      })
    );
  });

  it("enqueues a notification job and a learning job after successful execution", async () => {
    const action = mockPAAction({ status: "pending", actionType: "create_task" });
    vi.mocked(getPaAction).mockResolvedValue(action as any);
    vi.mocked(executeAction).mockResolvedValue({
      success: true,
      result: { taskId: "t-notify" },
    });

    await getProcessor()(
      mockJob({ actionId: MOCK_ACTION_ID, userId: MOCK_USER_ID, orgId: MOCK_ORG_ID })
    );

    // Notification queue
    expect(mockNotificationAdd).toHaveBeenCalledWith(
      "action-executed",
      expect.objectContaining({
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        type: "pa_action_pending",
        channel: "in_app",
        metadata: expect.objectContaining({ actionId: MOCK_ACTION_ID }),
      })
    );

    // Learning queue
    expect(mockLearningAdd).toHaveBeenCalledWith(
      "learn-from-action",
      expect.objectContaining({
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        actionType: "create_task",
        wasApproved: false,
        wasEdited: false,
      })
    );
  });

  it("marks the action as failed when executeAction returns success: false", async () => {
    const action = mockPAAction({ status: "pending" });
    vi.mocked(getPaAction).mockResolvedValue(action as any);
    vi.mocked(executeAction).mockResolvedValue({
      success: false,
      error: "Database constraint violation",
    });

    const result = await getProcessor()(
      mockJob({ actionId: MOCK_ACTION_ID, userId: MOCK_USER_ID, orgId: MOCK_ORG_ID })
    );

    expect(updatePaAction).toHaveBeenCalledWith(
      MOCK_ACTION_ID,
      expect.objectContaining({
        status: "failed",
        executionResult: { error: "Database constraint violation" },
      })
    );
    expect(result).toMatchObject({ success: false, actionId: MOCK_ACTION_ID });
    // Activity log and downstream queues must NOT be called on failure
    expect(logActivity).not.toHaveBeenCalled();
    expect(mockNotificationAdd).not.toHaveBeenCalled();
    expect(mockLearningAdd).not.toHaveBeenCalled();
  });

  it("skips execution and returns early when action status is not pending or approved", async () => {
    const action = mockPAAction({ status: "executed" });
    vi.mocked(getPaAction).mockResolvedValue(action as any);

    const result = await getProcessor()(
      mockJob({ actionId: MOCK_ACTION_ID, userId: MOCK_USER_ID, orgId: MOCK_ORG_ID })
    );

    expect(executeAction).not.toHaveBeenCalled();
    expect(updatePaAction).not.toHaveBeenCalled();
    expect(result).toMatchObject({ skipped: true });
    expect((result as any).reason).toContain("executed");
  });

  it("throws when the action record is not found", async () => {
    vi.mocked(getPaAction).mockResolvedValue(undefined as any);

    await expect(
      getProcessor()(
        mockJob({
          actionId: "nonexistent-id",
          userId: MOCK_USER_ID,
          orgId: MOCK_ORG_ID,
        })
      )
    ).rejects.toThrow("nonexistent-id");
  });
});

// =============================================================================
// TRANSCRIPTION WORKER
// =============================================================================

describe("Transcription Worker", () => {
  const getProcessor = () => processors["transcription"];

  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
  });

  /** Build a minimal Response-like object the worker expects. */
  function makeFetchResponse(ok: boolean, body?: ArrayBuffer) {
    return {
      ok,
      status: ok ? 200 : 404,
      statusText: ok ? "OK" : "Not Found",
      arrayBuffer: vi.fn().mockResolvedValue(body ?? new ArrayBuffer(256)),
    } as any;
  }

  it("fetches audio, transcribes it, stores the transcript, and returns transcript info", async () => {
    const fakeAudioBuffer = new ArrayBuffer(512);
    mockFetch.mockResolvedValue(makeFetchResponse(true, fakeAudioBuffer));

    vi.mocked(transcribeAudio).mockResolvedValue({
      transcript: "create a new task for the design review",
      confidence: 0.97,
      language: "en",
      words: [],
    });

    vi.mocked(createVoiceTranscript).mockResolvedValue({ id: "vt-uuid-001" } as any);

    const result = await getProcessor()(
      mockJob({
        audioUrl: "https://r2.example.com/audio/clip.webm",
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        format: "audio/webm",
      })
    );

    expect(mockFetch).toHaveBeenCalledWith("https://r2.example.com/audio/clip.webm");
    expect(transcribeAudio).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ mimeType: "audio/webm" })
    );
    expect(createVoiceTranscript).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        audioUrl: "https://r2.example.com/audio/clip.webm",
        audioFormat: "audio/webm",
        transcript: "create a new task for the design review",
        confidence: 0.97,
        language: "en",
        provider: "deepgram",
      })
    );
    expect(result).toEqual({
      transcriptId: "vt-uuid-001",
      text: "create a new task for the design review",
    });
  });

  it("enqueues an AI processing job with the transcript and voice transcript ID", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(true));

    vi.mocked(transcribeAudio).mockResolvedValue({
      transcript: "remind me tomorrow at 9am",
      confidence: 0.95,
      language: "en",
      words: [],
    });

    vi.mocked(createVoiceTranscript).mockResolvedValue({ id: "vt-uuid-002" } as any);

    await getProcessor()(
      mockJob({
        audioUrl: "https://r2.example.com/audio/remind.webm",
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        format: "audio/webm",
      })
    );

    expect(mockAIProcessingAdd).toHaveBeenCalledWith(
      "process-transcript",
      expect.objectContaining({
        transcript: "remind me tomorrow at 9am",
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        voiceTranscriptId: "vt-uuid-002",
      }),
      expect.objectContaining({ priority: 1 })
    );
  });

  it("throws when the fetch response is not ok (non-200 status)", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(false));

    await expect(
      getProcessor()(
        mockJob({
          audioUrl: "https://r2.example.com/audio/missing.webm",
          userId: MOCK_USER_ID,
          orgId: MOCK_ORG_ID,
          format: "audio/webm",
        })
      )
    ).rejects.toThrow("Failed to fetch audio");
  });

  it("passes the correct MIME type format to transcribeAudio", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse(true));

    vi.mocked(transcribeAudio).mockResolvedValue({
      transcript: "test",
      confidence: 0.9,
      language: "en",
      words: [],
    });

    vi.mocked(createVoiceTranscript).mockResolvedValue({ id: "vt-uuid-003" } as any);

    await getProcessor()(
      mockJob({
        audioUrl: "https://r2.example.com/audio/sample.mp4",
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        format: "audio/mp4",
      })
    );

    expect(transcribeAudio).toHaveBeenCalledWith(
      expect.any(Buffer),
      expect.objectContaining({ mimeType: "audio/mp4" })
    );
  });
});

// =============================================================================
// SWARM WORKER
// =============================================================================

describe("Swarm Worker", () => {
  const getProcessor = () => processors["swarm-execution"];

  const MOCK_SWARM_SESSION_ID = "swarm-sess-00000001";

  function makeSwarmJob(overrides?: Record<string, any>) {
    return mockJob({
      swarmSessionId: MOCK_SWARM_SESSION_ID,
      userId: MOCK_USER_ID,
      orgId: MOCK_ORG_ID,
      triggerMessage: "Analyze our sprint backlog and create a summary report",
      dispatchPlan: MOCK_DISPATCH_PLAN,
      verbosity: "concise",
      formality: "professional",
      ...overrides,
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("executes the swarm and returns session metrics on success", async () => {
    vi.mocked(executeSwarm).mockResolvedValue({
      swarmSessionId: MOCK_SWARM_SESSION_ID,
      synthesizedResponse: "Here is the sprint summary: ...",
      totalTokens: 1420,
      totalDurationMs: 12500,
    });

    const result = await getProcessor()(makeSwarmJob());

    expect(executeSwarm).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: MOCK_ORG_ID,
        userId: MOCK_USER_ID,
        triggerMessage: "Analyze our sprint backlog and create a summary report",
        dispatchPlan: MOCK_DISPATCH_PLAN,
        verbosity: "concise",
        formality: "professional",
        existingSwarmSessionId: MOCK_SWARM_SESSION_ID,
      })
    );

    expect(result).toEqual({
      swarmSessionId: MOCK_SWARM_SESSION_ID,
      totalTokens: 1420,
      durationMs: 12500,
    });
  });

  it("sends a completion notification to the user after a successful swarm run", async () => {
    vi.mocked(executeSwarm).mockResolvedValue({
      swarmSessionId: MOCK_SWARM_SESSION_ID,
      synthesizedResponse: "Your swarm results are ready and detailed below.",
      totalTokens: 800,
      totalDurationMs: 9000,
    });

    await getProcessor()(makeSwarmJob());

    expect(mockNotificationAdd).toHaveBeenCalledWith(
      "swarm-completed",
      expect.objectContaining({
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        type: "pa_action_pending",
        title: "Bee swarm completed",
        channel: "in_app",
        metadata: { swarmSessionId: MOCK_SWARM_SESSION_ID },
      })
    );
  });

  it("marks the swarm session as failed when executeSwarm throws", async () => {
    const executionError = new Error("AI provider rate limit exceeded");
    vi.mocked(executeSwarm).mockRejectedValue(executionError);
    vi.mocked(updateSwarmSession).mockResolvedValue({} as any);

    await expect(getProcessor()(makeSwarmJob())).rejects.toThrow(
      "AI provider rate limit exceeded"
    );

    expect(updateSwarmSession).toHaveBeenCalledWith(
      MOCK_SWARM_SESSION_ID,
      expect.objectContaining({
        status: "failed",
        result: { error: "AI provider rate limit exceeded" },
      })
    );
  });

  it("re-throws the original error so BullMQ can apply retry and failure logic", async () => {
    const sentinelError = new Error("sentinel-error-12345");
    vi.mocked(executeSwarm).mockRejectedValue(sentinelError);
    vi.mocked(updateSwarmSession).mockResolvedValue({} as any);

    await expect(getProcessor()(makeSwarmJob())).rejects.toBe(sentinelError);
  });

  it("forwards all job parameters to executeSwarm correctly", async () => {
    vi.mocked(executeSwarm).mockResolvedValue({
      swarmSessionId: "swarm-custom-99",
      synthesizedResponse: "Custom result",
      totalTokens: 300,
      totalDurationMs: 4000,
    });

    await getProcessor()(
      makeSwarmJob({
        swarmSessionId: "swarm-custom-99",
        triggerMessage: "Draft a weekly digest for all projects",
        verbosity: "detailed",
        formality: "casual",
      })
    );

    expect(executeSwarm).toHaveBeenCalledWith(
      expect.objectContaining({
        existingSwarmSessionId: "swarm-custom-99",
        triggerMessage: "Draft a weekly digest for all projects",
        verbosity: "detailed",
        formality: "casual",
        orgId: MOCK_ORG_ID,
        userId: MOCK_USER_ID,
      })
    );
  });
});
