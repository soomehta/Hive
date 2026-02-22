import { describe, it, expect } from "vitest";
import {
  resolveActionTier,
  ACTION_REGISTRY,
  getRegistryEntry,
} from "@/lib/actions/registry";

// ---------- Mock PAProfile ------------------------------------------------
// The real PAProfile type is derived from Drizzle's InferSelectModel, which
// pulls in heavy DB imports. We craft a plain object that matches the shape
// the registry functions actually read (autonomyMode, actionOverrides).

const mockProfile = {
  id: "test-id",
  userId: "user-1",
  orgId: "org-1",
  autonomyMode: "copilot" as const,
  verbosity: "concise" as const,
  formality: "professional" as const,
  morningBriefingEnabled: true,
  morningBriefingTime: "08:45",
  endOfDayDigestEnabled: false,
  endOfDayDigestTime: "17:30",
  weeklyDigestEnabled: true,
  weeklyDigestDay: 5,
  timezone: "UTC",
  workingHoursStart: "09:00",
  workingHoursEnd: "17:00",
  languagePreferences: ["en"],
  notificationChannel: "in_app",
  actionOverrides: {},
  avgTasksPerWeek: null,
  peakHours: null,
  commonBlockers: null,
  taskDurationAccuracy: null,
  updateHabits: null,
  totalInteractions: 0,
  commonIntents: null,
  assistantBeeInstanceId: null,
  swarmNotificationsEnabled: true,
  beeAutonomyOverrides: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Helper – creates a profile variant with overrides */
function profileWith(overrides: Record<string, unknown>) {
  return { ...mockProfile, ...overrides } as typeof mockProfile;
}

// ---------- Tests ---------------------------------------------------------

describe("ACTION_REGISTRY", () => {
  it("contains exactly 19 action types", () => {
    expect(Object.keys(ACTION_REGISTRY)).toHaveLength(19);
  });

  it("every entry has defaultTier, handler, and description", () => {
    for (const [key, entry] of Object.entries(ACTION_REGISTRY)) {
      expect(entry.defaultTier, `${key} missing defaultTier`).toBeDefined();
      expect(entry.handler, `${key} missing handler`).toBeDefined();
      expect(entry.description, `${key} missing description`).toBeDefined();
    }
  });
});

describe("getRegistryEntry", () => {
  it("returns the entry for a known action type", () => {
    const entry = getRegistryEntry("create_task");
    expect(entry).toBeDefined();
    expect(entry!.defaultTier).toBe("execute_notify");
  });

  it("returns undefined for an unknown action type", () => {
    expect(getRegistryEntry("fly_to_moon")).toBeUndefined();
  });
});

describe("resolveActionTier — default tiers", () => {
  it("check_tasks resolves to auto_execute (Tier 1 read-only)", () => {
    expect(resolveActionTier("check_tasks", mockProfile)).toBe("auto_execute");
  });

  it("create_task resolves to execute_notify (Tier 2)", () => {
    expect(resolveActionTier("create_task", mockProfile)).toBe(
      "execute_notify"
    );
  });

  it("send_email resolves to draft_approve (Tier 3)", () => {
    expect(resolveActionTier("send_email", mockProfile)).toBe("draft_approve");
  });
});

describe("resolveActionTier — manual mode", () => {
  const manualProfile = profileWith({ autonomyMode: "manual" });

  it("auto_execute action becomes draft_approve in manual mode", () => {
    expect(resolveActionTier("check_tasks", manualProfile)).toBe(
      "draft_approve"
    );
  });

  it("execute_notify action becomes draft_approve in manual mode", () => {
    expect(resolveActionTier("create_task", manualProfile)).toBe(
      "draft_approve"
    );
  });

  it("draft_approve action stays draft_approve in manual mode", () => {
    expect(resolveActionTier("send_email", manualProfile)).toBe(
      "draft_approve"
    );
  });
});

describe("resolveActionTier — autopilot mode", () => {
  const autopilotProfile = profileWith({ autonomyMode: "autopilot" });

  it("returns default tier for auto_execute actions", () => {
    expect(resolveActionTier("check_tasks", autopilotProfile)).toBe(
      "auto_execute"
    );
  });

  it("returns default tier for execute_notify actions", () => {
    expect(resolveActionTier("create_task", autopilotProfile)).toBe(
      "execute_notify"
    );
  });
});

describe("resolveActionTier — copilot mode context rules", () => {
  it("bumps create_task to draft_approve when assignee differs from user", () => {
    expect(
      resolveActionTier("create_task", mockProfile, {
        assigneeId: "other-user",
        userId: "user-1",
      })
    ).toBe("draft_approve");
  });

  it("keeps create_task at execute_notify when assignee is the user", () => {
    expect(
      resolveActionTier("create_task", mockProfile, {
        assigneeId: "user-1",
        userId: "user-1",
      })
    ).toBe("execute_notify");
  });
});

describe("resolveActionTier — user overrides", () => {
  it("user override takes priority over mode and context", () => {
    const overriddenProfile = profileWith({
      actionOverrides: { create_task: "auto_execute" },
    });
    expect(resolveActionTier("create_task", overriddenProfile)).toBe(
      "auto_execute"
    );
  });

  it("user override takes priority even in manual mode", () => {
    const overriddenManual = profileWith({
      autonomyMode: "manual",
      actionOverrides: { send_email: "auto_execute" },
    });
    expect(resolveActionTier("send_email", overriddenManual)).toBe(
      "auto_execute"
    );
  });
});

describe("resolveActionTier — unknown action type", () => {
  it("returns suggest_only for an unrecognised action", () => {
    expect(resolveActionTier("teleport", mockProfile)).toBe("suggest_only");
  });
});
