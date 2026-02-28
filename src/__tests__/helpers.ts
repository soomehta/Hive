import { vi } from "vitest";
import { NextRequest } from "next/server";

// ─── Constants ───────────────────────────────────────────

export const MOCK_USER_ID = "user-00000000-0000-0000-0000-000000000001";
export const MOCK_ORG_ID = "00000000-0000-0000-0000-000000000001";
export const MOCK_PROJECT_ID = "00000000-0000-0000-0000-000000000002";
export const MOCK_TASK_ID = "00000000-0000-0000-0000-000000000003";
export const MOCK_ACTION_ID = "00000000-0000-0000-0000-000000000004";
export const MOCK_CONVERSATION_ID = "00000000-0000-0000-0000-000000000005";

// ─── Factory Functions ──────────────────────────────────

export function mockAuthResult(
  overrides?: Partial<{
    userId: string;
    orgId: string;
    memberRole: "owner" | "admin" | "member";
  }>
) {
  return {
    userId: MOCK_USER_ID,
    orgId: MOCK_ORG_ID,
    memberRole: "member" as const,
    ...overrides,
  };
}

export function mockPAAction(overrides?: Record<string, any>): any {
  return {
    id: MOCK_ACTION_ID,
    conversationId: MOCK_CONVERSATION_ID,
    userId: MOCK_USER_ID,
    orgId: MOCK_ORG_ID,
    actionType: "create_task" as const,
    tier: "draft_approve" as const,
    status: "pending" as const,
    plannedPayload: {
      projectId: MOCK_PROJECT_ID,
      title: "Test task",
    },
    userEditedPayload: null,
    executedPayload: null,
    executionResult: null,
    rejectionReason: null,
    approvedAt: null,
    executedAt: null,
    expiresAt: null,
    beeRunId: null,
    swarmSessionId: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function mockTask(overrides?: Record<string, any>) {
  return {
    id: MOCK_TASK_ID,
    projectId: MOCK_PROJECT_ID,
    orgId: MOCK_ORG_ID,
    title: "Test Task",
    description: null,
    status: "todo" as const,
    priority: "medium" as const,
    assigneeId: null,
    createdBy: MOCK_USER_ID,
    dueDate: null,
    completedAt: null,
    estimatedMinutes: null,
    position: 0,
    isBlocked: false,
    blockedReason: null,
    parentTaskId: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function mockProject(overrides?: Record<string, any>) {
  return {
    id: MOCK_PROJECT_ID,
    orgId: MOCK_ORG_ID,
    name: "Test Project",
    description: null,
    status: "active" as const,
    color: null,
    startDate: null,
    targetDate: null,
    createdBy: MOCK_USER_ID,
    defaultLayoutId: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function mockMessage(overrides?: Record<string, any>) {
  return {
    id: "00000000-0000-0000-0000-000000000010",
    projectId: MOCK_PROJECT_ID,
    orgId: MOCK_ORG_ID,
    userId: MOCK_USER_ID,
    title: "Test Message",
    content: "Test content",
    isPinned: false,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

export function mockNextRequest(
  method: string,
  url: string,
  opts?: {
    body?: Record<string, any>;
    headers?: Record<string, string>;
  }
): NextRequest {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-org-id": MOCK_ORG_ID,
    ...(opts?.headers ?? {}),
  };

  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers,
  };

  if (opts?.body && method !== "GET") {
    init.body = JSON.stringify(opts.body);
  }

  return new NextRequest(new URL(url, "http://localhost:3000"), init as any);
}
