import { describe, it, expect } from "vitest";
import type {
  TranscriptionJob,
  AIProcessingJob,
  EmbeddingJob,
  NotificationJob,
  ActionExecutionJob,
  BriefingJob,
} from "@/lib/queue/jobs";

// ---------- Runtime Shape Assertions ----------------------------------------
// Because the job types are purely TypeScript interfaces (no Zod schemas),
// there is nothing to execute at runtime *from* the module. These tests verify
// that objects conforming to each interface satisfy the expected contracts and
// that TypeScript compilation passes for both required and optional fields.

describe("TranscriptionJob shape", () => {
  it("accepts all required fields", () => {
    const job: TranscriptionJob = {
      audioUrl: "https://r2.example.com/audio/abc.webm",
      userId: "user_clerk_123",
      orgId: "org-uuid-456",
      format: "audio/webm",
    };
    expect(job.audioUrl).toBe("https://r2.example.com/audio/abc.webm");
    expect(job.userId).toBe("user_clerk_123");
    expect(job.orgId).toBe("org-uuid-456");
    expect(job.format).toBe("audio/webm");
  });
});

describe("AIProcessingJob shape", () => {
  it("accepts required fields and optional voiceTranscriptId", () => {
    const job: AIProcessingJob = {
      transcript: "Create a task to review PR #42",
      userId: "user-1",
      orgId: "org-1",
      voiceTranscriptId: "vt-uuid-789",
    };
    expect(job.transcript).toContain("review PR");
    expect(job.voiceTranscriptId).toBe("vt-uuid-789");
  });

  it("works without optional voiceTranscriptId", () => {
    const job: AIProcessingJob = {
      transcript: "Check my tasks",
      userId: "user-1",
      orgId: "org-1",
    };
    expect(job.voiceTranscriptId).toBeUndefined();
  });
});

describe("EmbeddingJob shape", () => {
  it("accepts all required fields", () => {
    const job: EmbeddingJob = {
      orgId: "org-1",
      sourceType: "task",
      sourceId: "task-uuid-123",
      content: "Implement login page with Clerk",
    };
    expect(job.sourceType).toBe("task");
    expect(job.content).toContain("login page");
  });
});

describe("NotificationJob shape", () => {
  it("accepts required fields with defaults-like optionals omitted", () => {
    const job: NotificationJob = {
      userId: "user-1",
      orgId: "org-1",
      type: "task_assigned",
      title: "You were assigned a task",
    };
    expect(job.body).toBeUndefined();
    expect(job.channel).toBeUndefined();
    expect(job.metadata).toBeUndefined();
  });

  it("accepts all optional fields", () => {
    const job: NotificationJob = {
      userId: "user-1",
      orgId: "org-1",
      type: "pa_action_completed",
      title: "PA completed action",
      body: "Task 'Fix bug' was created",
      channel: "email",
      metadata: { actionId: "action-uuid-1" },
    };
    expect(job.channel).toBe("email");
    expect(job.metadata?.actionId).toBe("action-uuid-1");
  });
});

describe("ActionExecutionJob shape", () => {
  it("accepts all required fields", () => {
    const job: ActionExecutionJob = {
      actionId: "action-uuid-100",
      userId: "user-1",
      orgId: "org-1",
    };
    expect(job.actionId).toBe("action-uuid-100");
  });
});

describe("BriefingJob shape", () => {
  it("accepts all required fields", () => {
    const job: BriefingJob = {
      userId: "user-1",
      orgId: "org-1",
    };
    expect(job.userId).toBe("user-1");
    expect(job.orgId).toBe("org-1");
  });
});
