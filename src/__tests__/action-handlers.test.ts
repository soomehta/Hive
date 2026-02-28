import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — all vi.mock() calls are hoisted by Vitest before any imports, so
// they must appear at the top of the file before the module-under-test imports.
// ---------------------------------------------------------------------------

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      projectMembers: { findFirst: vi.fn() },
      projects: { findFirst: vi.fn() },
    },
    select: vi.fn(),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  projectMembers: {},
  tasks: {},
  projects: {},
  organizationMembers: {},
  notifications: {},
}));

vi.mock("@/lib/db/queries/tasks", () => ({
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTask: vi.fn(),
  getTasks: vi.fn(),
  getUserTasks: vi.fn(),
  createTaskComment: vi.fn(),
}));

vi.mock("@/lib/db/queries/activity", () => ({
  logActivity: vi.fn(),
  getActivityFeed: vi.fn(),
}));

vi.mock("@/lib/notifications/in-app", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/integrations/oauth", () => ({
  getActiveIntegration: vi.fn(),
}));

vi.mock("@/lib/integrations/google-calendar", () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock("@/lib/integrations/microsoft-calendar", () => ({
  createEvent: vi.fn(),
  updateEvent: vi.fn(),
  getEvents: vi.fn(),
}));

vi.mock("@/lib/integrations/google-mail", () => ({
  sendEmail: vi.fn(),
  getUnreadEmails: vi.fn(),
}));

vi.mock("@/lib/integrations/microsoft-mail", () => ({
  sendEmail: vi.fn(),
  getUnreadEmails: vi.fn(),
}));

vi.mock("@/lib/integrations/slack", () => ({
  sendMessage: vi.fn(),
}));

vi.mock("@/lib/ai/report-generator", () => ({
  generateReport: vi.fn(),
}));

vi.mock("@/lib/db/queries/messages", () => ({
  createMessage: vi.fn(),
}));

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  eq: vi.fn((col: unknown, val: unknown) => ({ type: "eq", col, val })),
  count: vi.fn(() => ({ type: "count" })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    type: "sql",
    strings,
    values,
  })),
}));

// ---------------------------------------------------------------------------
// Imports — must come AFTER vi.mock() declarations
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import { createTask, updateTask, deleteTask, getTask, getTasks, createTaskComment } from "@/lib/db/queries/tasks";
import { logActivity, getActivityFeed } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { getActiveIntegration } from "@/lib/integrations/oauth";
import * as googleCalendar from "@/lib/integrations/google-calendar";
import * as microsoftCalendar from "@/lib/integrations/microsoft-calendar";
import * as googleMail from "@/lib/integrations/google-mail";
import * as microsoftMail from "@/lib/integrations/microsoft-mail";
import * as slack from "@/lib/integrations/slack";
import { generateReport } from "@/lib/ai/report-generator";
import { createMessage } from "@/lib/db/queries/messages";

import { handleCreateTask } from "@/lib/actions/handlers/create-task";
import { handleUpdateTask } from "@/lib/actions/handlers/update-task";
import { handleCompleteTask } from "@/lib/actions/handlers/complete-task";
import { handleDeleteTask } from "@/lib/actions/handlers/delete-task";
import { handleCreateComment } from "@/lib/actions/handlers/create-comment";
import { handlePostMessage } from "@/lib/actions/handlers/post-message";
import { handleFlagBlocker } from "@/lib/actions/handlers/flag-blocker";
import { handleCalendarBlock } from "@/lib/actions/handlers/calendar-block";
import { handleCalendarEvent } from "@/lib/actions/handlers/calendar-event";
import { handleCalendarReschedule } from "@/lib/actions/handlers/calendar-reschedule";
import { handleSendEmail } from "@/lib/actions/handlers/send-email";
import { handleSendSlack } from "@/lib/actions/handlers/send-slack";
import { handleGenerateReport } from "@/lib/actions/handlers/generate-report";
import { handleQuery } from "@/lib/actions/handlers/query";

import {
  MOCK_USER_ID,
  MOCK_ORG_ID,
  MOCK_PROJECT_ID,
  MOCK_TASK_ID,
  mockPAAction,
  mockTask,
} from "./helpers";

// ---------------------------------------------------------------------------
// Shared mock data factories
// ---------------------------------------------------------------------------

const MOCK_MEMBER = {
  id: "member-001",
  projectId: MOCK_PROJECT_ID,
  userId: MOCK_USER_ID,
  role: "member" as const,
  joinedAt: new Date("2025-01-01T00:00:00Z"),
};

const MOCK_CREATED_TASK = {
  ...mockTask(),
  id: MOCK_TASK_ID,
  title: "Test task",
};

const MOCK_COMMENT = {
  id: "comment-001",
  taskId: MOCK_TASK_ID,
  userId: MOCK_USER_ID,
  content: "A test comment",
  isFromPa: false,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
};

const MOCK_MESSAGE = {
  id: "message-001",
  projectId: MOCK_PROJECT_ID,
  orgId: MOCK_ORG_ID,
  userId: MOCK_USER_ID,
  title: "Status update",
  content: "All good here.",
  isPinned: false,
  isFromPa: false,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  updatedAt: new Date("2025-01-01T00:00:00Z"),
};

const MOCK_CALENDAR_EVENT = {
  id: "cal-event-001",
  summary: "Focus Time",
  startTime: "2026-03-01T09:00:00Z",
  endTime: "2026-03-01T10:00:00Z",
  attendees: [] as string[],
};

// ---------------------------------------------------------------------------
// beforeEach — reset all mocks between tests to prevent cross-test pollution
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// handleCreateTask
// ===========================================================================

describe("handleCreateTask", () => {
  it("returns taskId on success when project membership is confirmed", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID, title: "Test task" },
    });

    const result = await handleCreateTask(action);

    expect(result.success).toBe(true);
    expect(result.result?.taskId).toBe(MOCK_TASK_ID);
    expect(result.result?.title).toBe("Test task");
  });

  it("returns error when user has no project membership", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID, title: "Test task" },
    });

    const result = await handleCreateTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("calls logActivity with task_created type after creating a task", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID, title: "Test task" },
    });

    await handleCreateTask(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: MOCK_ORG_ID,
        taskId: MOCK_TASK_ID,
        type: "task_created",
      })
    );
  });

  it("notifies the assignee when assignee is a different user", async () => {
    const ASSIGNEE_ID = "user-other-00000000-0000-0000-0000-000000000099";

    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createTask).mockResolvedValue({
      ...MOCK_CREATED_TASK,
      assigneeId: ASSIGNEE_ID,
    });
    vi.mocked(logActivity).mockResolvedValue({} as any);
    vi.mocked(createNotification).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: {
        projectId: MOCK_PROJECT_ID,
        title: "Test task",
        assigneeId: ASSIGNEE_ID,
      },
    });

    await handleCreateTask(action);

    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: ASSIGNEE_ID,
        type: "task_assigned",
      })
    );
  });

  it("does not notify when the assignee is the acting user themselves", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createTask).mockResolvedValue({
      ...MOCK_CREATED_TASK,
      assigneeId: MOCK_USER_ID,
    });
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: {
        projectId: MOCK_PROJECT_ID,
        title: "Test task",
        assigneeId: MOCK_USER_ID,
      },
    });

    await handleCreateTask(action);

    expect(createNotification).not.toHaveBeenCalled();
  });

  it("uses userEditedPayload over plannedPayload when both are present", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createTask).mockResolvedValue({
      ...MOCK_CREATED_TASK,
      title: "Edited title",
    });
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID, title: "Original title" },
      userEditedPayload: { projectId: MOCK_PROJECT_ID, title: "Edited title" },
    });

    await handleCreateTask(action);

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Edited title" })
    );
  });
});

// ===========================================================================
// handleUpdateTask
// ===========================================================================

describe("handleUpdateTask", () => {
  it("updates the task and returns taskId on success", async () => {
    const updatedTask = { ...MOCK_CREATED_TASK, title: "Updated title" };

    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(updateTask).mockResolvedValue(updatedTask);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, title: "Updated title" },
    });

    const result = await handleUpdateTask(action);

    expect(result.success).toBe(true);
    expect(result.result?.taskId).toBe(MOCK_TASK_ID);
  });

  it("returns error when taskId is missing from payload", async () => {
    const action = mockPAAction({
      plannedPayload: { title: "Updated title" },
    });

    const result = await handleUpdateTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Task ID/i);
  });

  it("returns error when task is not found in the database", async () => {
    vi.mocked(getTask).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, title: "Updated title" },
    });

    const result = await handleUpdateTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when user has no access to the project", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, title: "Updated title" },
    });

    const result = await handleUpdateTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("calls logActivity with task_updated type after updating", async () => {
    const updatedTask = { ...MOCK_CREATED_TASK, title: "Updated title" };

    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(updateTask).mockResolvedValue(updatedTask);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, title: "Updated title" },
    });

    await handleUpdateTask(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_updated" })
    );
  });
});

// ===========================================================================
// handleCompleteTask
// ===========================================================================

describe("handleCompleteTask", () => {
  it("marks the task as done and sets completedAt", async () => {
    const completedTask = { ...MOCK_CREATED_TASK, status: "done" as const, completedAt: new Date() };

    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(updateTask).mockResolvedValue(completedTask);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    const result = await handleCompleteTask(action);

    expect(result.success).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      MOCK_TASK_ID,
      expect.objectContaining({ status: "done" })
    );
  });

  it("returns error when user has no project access", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    const result = await handleCompleteTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("calls logActivity with task_completed type", async () => {
    const completedTask = { ...MOCK_CREATED_TASK, status: "done" as const };

    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(updateTask).mockResolvedValue(completedTask);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    await handleCompleteTask(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_completed" })
    );
  });

  it("returns error when taskId is missing", async () => {
    const action = mockPAAction({
      plannedPayload: {},
    });

    const result = await handleCompleteTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Task ID/i);
  });
});

// ===========================================================================
// handleDeleteTask
// ===========================================================================

describe("handleDeleteTask", () => {
  it("deletes the task and returns taskId and title on success", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(deleteTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    const result = await handleDeleteTask(action);

    expect(result.success).toBe(true);
    expect(result.result?.taskId).toBe(MOCK_TASK_ID);
    expect(deleteTask).toHaveBeenCalledWith(MOCK_TASK_ID);
  });

  it("returns error when user has no project access", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    const result = await handleDeleteTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("calls logActivity with task_deleted type after deletion", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(deleteTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    await handleDeleteTask(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_deleted" })
    );
  });

  it("returns error when taskId is absent from payload", async () => {
    const action = mockPAAction({ plannedPayload: {} });

    const result = await handleDeleteTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Task ID/i);
  });

  it("returns error when the task does not exist in the database", async () => {
    vi.mocked(getTask).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    const result = await handleDeleteTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ===========================================================================
// handleCreateComment
// ===========================================================================

describe("handleCreateComment", () => {
  it("creates the comment and returns commentId on success", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createTaskComment).mockResolvedValue(MOCK_COMMENT);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, content: "A test comment" },
    });

    const result = await handleCreateComment(action);

    expect(result.success).toBe(true);
    expect(result.result?.commentId).toBe("comment-001");
  });

  it("returns error when user has no project access", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, content: "A test comment" },
    });

    const result = await handleCreateComment(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("returns error when taskId or content is missing from payload", async () => {
    const actionMissingContent = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    const result = await handleCreateComment(actionMissingContent);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it("returns error when the task is not found", async () => {
    vi.mocked(getTask).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, content: "A test comment" },
    });

    const result = await handleCreateComment(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });
});

// ===========================================================================
// handlePostMessage
// ===========================================================================

describe("handlePostMessage", () => {
  it("posts the message and returns messageId on success", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createMessage).mockResolvedValue(MOCK_MESSAGE);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID, content: "All good here." },
    });

    const result = await handlePostMessage(action);

    expect(result.success).toBe(true);
    expect(result.result?.messageId).toBe("message-001");
  });

  it("returns error when user has no project access", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID, content: "All good here." },
    });

    const result = await handlePostMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("calls logActivity with message_posted type after posting", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(createMessage).mockResolvedValue(MOCK_MESSAGE);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID, content: "All good here." },
    });

    await handlePostMessage(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message_posted" })
    );
  });

  it("returns error when projectId or content is missing", async () => {
    const action = mockPAAction({
      plannedPayload: { projectId: MOCK_PROJECT_ID },
    });

    const result = await handlePostMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });
});

// ===========================================================================
// handleFlagBlocker
// ===========================================================================

describe("handleFlagBlocker", () => {
  it("sets isBlocked to true and returns taskId on success", async () => {
    const blockedTask = { ...MOCK_CREATED_TASK, isBlocked: true, blockedReason: "Flagged by PA" };

    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(updateTask).mockResolvedValue(blockedTask);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, reason: "Waiting for API access" },
    });

    const result = await handleFlagBlocker(action);

    expect(result.success).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      MOCK_TASK_ID,
      expect.objectContaining({ isBlocked: true })
    );
  });

  it("returns error when user has no project access", async () => {
    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID },
    });

    const result = await handleFlagBlocker(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("calls logActivity with blocker_flagged type", async () => {
    const blockedTask = { ...MOCK_CREATED_TASK, isBlocked: true };

    vi.mocked(getTask).mockResolvedValue(MOCK_CREATED_TASK);
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
    vi.mocked(updateTask).mockResolvedValue(blockedTask);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      plannedPayload: { taskId: MOCK_TASK_ID, reason: "External dependency" },
    });

    await handleFlagBlocker(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "blocker_flagged" })
    );
  });
});

// ===========================================================================
// handleCalendarBlock
// ===========================================================================

describe("handleCalendarBlock", () => {
  it("creates an event via Google Calendar when Google integration is active", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleCalendar.createEvent).mockResolvedValue(MOCK_CALENDAR_EVENT);

    const action = mockPAAction({
      plannedPayload: {
        title: "Focus Time",
        startTime: "2026-03-01T09:00:00Z",
        endTime: "2026-03-01T10:00:00Z",
      },
    });

    const result = await handleCalendarBlock(action);

    expect(result.success).toBe(true);
    expect(googleCalendar.createEvent).toHaveBeenCalled();
    expect(microsoftCalendar.createEvent).not.toHaveBeenCalled();
  });

  it("falls back to Microsoft Calendar when Google integration is absent", async () => {
    // First call (google) returns null, second call (microsoft) returns integration
    vi.mocked(getActiveIntegration)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ provider: "microsoft" } as any);
    vi.mocked(microsoftCalendar.createEvent).mockResolvedValue(MOCK_CALENDAR_EVENT);

    const action = mockPAAction({
      plannedPayload: {
        title: "Focus Time",
        startTime: "2026-03-01T09:00:00Z",
        endTime: "2026-03-01T10:00:00Z",
      },
    });

    const result = await handleCalendarBlock(action);

    expect(result.success).toBe(true);
    expect(microsoftCalendar.createEvent).toHaveBeenCalled();
    expect(googleCalendar.createEvent).not.toHaveBeenCalled();
  });

  it("returns error when no calendar integration is connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const action = mockPAAction({
      plannedPayload: {
        title: "Focus Time",
        startTime: "2026-03-01T09:00:00Z",
        endTime: "2026-03-01T10:00:00Z",
      },
    });

    const result = await handleCalendarBlock(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No calendar integration/i);
  });
});

// ===========================================================================
// handleCalendarEvent
// ===========================================================================

describe("handleCalendarEvent", () => {
  it("creates a calendar event with attendees via Google when integration is active", async () => {
    const eventWithAttendees = {
      ...MOCK_CALENDAR_EVENT,
      attendees: ["alice@example.com", "bob@example.com"],
    };

    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleCalendar.createEvent).mockResolvedValue(eventWithAttendees);

    const action = mockPAAction({
      plannedPayload: {
        title: "Team Standup",
        startTime: "2026-03-01T10:00:00Z",
        endTime: "2026-03-01T10:30:00Z",
        attendees: ["alice@example.com", "bob@example.com"],
        location: "Conference Room A",
      },
    });

    const result = await handleCalendarEvent(action);

    expect(result.success).toBe(true);
    expect(googleCalendar.createEvent).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      expect.objectContaining({
        attendees: ["alice@example.com", "bob@example.com"],
        location: "Conference Room A",
      })
    );
  });

  it("returns error when no calendar integration is connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const action = mockPAAction({
      plannedPayload: {
        title: "Meeting",
        startTime: "2026-03-01T10:00:00Z",
        endTime: "2026-03-01T10:30:00Z",
      },
    });

    const result = await handleCalendarEvent(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No calendar integration/i);
  });
});

// ===========================================================================
// handleCalendarReschedule
// ===========================================================================

describe("handleCalendarReschedule", () => {
  it("updates the event via Google Calendar when eventId is provided", async () => {
    const rescheduledEvent = {
      ...MOCK_CALENDAR_EVENT,
      id: "existing-event-id",
      startTime: "2026-03-02T09:00:00Z",
      endTime: "2026-03-02T10:00:00Z",
    };

    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleCalendar.updateEvent).mockResolvedValue(rescheduledEvent);

    const action = mockPAAction({
      plannedPayload: {
        eventId: "existing-event-id",
        startTime: "2026-03-02T09:00:00Z",
        endTime: "2026-03-02T10:00:00Z",
        newDate: "2026-03-02",
      },
    });

    const result = await handleCalendarReschedule(action);

    expect(result.success).toBe(true);
    expect(googleCalendar.updateEvent).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      "existing-event-id",
      expect.any(Object)
    );
  });

  it("returns error when eventId is missing from payload", async () => {
    const action = mockPAAction({
      plannedPayload: { startTime: "2026-03-02T09:00:00Z" },
    });

    const result = await handleCalendarReschedule(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Event ID/i);
  });

  it("returns error when no calendar integration is connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const action = mockPAAction({
      plannedPayload: { eventId: "existing-event-id" },
    });

    const result = await handleCalendarReschedule(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No calendar integration/i);
  });
});

// ===========================================================================
// handleSendEmail
// ===========================================================================

describe("handleSendEmail", () => {
  it("sends the email via Google Mail when Google integration is active", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleMail.sendEmail).mockResolvedValue({ messageId: "gmail-001" });

    const action = mockPAAction({
      plannedPayload: {
        to: "recipient@example.com",
        subject: "Hello",
        body: "Hello World",
      },
    });

    const result = await handleSendEmail(action);

    expect(result.success).toBe(true);
    expect(result.result?.messageId).toBe("gmail-001");
    expect(googleMail.sendEmail).toHaveBeenCalled();
    expect(microsoftMail.sendEmail).not.toHaveBeenCalled();
  });

  it("returns error when no email integration is connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const action = mockPAAction({
      plannedPayload: {
        to: "recipient@example.com",
        subject: "Hello",
        body: "Hello World",
      },
    });

    const result = await handleSendEmail(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No email integration/i);
  });

  it("returns error when required email fields are missing", async () => {
    const action = mockPAAction({
      plannedPayload: { to: "recipient@example.com" },
    });

    const result = await handleSendEmail(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires/i);
  });

  it("falls back to Microsoft Mail when Google integration is absent", async () => {
    vi.mocked(getActiveIntegration)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ provider: "microsoft" } as any);
    vi.mocked(microsoftMail.sendEmail).mockResolvedValue({ messageId: "outlook-001" });

    const action = mockPAAction({
      plannedPayload: {
        to: "recipient@example.com",
        subject: "Hello",
        body: "Hello World",
      },
    });

    const result = await handleSendEmail(action);

    expect(result.success).toBe(true);
    expect(microsoftMail.sendEmail).toHaveBeenCalled();
    expect(googleMail.sendEmail).not.toHaveBeenCalled();
  });
});

// ===========================================================================
// handleSendSlack
// ===========================================================================

describe("handleSendSlack", () => {
  it("sends a Slack message and returns ts and channel on success", async () => {
    vi.mocked(slack.sendMessage).mockResolvedValue({ ts: "1234567890.000001", channel: "C012AB3CD" });

    const action = mockPAAction({
      plannedPayload: {
        text: "Deployment complete!",
        channel: "C012AB3CD",
      },
    });

    const result = await handleSendSlack(action);

    expect(result.success).toBe(true);
    expect(result.result?.ts).toBe("1234567890.000001");
    expect(slack.sendMessage).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      expect.objectContaining({ text: "Deployment complete!" })
    );
  });

  it("returns error when text is missing from payload", async () => {
    const action = mockPAAction({
      plannedPayload: { channel: "C012AB3CD" },
    });

    const result = await handleSendSlack(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires text/i);
  });

  it("propagates Slack API errors as a failure result", async () => {
    vi.mocked(slack.sendMessage).mockRejectedValue(new Error("channel_not_found"));

    const action = mockPAAction({
      plannedPayload: { text: "Hello", channel: "INVALID" },
    });

    const result = await handleSendSlack(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/channel_not_found/i);
  });
});

// ===========================================================================
// handleGenerateReport
// ===========================================================================

describe("handleGenerateReport", () => {
  it("generates a report and returns a narrative string on success", async () => {
    vi.mocked(getTasks).mockResolvedValue({
      data: [mockTask()],
      nextCursor: null,
    });
    vi.mocked(getActivityFeed).mockResolvedValue({
      data: [],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(generateReport).mockResolvedValue({
      narrative: "The project is on track.",
      data: {} as any,
      generatedAt: "2026-02-28T00:00:00.000Z",
    });

    const action = mockPAAction({
      plannedPayload: { question: "What is the project status?" },
    });

    const result = await handleGenerateReport(action);

    expect(result.success).toBe(true);
    expect(result.result?.narrative).toBe("The project is on track.");
    expect(result.result?.generatedAt).toBeDefined();
    expect(generateReport).toHaveBeenCalled();
  });

  it("returns failure when the report generator throws an error", async () => {
    vi.mocked(getTasks).mockResolvedValue({ data: [], nextCursor: null });
    vi.mocked(getActivityFeed).mockResolvedValue({
      data: [],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(generateReport).mockRejectedValue(new Error("AI service unavailable"));

    const action = mockPAAction({
      plannedPayload: { question: "What is the status?" },
    });

    const result = await handleGenerateReport(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/AI service unavailable/i);
  });
});

// ===========================================================================
// handleQuery
// ===========================================================================

describe("handleQuery — check_tasks", () => {
  it("returns a list of tasks with count for check_tasks action type", async () => {
    vi.mocked(getTasks).mockResolvedValue({
      data: [mockTask(), mockTask({ id: "task-b" })],
      nextCursor: null,
    });

    const action = mockPAAction({
      actionType: "check_tasks",
      plannedPayload: { projectId: MOCK_PROJECT_ID },
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(true);
    expect(result.result?.count).toBe(2);
    expect(Array.isArray(result.result?.tasks)).toBe(true);
    expect(result.result?.tasks[0]).toHaveProperty("id");
    expect(result.result?.tasks[0]).toHaveProperty("status");
  });
});

describe("handleQuery — check_project_status", () => {
  it("returns project status metrics when a valid projectId is supplied", async () => {
    const mockProject = {
      id: MOCK_PROJECT_ID,
      orgId: MOCK_ORG_ID,
      name: "Test Project",
      status: "active",
      description: null,
      color: null,
      startDate: null,
      targetDate: null,
      createdBy: MOCK_USER_ID,
      defaultLayoutId: null,
      createdAt: new Date("2025-01-01T00:00:00Z"),
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    };

    // Mock the chained db.select().from().where().groupBy() pattern
    const mockGroupBy = vi.fn().mockResolvedValue([
      { status: "todo", count: 3 },
      { status: "done", count: 7 },
    ]);
    const mockWhere = vi.fn(() => ({ groupBy: mockGroupBy }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);
    vi.mocked(db.query.projects.findFirst).mockResolvedValue(mockProject as any);

    const action = mockPAAction({
      actionType: "check_project_status",
      plannedPayload: { projectId: MOCK_PROJECT_ID },
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(true);
    expect(result.result?.project.id).toBe(MOCK_PROJECT_ID);
    expect(result.result?.totalTasks).toBe(10);
    expect(result.result?.completedTasks).toBe(7);
    expect(result.result?.completionRate).toBe(70);
  });

  it("returns error when projectId is missing for check_project_status", async () => {
    const action = mockPAAction({
      actionType: "check_project_status",
      plannedPayload: {},
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/Project ID/i);
  });
});

describe("handleQuery — check_workload", () => {
  it("returns workload breakdown by assignee", async () => {
    const mockGroupBy = vi.fn().mockResolvedValue([
      { assigneeId: MOCK_USER_ID, count: 5 },
      { assigneeId: "user-b", count: 3 },
    ]);
    const mockWhere = vi.fn(() => ({ groupBy: mockGroupBy }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const action = mockPAAction({
      actionType: "check_workload",
      plannedPayload: {},
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(true);
    expect(Array.isArray(result.result?.workload)).toBe(true);
    expect(result.result?.workload[0]).toHaveProperty("userId");
    expect(result.result?.workload[0]).toHaveProperty("activeTasks");
  });
});

describe("handleQuery — check_calendar", () => {
  it("returns calendar events when a Google integration is active", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleCalendar.getEvents).mockResolvedValue([MOCK_CALENDAR_EVENT]);

    const action = mockPAAction({
      actionType: "check_calendar",
      plannedPayload: { date: "2026-03-01" },
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(true);
    expect(result.result?.count).toBe(1);
    expect(result.result?.events[0]).toHaveProperty("summary");
    expect(googleCalendar.getEvents).toHaveBeenCalled();
  });

  it("returns error when no calendar integration is connected for check_calendar", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const action = mockPAAction({
      actionType: "check_calendar",
      plannedPayload: {},
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No calendar integration/i);
  });
});

describe("handleQuery — unknown action type", () => {
  it("returns an error for an unrecognised query action type", async () => {
    const action = mockPAAction({
      actionType: "unknown_query_type" as any,
      plannedPayload: {},
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown query type/i);
  });
});
