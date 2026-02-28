import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Hoisted mock variables (must be declared before vi.mock factories) ───────

const mockDbSelect = vi.hoisted(() => vi.fn());

// ─── Mocks (hoisted before any imports that use them) ────────────────────────

vi.mock("@/lib/auth/cron-auth", () => ({
  verifyCronSecret: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: { select: mockDbSelect },
}));

// Schema objects only need to exist as stable references. The routes pass them
// to db.select().from(table) as identifiers; since we mock db entirely we only
// need the objects to exist.
vi.mock("@/lib/db/schema", () => ({
  paProfiles: { morningBriefingEnabled: "morningBriefingEnabled" },
  tasks: {
    status: "status",
    updatedAt: "updatedAt",
    dueDate: "dueDate",
    assigneeId: "assigneeId",
    orgId: "orgId",
  },
  notifications: {
    userId: "userId",
    type: "type",
    createdAt: "createdAt",
  },
}));

// Drizzle operators: the routes call these to build query conditions. We just
// need them to return a stable, opaque value so the chain compiles correctly.
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ __op: "eq" })),
  and: vi.fn((...args: unknown[]) => ({ __op: "and", args })),
  lt: vi.fn((_col: unknown, _val: unknown) => ({ __op: "lt" })),
  gte: vi.fn((_col: unknown, _val: unknown) => ({ __op: "gte" })),
  desc: vi.fn((_col: unknown) => ({ __op: "desc" })),
  notInArray: vi.fn((_col: unknown, _vals: unknown) => ({ __op: "notInArray" })),
}));

vi.mock("@/lib/db/queries/tasks", () => ({
  getTasks: vi.fn(),
}));

vi.mock("@/lib/db/queries/activity", () => ({
  getActivityFeed: vi.fn(),
}));

vi.mock("@/lib/notifications/in-app", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/ai/briefing-generator", () => ({
  generateBriefing: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// ─── Module imports (after mocks) ────────────────────────────────────────────

import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { createNotification } from "@/lib/notifications/in-app";
import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { generateBriefing } from "@/lib/ai/briefing-generator";

import { POST as morningBriefingPOST } from "@/app/api/cron/morning-briefing/route";
import { POST as overdueNudgePOST } from "@/app/api/cron/overdue-nudge/route";
import { POST as staleTasksPOST } from "@/app/api/cron/stale-tasks/route";

import {
  MOCK_USER_ID,
  MOCK_ORG_ID,
  MOCK_TASK_ID,
  MOCK_PROJECT_ID,
} from "./helpers";

// ─── Test data factories ──────────────────────────────────────────────────────

function makeCronRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { authorization: "Bearer test-cron-secret" },
  });
}

/** Build a UTC HH:MM string within ±15 minutes of right now. */
function nowUtcHHMM(): string {
  const now = new Date();
  return `${String(now.getUTCHours()).padStart(2, "0")}:${String(
    now.getUTCMinutes()
  ).padStart(2, "0")}`;
}

/** Build a UTC HH:MM string 3 hours in the past (well outside the ±15 min window). */
function pastUtcHHMM(): string {
  const d = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(
    d.getUTCMinutes()
  ).padStart(2, "0")}`;
}

function makePAProfile(overrides: Record<string, unknown> = {}) {
  return {
    userId: MOCK_USER_ID,
    orgId: MOCK_ORG_ID,
    morningBriefingEnabled: true,
    timezone: "UTC",
    morningBriefingTime: nowUtcHHMM(),
    ...overrides,
  };
}

function makeOverdueTask(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_TASK_ID,
    title: "Overdue task",
    orgId: MOCK_ORG_ID,
    projectId: MOCK_PROJECT_ID,
    assigneeId: MOCK_USER_ID,
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    status: "in_progress",
    metadata: null,
    ...overrides,
  };
}

function makeStaleTask(overrides: Record<string, unknown> = {}) {
  return {
    id: MOCK_TASK_ID,
    title: "Stale task",
    orgId: MOCK_ORG_ID,
    projectId: MOCK_PROJECT_ID,
    assigneeId: MOCK_USER_ID,
    status: "in_progress",
    updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    metadata: null,
    ...overrides,
  };
}

function makeNotification(overrides: Record<string, unknown> = {}) {
  return {
    id: "notif-001",
    userId: MOCK_USER_ID,
    type: "pa_nudge",
    metadata: { taskId: MOCK_TASK_ID, nudgeType: "overdue" },
    createdAt: new Date(),
    ...overrides,
  };
}

// ─── DB chain helper ──────────────────────────────────────────────────────────
//
// The cron routes use two query patterns:
//   1. Simple:  await db.select().from(table).where(cond)
//   2. Chained: await db.select().from(table).where(cond).orderBy(ord).limit(n)
//
// We make `where()` return a real Promise (so `await ...where()` resolves) that
// also carries `.orderBy()` and `.limit()` methods so both patterns work.
//
// Each successive call to db.select() advances an internal index so different
// queries in one handler can return different results.

function buildDbChain(...queryResults: unknown[][]): void {
  let callIndex = 0;

  mockDbSelect.mockImplementation(() => ({
    from: vi.fn().mockImplementation(() => {
      const currentIndex = callIndex++;
      const result = queryResults[currentIndex] ?? [];

      // A native Promise fulfils the `await db.select().from().where()` pattern.
      const promise = Promise.resolve(result) as Promise<unknown[]> & {
        orderBy: (ord: unknown) => { limit: (n: number) => Promise<unknown[]> };
        limit: (n: number) => Promise<unknown[]>;
      };

      promise.orderBy = vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      });
      promise.limit = vi.fn().mockResolvedValue(result);

      return {
        where: vi.fn().mockReturnValue(promise),
      };
    }),
  }));
}

// ─── Morning Briefing ─────────────────────────────────────────────────────────

describe("POST /api/cron/morning-briefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyCronSecret).mockReturnValue(true);
    vi.mocked(getTasks).mockResolvedValue({ data: [], nextCursor: null } as any);
    vi.mocked(getActivityFeed).mockResolvedValue({
      data: [],
      nextCursor: null,
    } as any);
    vi.mocked(generateBriefing).mockResolvedValue({
      briefing: "Good morning! Here is your briefing.",
      todaysTasks: [],
      todaysMeetings: [],
      blockers: [],
      unreadCount: 0,
    });
    vi.mocked(createNotification).mockResolvedValue(undefined as any);
  });

  it("returns 401 when verifyCronSecret returns false", async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(false);
    buildDbChain();

    const req = makeCronRequest("/api/cron/morning-briefing");
    const response = await morningBriefingPOST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("returns success with zero counts when no profiles have briefing enabled", async () => {
    buildDbChain([]); // paProfiles query → empty

    const req = makeCronRequest("/api/cron/morning-briefing");
    const response = await morningBriefingPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(0);
    expect(body.total).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("sends a briefing to a user whose briefing time is within ±15 minutes of now", async () => {
    const profile = makePAProfile(); // morningBriefingTime defaults to nowUtcHHMM()
    // Query 0: paProfiles → [profile]
    // Query 1: notifications dedup → [] (not yet briefed today)
    buildDbChain([profile], []);

    const req = makeCronRequest("/api/cron/morning-briefing");
    const response = await morningBriefingPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.total).toBe(1);
    expect(createNotification).toHaveBeenCalledOnce();
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        type: "pa_briefing",
      })
    );
  });

  it("skips a user whose briefing time is outside the ±15-minute window", async () => {
    const profile = makePAProfile({ morningBriefingTime: pastUtcHHMM() });
    // Dedup query is never reached when the window check fails.
    buildDbChain([profile]);

    const req = makeCronRequest("/api/cron/morning-briefing");
    const response = await morningBriefingPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.total).toBe(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("skips a user who has already received a briefing today (dedup check)", async () => {
    const profile = makePAProfile(); // within the time window
    const existingBriefing = {
      id: "notif-existing",
      userId: MOCK_USER_ID,
      type: "pa_briefing",
      createdAt: new Date(),
    };
    // Query 0: paProfiles → [profile]
    // Query 1: notifications dedup → [existingBriefing] (already briefed)
    buildDbChain([profile], [existingBriefing]);

    const req = makeCronRequest("/api/cron/morning-briefing");
    const response = await morningBriefingPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.total).toBe(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("calls generateBriefing with a context containing the user's orgId and timezone", async () => {
    const profile = makePAProfile();
    buildDbChain([profile], []);

    const req = makeCronRequest("/api/cron/morning-briefing");
    await morningBriefingPOST(req);

    expect(generateBriefing).toHaveBeenCalledOnce();
    expect(generateBriefing).toHaveBeenCalledWith(
      expect.objectContaining({
        userName: MOCK_USER_ID,
        timezone: "UTC",
      })
    );
  });

  it("passes tasks retrieved via getTasks into the briefing context", async () => {
    const profile = makePAProfile();
    const taskDueToday = {
      id: "task-today",
      title: "Finish report",
      status: "in_progress",
      priority: "high",
      // dueDate is a string in today's date range so it falls into todayTasks
      dueDate: new Date().toISOString(),
      isBlocked: false,
      blockedReason: null,
    };
    buildDbChain([profile], []);
    vi.mocked(getTasks).mockResolvedValue({
      data: [taskDueToday],
      nextCursor: null,
    } as any);

    const req = makeCronRequest("/api/cron/morning-briefing");
    await morningBriefingPOST(req);

    expect(getTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: MOCK_ORG_ID,
        assigneeId: MOCK_USER_ID,
      })
    );
    expect(generateBriefing).toHaveBeenCalledOnce();
  });

  it("includes overdue task count in the createNotification metadata", async () => {
    const profile = makePAProfile();
    const overdueTask = {
      id: "task-overdue",
      title: "Way Past Due",
      status: "in_progress",
      priority: "urgent",
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      isBlocked: false,
      blockedReason: null,
    };
    buildDbChain([profile], []);
    vi.mocked(getTasks).mockResolvedValue({
      data: [overdueTask],
      nextCursor: null,
    } as any);

    const req = makeCronRequest("/api/cron/morning-briefing");
    await morningBriefingPOST(req);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          overdueTasks: expect.any(Number),
        }),
      })
    );
  });

  it("returns correct sent and skipped counts for a mix of in-window and out-of-window profiles", async () => {
    const profileInWindow = makePAProfile(); // in window → sent
    const profileOutWindow = makePAProfile({
      userId: "user-2",
      morningBriefingTime: pastUtcHHMM(), // outside window → skipped
    });
    // Query 0: paProfiles → both profiles
    // Query 1: dedup for profileInWindow → [] (not yet briefed)
    buildDbChain([profileInWindow, profileOutWindow], []);

    const req = makeCronRequest("/api/cron/morning-briefing");
    const response = await morningBriefingPOST(req);
    const body = await response.json();

    expect(body.total).toBe(2);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(1);
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    mockDbSelect.mockImplementation(() => {
      throw new Error("DB connection lost");
    });

    const req = makeCronRequest("/api/cron/morning-briefing");
    const response = await morningBriefingPOST(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});

// ─── Overdue Nudge ────────────────────────────────────────────────────────────

describe("POST /api/cron/overdue-nudge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyCronSecret).mockReturnValue(true);
    vi.mocked(createNotification).mockResolvedValue(undefined as any);
  });

  it("returns 401 when verifyCronSecret returns false", async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(false);
    buildDbChain();

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("returns success with zero counts when no overdue tasks exist", async () => {
    buildDbChain([]); // overdue tasks query → empty

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(0);
    expect(body.total).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("sends a nudge notification for an overdue task that has an assignee", async () => {
    const task = makeOverdueTask();
    // Query 0: overdue tasks → [task]
    // Query 1: recent nudge dedup → [] (never nudged)
    buildDbChain([task], []);

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.total).toBe(1);
    expect(createNotification).toHaveBeenCalledOnce();
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        type: "pa_nudge",
        metadata: expect.objectContaining({
          taskId: MOCK_TASK_ID,
          nudgeType: "overdue",
        }),
      })
    );
  });

  it("skips an overdue task that has no assignee", async () => {
    const task = makeOverdueTask({ assigneeId: null });
    buildDbChain([task]);

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.total).toBe(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("skips an overdue task whose assignee was already nudged within 24 hours", async () => {
    const task = makeOverdueTask();
    const recentNudge = makeNotification({
      metadata: { taskId: MOCK_TASK_ID, nudgeType: "overdue" },
    });
    // Query 0: overdue tasks → [task]
    // Query 1: dedup → [recentNudge] (this exact task was nudged recently)
    buildDbChain([task], [recentNudge]);

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.total).toBe(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("does not skip when the recent nudge belongs to a different task", async () => {
    const task = makeOverdueTask();
    // Nudge exists but for a different task id → dedup should NOT fire
    const nudgeForOtherTask = makeNotification({
      metadata: { taskId: "different-task-id", nudgeType: "overdue" },
    });
    buildDbChain([task], [nudgeForOtherTask]);

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(createNotification).toHaveBeenCalledOnce();
  });

  it("includes a human-readable relative time in the notification body", async () => {
    const task = makeOverdueTask({
      dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days overdue
    });
    buildDbChain([task], []);

    const req = makeCronRequest("/api/cron/overdue-nudge");
    await overdueNudgePOST(req);

    const callArg = vi.mocked(createNotification).mock.calls[0][0];
    expect(callArg.body).toContain("3 day");
  });

  it("returns correct sent and skipped counts for a mix of tasks", async () => {
    const taskWithAssignee = makeOverdueTask({ id: "task-a" }); // sent
    const taskNoAssignee = makeOverdueTask({ id: "task-b", assigneeId: null }); // no assignee → skipped
    const taskAlreadyNudged = makeOverdueTask({ id: "task-c" }); // dedup → skipped
    const nudgeForTaskC = makeNotification({
      metadata: { taskId: "task-c", nudgeType: "overdue" },
    });

    // Call sequence:
    //   Query 0: overdue tasks → [taskWithAssignee, taskNoAssignee, taskAlreadyNudged]
    //   Query 1: dedup for taskWithAssignee → [] (no recent nudge → send)
    //   Query 2: dedup for taskAlreadyNudged → [nudgeForTaskC] (skip)
    buildDbChain(
      [taskWithAssignee, taskNoAssignee, taskAlreadyNudged],
      [],
      [nudgeForTaskC]
    );

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(body.total).toBe(3);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(2);
    expect(createNotification).toHaveBeenCalledOnce();
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    mockDbSelect.mockImplementation(() => {
      throw new Error("DB connection lost");
    });

    const req = makeCronRequest("/api/cron/overdue-nudge");
    const response = await overdueNudgePOST(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});

// ─── Stale Tasks ──────────────────────────────────────────────────────────────

describe("POST /api/cron/stale-tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(verifyCronSecret).mockReturnValue(true);
    vi.mocked(createNotification).mockResolvedValue(undefined as any);
  });

  it("returns 401 when verifyCronSecret returns false", async () => {
    vi.mocked(verifyCronSecret).mockReturnValue(false);
    buildDbChain();

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("returns success with zero counts when no stale tasks exist", async () => {
    buildDbChain([]); // stale tasks query → empty

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(0);
    expect(body.total).toBe(0);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("sends a nudge for a stale in_progress task that has an assignee", async () => {
    const task = makeStaleTask();
    // Query 0: stale tasks → [task]
    // Query 1: recent stale nudge dedup → [] (never nudged)
    buildDbChain([task], []);

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(body.total).toBe(1);
    expect(createNotification).toHaveBeenCalledOnce();
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MOCK_USER_ID,
        orgId: MOCK_ORG_ID,
        type: "pa_nudge",
        metadata: expect.objectContaining({
          taskId: MOCK_TASK_ID,
          nudgeType: "stale",
        }),
      })
    );
  });

  it("skips a stale task that has no assignee", async () => {
    const task = makeStaleTask({ assigneeId: null });
    buildDbChain([task]);

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.total).toBe(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("skips a stale task already nudged within the 7-day dedup window", async () => {
    const task = makeStaleTask();
    const existingStaleNudge = makeNotification({
      metadata: { taskId: MOCK_TASK_ID, nudgeType: "stale" },
    });
    // Query 0: stale tasks → [task]
    // Query 1: dedup → [existingStaleNudge] (already nudged as stale for this task)
    buildDbChain([task], [existingStaleNudge]);

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(body.total).toBe(1);
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("does not skip when the recent nudge has a different nudgeType", async () => {
    const task = makeStaleTask();
    // Same taskId but nudgeType is "overdue", not "stale" — dedup should NOT fire
    const overdueNudge = makeNotification({
      metadata: { taskId: MOCK_TASK_ID, nudgeType: "overdue" },
    });
    buildDbChain([task], [overdueNudge]);

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(createNotification).toHaveBeenCalledOnce();
  });

  it("does not skip when the recent stale nudge is for a different task", async () => {
    const task = makeStaleTask();
    const nudgeForOtherTask = makeNotification({
      metadata: { taskId: "another-task-id", nudgeType: "stale" },
    });
    buildDbChain([task], [nudgeForOtherTask]);

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    expect(createNotification).toHaveBeenCalledOnce();
  });

  it("includes daysSinceUpdate in the notification metadata", async () => {
    const task = makeStaleTask({
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    });
    buildDbChain([task], []);

    const req = makeCronRequest("/api/cron/stale-tasks");
    await staleTasksPOST(req);

    const callArg = vi.mocked(createNotification).mock.calls[0][0];
    expect(callArg.metadata).toMatchObject({
      daysSinceUpdate: expect.any(Number),
      nudgeType: "stale",
    });
    // daysSinceUpdate should be at least 9 given a 10-day-old updatedAt
    expect((callArg.metadata as any).daysSinceUpdate).toBeGreaterThanOrEqual(9);
  });

  it("notification body mentions how many days the task has been stale", async () => {
    const task = makeStaleTask({
      updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    });
    buildDbChain([task], []);

    const req = makeCronRequest("/api/cron/stale-tasks");
    await staleTasksPOST(req);

    const callArg = vi.mocked(createNotification).mock.calls[0][0];
    expect(callArg.body).toContain("days");
  });

  it("returns correct sent and skipped counts for a mix of stale tasks", async () => {
    const taskA = makeStaleTask({ id: "stale-a" }); // sent
    const taskB = makeStaleTask({ id: "stale-b", assigneeId: null }); // no assignee → skipped
    const taskC = makeStaleTask({ id: "stale-c" }); // dedup → skipped
    const nudgeForC = makeNotification({
      metadata: { taskId: "stale-c", nudgeType: "stale" },
    });

    // Call sequence:
    //   Query 0: stale tasks → [taskA, taskB, taskC]
    //   Query 1: dedup for taskA → [] (send)
    //   Query 2: dedup for taskC → [nudgeForC] (skip)
    buildDbChain([taskA, taskB, taskC], [], [nudgeForC]);

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(body.total).toBe(3);
    expect(body.sent).toBe(1); // taskA
    expect(body.skipped).toBe(2); // taskB (no assignee) + taskC (dedup)
    expect(createNotification).toHaveBeenCalledOnce();
  });

  it("returns 500 when the database throws an unexpected error", async () => {
    mockDbSelect.mockImplementation(() => {
      throw new Error("DB connection lost");
    });

    const req = makeCronRequest("/api/cron/stale-tasks");
    const response = await staleTasksPOST(req);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Internal server error");
  });
});
