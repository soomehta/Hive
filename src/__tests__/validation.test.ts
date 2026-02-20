import { describe, it, expect } from "vitest";
import {
  paChatSchema,
  actionDecisionSchema,
  reportQuerySchema,
  updatePaProfileSchema,
} from "@/lib/utils/validation";

// ---------- paChatSchema ---------------------------------------------------

describe("paChatSchema", () => {
  it("accepts a valid message", () => {
    const result = paChatSchema.safeParse({ message: "Create a task for me" });
    expect(result.success).toBe(true);
  });

  it("accepts a message with optional voiceTranscriptId", () => {
    const result = paChatSchema.safeParse({
      message: "Hello",
      voiceTranscriptId: "550e8400-e29b-41d4-a716-446655440000",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty message", () => {
    const result = paChatSchema.safeParse({ message: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a message longer than 2000 characters", () => {
    const result = paChatSchema.safeParse({ message: "x".repeat(2001) });
    expect(result.success).toBe(false);
  });

  it("accepts a message at exactly 2000 characters", () => {
    const result = paChatSchema.safeParse({ message: "x".repeat(2000) });
    expect(result.success).toBe(true);
  });
});

// ---------- actionDecisionSchema -------------------------------------------

describe("actionDecisionSchema", () => {
  it("accepts approve decision", () => {
    const result = actionDecisionSchema.safeParse({ decision: "approve" });
    expect(result.success).toBe(true);
  });

  it("accepts reject decision with reason", () => {
    const result = actionDecisionSchema.safeParse({
      decision: "reject",
      rejectionReason: "Not now",
    });
    expect(result.success).toBe(true);
  });

  it("accepts edit decision with editedPayload", () => {
    const result = actionDecisionSchema.safeParse({
      decision: "edit",
      editedPayload: { title: "Updated title", priority: "high" },
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid decision value", () => {
    const result = actionDecisionSchema.safeParse({ decision: "cancel" });
    expect(result.success).toBe(false);
  });
});

// ---------- reportQuerySchema ----------------------------------------------

describe("reportQuerySchema", () => {
  it("accepts a valid question", () => {
    const result = reportQuerySchema.safeParse({
      question: "What tasks are overdue?",
    });
    expect(result.success).toBe(true);
  });

  it("accepts question with projectId and format", () => {
    const result = reportQuerySchema.safeParse({
      question: "Sprint progress",
      projectId: "550e8400-e29b-41d4-a716-446655440000",
      format: "structured",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty question", () => {
    const result = reportQuerySchema.safeParse({ question: "" });
    expect(result.success).toBe(false);
  });
});

// ---------- updatePaProfileSchema ------------------------------------------

describe("updatePaProfileSchema", () => {
  it("accepts a partial update with only autonomyMode", () => {
    const result = updatePaProfileSchema.safeParse({
      autonomyMode: "manual",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid morningBriefingTime format HH:MM", () => {
    const result = updatePaProfileSchema.safeParse({
      morningBriefingTime: "08:30",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid time format (missing leading zero)", () => {
    const result = updatePaProfileSchema.safeParse({
      morningBriefingTime: "8:30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid time format (extra characters)", () => {
    const result = updatePaProfileSchema.safeParse({
      morningBriefingTime: "08:30:00",
    });
    expect(result.success).toBe(false);
  });

  it("accepts valid weeklyDigestDay (0-6)", () => {
    const result = updatePaProfileSchema.safeParse({ weeklyDigestDay: 0 });
    expect(result.success).toBe(true);
  });

  it("rejects weeklyDigestDay out of range (7)", () => {
    const result = updatePaProfileSchema.safeParse({ weeklyDigestDay: 7 });
    expect(result.success).toBe(false);
  });

  it("rejects weeklyDigestDay below range (-1)", () => {
    const result = updatePaProfileSchema.safeParse({ weeklyDigestDay: -1 });
    expect(result.success).toBe(false);
  });

  it("accepts actionOverrides with valid tiers", () => {
    const result = updatePaProfileSchema.safeParse({
      actionOverrides: {
        create_task: "auto_execute",
        send_email: "draft_approve",
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects actionOverrides with invalid tier value", () => {
    const result = updatePaProfileSchema.safeParse({
      actionOverrides: { create_task: "yolo" },
    });
    expect(result.success).toBe(false);
  });
});
