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

vi.mock("@/lib/actions/resolve-task", () => ({
  resolveTaskId: vi.fn(),
}));

vi.mock("@/lib/db/queries/messages", () => ({
  createMessage: vi.fn(),
}));

vi.mock("@/lib/db/queries/pages", () => ({
  createPageItem: vi.fn(),
  getPageByItemId: vi.fn(),
  updatePageByItemId: vi.fn(),
}));

vi.mock("@/lib/db/queries/items", () => ({
  getItemById: vi.fn(),
  createItemRelation: vi.fn(),
  deleteItemRelation: vi.fn(),
}));

vi.mock("@/lib/db/queries/notices", () => ({
  createNotice: vi.fn(),
}));

vi.mock("@/lib/db/queries/chat", () => ({
  createChannel: vi.fn(),
  addChannelMember: vi.fn(),
  getChannelById: vi.fn(),
  getChannels: vi.fn(),
  updateChannel: vi.fn(),
  isChannelMember: vi.fn(),
  postChannelMessage: vi.fn(),
  getChannelMessageById: vi.fn(),
  toggleMessagePin: vi.fn(),
  searchChannelMessages: vi.fn(),
}));

vi.mock("@/lib/utils/user-resolver", () => ({
  resolveUserMeta: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
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

import { resolveTaskId } from "@/lib/actions/resolve-task";
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

// Phase 6 handlers
import { handleCreatePage } from "@/lib/actions/handlers/create-page";
import { handleUpdatePage } from "@/lib/actions/handlers/update-page";
import { handleLinkItems } from "@/lib/actions/handlers/link-items";
import { handleUnlinkItems } from "@/lib/actions/handlers/unlink-items";
import { handleCreateNotice } from "@/lib/actions/handlers/create-notice";
import { handleCreateChannel } from "@/lib/actions/handlers/create-channel";
import { handlePostChannelMessage } from "@/lib/actions/handlers/post-channel-message";
import { handleSummarizePage } from "@/lib/actions/handlers/summarize-page";
import { handleConvertMessageToTask } from "@/lib/actions/handlers/convert-message-to-task";
import { handleConvertMessageToPage } from "@/lib/actions/handlers/convert-message-to-page";
import { handlePinMessage } from "@/lib/actions/handlers/pin-message";
import { handleArchiveChannel } from "@/lib/actions/handlers/archive-channel";
import { handleSearchMessages } from "@/lib/actions/handlers/search-messages";
import { handleExtractTasks } from "@/lib/actions/handlers/extract-tasks";

// Phase 6 mocked dependencies
import { createPageItem, getPageByItemId, updatePageByItemId } from "@/lib/db/queries/pages";
import { getItemById, createItemRelation, deleteItemRelation } from "@/lib/db/queries/items";
import { createNotice } from "@/lib/db/queries/notices";
import { createChannel, addChannelMember, getChannelById, getChannels, updateChannel, isChannelMember, postChannelMessage, getChannelMessageById, toggleMessagePin, searchChannelMessages } from "@/lib/db/queries/chat";
import { chatCompletion } from "@/lib/ai/providers";

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
  // Default: resolveTaskId returns the taskId from payload (simulating successful resolution)
  vi.mocked(resolveTaskId).mockImplementation(async (payload) => {
    if (payload.taskId) return { taskId: payload.taskId };
    if (payload.taskTitle || payload.taskName || payload.title) return { taskId: MOCK_TASK_ID };
    return { error: "Please specify which task you'd like to modify." };
  });
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

  it("returns error when no task identifier is provided", async () => {
    vi.mocked(resolveTaskId).mockResolvedValue({ error: "Please specify which task you'd like to modify." });

    const action = mockPAAction({
      plannedPayload: { priority: "high" },
    });

    const result = await handleUpdateTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/specify/i);
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

  it("returns error when no task identifier is provided", async () => {
    vi.mocked(resolveTaskId).mockResolvedValue({ error: "Please specify which task you'd like to modify." });

    const action = mockPAAction({
      plannedPayload: {},
    });

    const result = await handleCompleteTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/specify/i);
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

  it("returns error when no task identifier is provided", async () => {
    vi.mocked(resolveTaskId).mockResolvedValue({ error: "Please specify which task you'd like to modify." });

    const action = mockPAAction({ plannedPayload: {} });

    const result = await handleDeleteTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/specify/i);
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
    expect(result.error).toMatch(/specify which project/i);
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

// ===========================================================================
// Phase 6 Handlers
// ===========================================================================

const MOCK_ITEM_ID = "item-00000000-0000-0000-0000-000000000001";
const MOCK_PAGE_ID = "page-00000000-0000-0000-0000-000000000001";
const MOCK_CHANNEL_ID = "chan-00000000-0000-0000-0000-000000000001";
const MOCK_RELATION_ID = "rel-00000000-0000-0000-0000-000000000001";
const MOCK_NOTICE_ID = "notice-00000000-0000-0000-0000-000000000001";
const MOCK_CHANNEL_MSG_ID = "cmsg-00000000-0000-0000-0000-000000000001";

// ===========================================================================
// handleCreatePage
// ===========================================================================

describe("handleCreatePage", () => {
  it("creates a page and returns itemId and pageId on success", async () => {
    vi.mocked(createPageItem).mockResolvedValue({
      item: { id: MOCK_ITEM_ID } as any,
      page: { id: MOCK_PAGE_ID } as any,
    });
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "create_page",
      plannedPayload: { title: "Sprint Retrospective Notes" },
    });

    const result = await handleCreatePage(action);

    expect(result.success).toBe(true);
    expect(result.result?.itemId).toBe(MOCK_ITEM_ID);
    expect(result.result?.pageId).toBe(MOCK_PAGE_ID);
    expect(createPageItem).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sprint Retrospective Notes", orgId: MOCK_ORG_ID })
    );
  });

  it("returns error when title is empty", async () => {
    const action = mockPAAction({
      actionType: "create_page",
      plannedPayload: { title: "" },
    });

    const result = await handleCreatePage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/title.*required/i);
  });

  it("logs activity with page_created type", async () => {
    vi.mocked(createPageItem).mockResolvedValue({
      item: { id: MOCK_ITEM_ID } as any,
      page: { id: MOCK_PAGE_ID } as any,
    });
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "create_page",
      plannedPayload: { title: "Test Page" },
    });

    await handleCreatePage(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "page_created" })
    );
  });
});

// ===========================================================================
// handleUpdatePage
// ===========================================================================

describe("handleUpdatePage", () => {
  it("updates the page content and returns itemId on success", async () => {
    vi.mocked(getItemById).mockResolvedValue({ id: MOCK_ITEM_ID, type: "page", title: "Test" } as any);
    vi.mocked(getPageByItemId).mockResolvedValue({ id: MOCK_PAGE_ID, contentJson: {}, plainText: "" } as any);
    vi.mocked(updatePageByItemId).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "update_page",
      plannedPayload: { itemId: MOCK_ITEM_ID, plainText: "Updated content" },
    });

    const result = await handleUpdatePage(action);

    expect(result.success).toBe(true);
    expect(result.result?.itemId).toBe(MOCK_ITEM_ID);
    expect(updatePageByItemId).toHaveBeenCalledWith(
      MOCK_ITEM_ID,
      MOCK_ORG_ID,
      expect.objectContaining({ plainText: "Updated content", lastEditedBy: MOCK_USER_ID })
    );
  });

  it("returns error when itemId is missing", async () => {
    const action = mockPAAction({
      actionType: "update_page",
      plannedPayload: { plainText: "content" },
    });

    const result = await handleUpdatePage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/itemId.*required/i);
  });

  it("returns error when page item is not found", async () => {
    vi.mocked(getItemById).mockResolvedValue(undefined);

    const action = mockPAAction({
      actionType: "update_page",
      plannedPayload: { itemId: MOCK_ITEM_ID },
    });

    const result = await handleUpdatePage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when item is not a page type", async () => {
    vi.mocked(getItemById).mockResolvedValue({ id: MOCK_ITEM_ID, type: "task" } as any);

    const action = mockPAAction({
      actionType: "update_page",
      plannedPayload: { itemId: MOCK_ITEM_ID },
    });

    const result = await handleUpdatePage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("logs activity with page_updated type", async () => {
    vi.mocked(getItemById).mockResolvedValue({ id: MOCK_ITEM_ID, type: "page", title: "T" } as any);
    vi.mocked(getPageByItemId).mockResolvedValue({ id: MOCK_PAGE_ID, contentJson: {}, plainText: "" } as any);
    vi.mocked(updatePageByItemId).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "update_page",
      plannedPayload: { itemId: MOCK_ITEM_ID, plainText: "new" },
    });

    await handleUpdatePage(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "page_updated" })
    );
  });
});

// ===========================================================================
// handleLinkItems
// ===========================================================================

describe("handleLinkItems", () => {
  const MOCK_TO_ITEM_ID = "item-00000000-0000-0000-0000-000000000002";

  it("creates a relation between two items on success", async () => {
    vi.mocked(getItemById)
      .mockResolvedValueOnce({ id: MOCK_ITEM_ID } as any)
      .mockResolvedValueOnce({ id: MOCK_TO_ITEM_ID } as any);
    vi.mocked(createItemRelation).mockResolvedValue({ id: MOCK_RELATION_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "link_items",
      plannedPayload: { fromItemId: MOCK_ITEM_ID, toItemId: MOCK_TO_ITEM_ID },
    });

    const result = await handleLinkItems(action);

    expect(result.success).toBe(true);
    expect(result.result?.relationId).toBe(MOCK_RELATION_ID);
    expect(createItemRelation).toHaveBeenCalledWith(
      expect.objectContaining({ relationType: "references" })
    );
  });

  it("returns error when fromItemId or toItemId is missing", async () => {
    const action = mockPAAction({
      actionType: "link_items",
      plannedPayload: { fromItemId: MOCK_ITEM_ID },
    });

    const result = await handleLinkItems(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it("returns error when one of the items is not found", async () => {
    vi.mocked(getItemById)
      .mockResolvedValueOnce({ id: MOCK_ITEM_ID } as any)
      .mockResolvedValueOnce(undefined);

    const action = mockPAAction({
      actionType: "link_items",
      plannedPayload: { fromItemId: MOCK_ITEM_ID, toItemId: MOCK_TO_ITEM_ID },
    });

    const result = await handleLinkItems(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("logs activity with item_linked type", async () => {
    vi.mocked(getItemById)
      .mockResolvedValueOnce({ id: MOCK_ITEM_ID } as any)
      .mockResolvedValueOnce({ id: MOCK_TO_ITEM_ID } as any);
    vi.mocked(createItemRelation).mockResolvedValue({ id: MOCK_RELATION_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "link_items",
      plannedPayload: { fromItemId: MOCK_ITEM_ID, toItemId: MOCK_TO_ITEM_ID },
    });

    await handleLinkItems(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "item_linked" })
    );
  });
});

// ===========================================================================
// handleUnlinkItems
// ===========================================================================

describe("handleUnlinkItems", () => {
  it("deletes the relation and returns relationId on success", async () => {
    vi.mocked(deleteItemRelation).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "unlink_items",
      plannedPayload: { relationId: MOCK_RELATION_ID },
    });

    const result = await handleUnlinkItems(action);

    expect(result.success).toBe(true);
    expect(result.result?.relationId).toBe(MOCK_RELATION_ID);
    expect(deleteItemRelation).toHaveBeenCalledWith(MOCK_RELATION_ID, MOCK_ORG_ID);
  });

  it("returns error when relationId is missing", async () => {
    const action = mockPAAction({
      actionType: "unlink_items",
      plannedPayload: {},
    });

    const result = await handleUnlinkItems(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/relationId.*required/i);
  });

  it("logs activity with item_unlinked type", async () => {
    vi.mocked(deleteItemRelation).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "unlink_items",
      plannedPayload: { relationId: MOCK_RELATION_ID },
    });

    await handleUnlinkItems(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "item_unlinked" })
    );
  });
});

// ===========================================================================
// handleCreateNotice
// ===========================================================================

describe("handleCreateNotice", () => {
  it("creates a notice and returns noticeId on success", async () => {
    vi.mocked(createNotice).mockResolvedValue({ id: MOCK_NOTICE_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "create_notice",
      plannedPayload: { title: "Sprint 12 Kickoff", body: "Sprint starts today!" },
    });

    const result = await handleCreateNotice(action);

    expect(result.success).toBe(true);
    expect(result.result?.noticeId).toBe(MOCK_NOTICE_ID);
    expect(createNotice).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Sprint 12 Kickoff", status: "active" })
    );
  });

  it("returns error when title is missing", async () => {
    const action = mockPAAction({
      actionType: "create_notice",
      plannedPayload: { body: "Some body" },
    });

    const result = await handleCreateNotice(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it("returns error when body is missing", async () => {
    const action = mockPAAction({
      actionType: "create_notice",
      plannedPayload: { title: "A Title" },
    });

    const result = await handleCreateNotice(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/required/i);
  });

  it("logs activity with notice_created type", async () => {
    vi.mocked(createNotice).mockResolvedValue({ id: MOCK_NOTICE_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "create_notice",
      plannedPayload: { title: "Heads up", body: "Deploy at 5pm" },
    });

    await handleCreateNotice(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "notice_created" })
    );
  });
});

// ===========================================================================
// handleCreateChannel
// ===========================================================================

describe("handleCreateChannel", () => {
  it("creates a channel and returns channelId (creator added as owner inside createChannel transaction)", async () => {
    vi.mocked(createChannel).mockResolvedValue({ id: MOCK_CHANNEL_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "create_channel",
      plannedPayload: { name: "backend-team", description: "Backend discussions" },
    });

    const result = await handleCreateChannel(action);

    expect(result.success).toBe(true);
    expect(result.result?.channelId).toBe(MOCK_CHANNEL_ID);
    expect(createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "backend-team", scope: "team" })
    );
  });

  it("sets scope to project when projectId is provided", async () => {
    vi.mocked(createChannel).mockResolvedValue({ id: MOCK_CHANNEL_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "create_channel",
      plannedPayload: { name: "project-chat", projectId: MOCK_PROJECT_ID },
    });

    await handleCreateChannel(action);

    expect(createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ scope: "project", projectId: MOCK_PROJECT_ID })
    );
  });

  it("returns error when channel name is empty", async () => {
    const action = mockPAAction({
      actionType: "create_channel",
      plannedPayload: { name: "" },
    });

    const result = await handleCreateChannel(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/name.*required/i);
  });

  it("logs activity with channel_created type", async () => {
    vi.mocked(createChannel).mockResolvedValue({ id: MOCK_CHANNEL_ID } as any);
    vi.mocked(addChannelMember).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "create_channel",
      plannedPayload: { name: "test-channel" },
    });

    await handleCreateChannel(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "channel_created" })
    );
  });
});

// ===========================================================================
// handlePostChannelMessage
// ===========================================================================

describe("handlePostChannelMessage", () => {
  it("posts a message in a channel and returns messageId on success", async () => {
    vi.mocked(getChannelById).mockResolvedValue({ id: MOCK_CHANNEL_ID, name: "general" } as any);
    vi.mocked(isChannelMember).mockResolvedValue(true);
    vi.mocked(postChannelMessage).mockResolvedValue({ id: MOCK_CHANNEL_MSG_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "post_channel_message",
      plannedPayload: { channelId: MOCK_CHANNEL_ID, content: "Hello team!" },
    });

    const result = await handlePostChannelMessage(action);

    expect(result.success).toBe(true);
    expect(result.result?.messageId).toBe(MOCK_CHANNEL_MSG_ID);
  });

  it("returns error when channelId is missing", async () => {
    const action = mockPAAction({
      actionType: "post_channel_message",
      plannedPayload: { content: "Hello" },
    });

    const result = await handlePostChannelMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/channelId.*required/i);
  });

  it("returns error when content is empty", async () => {
    const action = mockPAAction({
      actionType: "post_channel_message",
      plannedPayload: { channelId: MOCK_CHANNEL_ID, content: "" },
    });

    const result = await handlePostChannelMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/content.*required/i);
  });

  it("returns error when channel is not found", async () => {
    vi.mocked(getChannelById).mockResolvedValue(undefined);

    const action = mockPAAction({
      actionType: "post_channel_message",
      plannedPayload: { channelId: MOCK_CHANNEL_ID, content: "Hello" },
    });

    const result = await handlePostChannelMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when user is not a channel member", async () => {
    vi.mocked(getChannelById).mockResolvedValue({ id: MOCK_CHANNEL_ID, name: "general" } as any);
    vi.mocked(isChannelMember).mockResolvedValue(false);

    const action = mockPAAction({
      actionType: "post_channel_message",
      plannedPayload: { channelId: MOCK_CHANNEL_ID, content: "Hello" },
    });

    const result = await handlePostChannelMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not a member/i);
  });

  it("logs activity with channel_message_posted type", async () => {
    vi.mocked(getChannelById).mockResolvedValue({ id: MOCK_CHANNEL_ID, name: "general" } as any);
    vi.mocked(isChannelMember).mockResolvedValue(true);
    vi.mocked(postChannelMessage).mockResolvedValue({ id: MOCK_CHANNEL_MSG_ID } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "post_channel_message",
      plannedPayload: { channelId: MOCK_CHANNEL_ID, content: "Hey" },
    });

    await handlePostChannelMessage(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "channel_message_posted" })
    );
  });
});

// ===========================================================================
// handleSummarizePage
// ===========================================================================

describe("handleSummarizePage", () => {
  it("returns an AI-generated summary on success", async () => {
    vi.mocked(getItemById).mockResolvedValue({ id: MOCK_ITEM_ID, type: "page", title: "Design Doc" } as any);
    vi.mocked(getPageByItemId).mockResolvedValue({ id: MOCK_PAGE_ID, plainText: "This is a design document about the new API." } as any);
    vi.mocked(chatCompletion).mockResolvedValue("This document outlines the new API design.");

    const action = mockPAAction({
      actionType: "summarize_page",
      plannedPayload: { itemId: MOCK_ITEM_ID },
    });

    const result = await handleSummarizePage(action);

    expect(result.success).toBe(true);
    expect(result.result?.itemId).toBe(MOCK_ITEM_ID);
    expect(result.result?.title).toBe("Design Doc");
    expect(result.result?.summary).toBe("This document outlines the new API design.");
  });

  it("returns error when itemId is missing", async () => {
    const action = mockPAAction({
      actionType: "summarize_page",
      plannedPayload: {},
    });

    const result = await handleSummarizePage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/itemId.*required/i);
  });

  it("returns error when page is not found", async () => {
    vi.mocked(getItemById).mockResolvedValue(undefined);

    const action = mockPAAction({
      actionType: "summarize_page",
      plannedPayload: { itemId: MOCK_ITEM_ID },
    });

    const result = await handleSummarizePage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("falls back to text excerpt when AI call fails", async () => {
    vi.mocked(getItemById).mockResolvedValue({ id: MOCK_ITEM_ID, type: "page", title: "Notes" } as any);
    vi.mocked(getPageByItemId).mockResolvedValue({ id: MOCK_PAGE_ID, plainText: "Short content." } as any);
    vi.mocked(chatCompletion).mockRejectedValue(new Error("AI unavailable"));

    const action = mockPAAction({
      actionType: "summarize_page",
      plannedPayload: { itemId: MOCK_ITEM_ID },
    });

    const result = await handleSummarizePage(action);

    expect(result.success).toBe(true);
    expect(result.result?.summary).toBe("Short content.");
  });
});

// ===========================================================================
// handleConvertMessageToTask
// ===========================================================================

describe("handleConvertMessageToTask", () => {
  const MOCK_CHANNEL_MESSAGE = {
    id: MOCK_CHANNEL_MSG_ID,
    content: "We need to fix the login bug ASAP",
    channelId: MOCK_CHANNEL_ID,
    authorId: MOCK_USER_ID,
    createdAt: new Date("2025-01-01T00:00:00Z"),
  };

  it("converts a chat message to a task and returns taskId", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHANNEL_MESSAGE as any);
    vi.mocked(createTask).mockResolvedValue({ id: MOCK_TASK_ID, title: "Fix login bug" } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "convert_message_to_task",
      plannedPayload: {
        messageId: MOCK_CHANNEL_MSG_ID,
        projectId: MOCK_PROJECT_ID,
        title: "Fix login bug",
      },
    });

    const result = await handleConvertMessageToTask(action);

    expect(result.success).toBe(true);
    expect(result.result?.taskId).toBe(MOCK_TASK_ID);
    expect(result.result?.title).toBe("Fix login bug");
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        description: MOCK_CHANNEL_MESSAGE.content,
        priority: "medium",
      })
    );
  });

  it("uses first 100 chars of message as title when not provided", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHANNEL_MESSAGE as any);
    vi.mocked(createTask).mockResolvedValue({
      id: MOCK_TASK_ID,
      title: MOCK_CHANNEL_MESSAGE.content.slice(0, 100),
    } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "convert_message_to_task",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID, projectId: MOCK_PROJECT_ID },
    });

    const result = await handleConvertMessageToTask(action);

    expect(result.success).toBe(true);
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: MOCK_CHANNEL_MESSAGE.content.slice(0, 100) })
    );
  });

  it("returns error when messageId is missing", async () => {
    const action = mockPAAction({
      actionType: "convert_message_to_task",
      plannedPayload: { projectId: MOCK_PROJECT_ID },
    });

    const result = await handleConvertMessageToTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/messageId.*required/i);
  });

  it("returns error when message is not found", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(undefined);

    const action = mockPAAction({
      actionType: "convert_message_to_task",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID, projectId: MOCK_PROJECT_ID },
    });

    const result = await handleConvertMessageToTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when projectId is missing", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHANNEL_MESSAGE as any);

    const action = mockPAAction({
      actionType: "convert_message_to_task",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID },
    });

    const result = await handleConvertMessageToTask(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/projectId.*required/i);
  });

  it("logs activity with message_converted_to_task type", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHANNEL_MESSAGE as any);
    vi.mocked(createTask).mockResolvedValue({ id: MOCK_TASK_ID, title: "Fix bug" } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "convert_message_to_task",
      plannedPayload: {
        messageId: MOCK_CHANNEL_MSG_ID,
        projectId: MOCK_PROJECT_ID,
        title: "Fix bug",
      },
    });

    await handleConvertMessageToTask(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message_converted_to_task" })
    );
  });
});

// ===========================================================================
// handleConvertMessageToPage
// ===========================================================================

describe("handleConvertMessageToPage", () => {
  const MOCK_CHANNEL_MESSAGE = {
    id: MOCK_CHANNEL_MSG_ID,
    content: "Here are the meeting notes from today's standup",
    channelId: MOCK_CHANNEL_ID,
    authorId: MOCK_USER_ID,
    createdAt: new Date("2025-01-01T00:00:00Z"),
  };

  it("converts a chat message to a page and returns itemId and pageId", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHANNEL_MESSAGE as any);
    vi.mocked(createPageItem).mockResolvedValue({
      item: { id: MOCK_ITEM_ID } as any,
      page: { id: MOCK_PAGE_ID } as any,
    });
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "convert_message_to_page",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID, title: "Standup Notes" },
    });

    const result = await handleConvertMessageToPage(action);

    expect(result.success).toBe(true);
    expect(result.result?.itemId).toBe(MOCK_ITEM_ID);
    expect(result.result?.pageId).toBe(MOCK_PAGE_ID);
    expect(result.result?.title).toBe("Standup Notes");
  });

  it("returns error when messageId is missing", async () => {
    const action = mockPAAction({
      actionType: "convert_message_to_page",
      plannedPayload: { title: "Some Page" },
    });

    const result = await handleConvertMessageToPage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/messageId.*required/i);
  });

  it("returns error when message is not found", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(undefined);

    const action = mockPAAction({
      actionType: "convert_message_to_page",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID },
    });

    const result = await handleConvertMessageToPage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("logs activity with message_converted_to_page type", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHANNEL_MESSAGE as any);
    vi.mocked(createPageItem).mockResolvedValue({
      item: { id: MOCK_ITEM_ID } as any,
      page: { id: MOCK_PAGE_ID } as any,
    });
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "convert_message_to_page",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID },
    });

    await handleConvertMessageToPage(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message_converted_to_page" })
    );
  });
});

// ===========================================================================
// handlePinMessage
// ===========================================================================

describe("handlePinMessage", () => {
  const MOCK_CHAN_MSG = {
    id: MOCK_CHANNEL_MSG_ID,
    channelId: MOCK_CHANNEL_ID,
    content: "Important message",
    isPinned: false,
    authorId: MOCK_USER_ID,
    createdAt: new Date("2025-01-01T00:00:00Z"),
  };

  it("pins a message and returns isPinned true", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHAN_MSG as any);
    vi.mocked(toggleMessagePin).mockResolvedValue({ ...MOCK_CHAN_MSG, isPinned: true } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "pin_message",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID },
    });

    const result = await handlePinMessage(action);

    expect(result.success).toBe(true);
    expect(result.result?.messageId).toBe(MOCK_CHANNEL_MSG_ID);
    expect(result.result?.isPinned).toBe(true);
  });

  it("unpins an already-pinned message when isPinned is explicitly false", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue({ ...MOCK_CHAN_MSG, isPinned: true } as any);
    vi.mocked(toggleMessagePin).mockResolvedValue({ ...MOCK_CHAN_MSG, isPinned: false } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "pin_message",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID, isPinned: false },
    });

    const result = await handlePinMessage(action);

    expect(result.success).toBe(true);
    expect(result.result?.isPinned).toBe(false);
  });

  it("returns error when messageId is missing", async () => {
    const action = mockPAAction({
      actionType: "pin_message",
      plannedPayload: {},
    });

    const result = await handlePinMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/messageId.*required/i);
  });

  it("returns error when message is not found", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(undefined);

    const action = mockPAAction({
      actionType: "pin_message",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID },
    });

    const result = await handlePinMessage(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("logs activity with channel_message_edited type and pinned action", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(MOCK_CHAN_MSG as any);
    vi.mocked(toggleMessagePin).mockResolvedValue({ ...MOCK_CHAN_MSG, isPinned: true } as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "pin_message",
      plannedPayload: { messageId: MOCK_CHANNEL_MSG_ID },
    });

    await handlePinMessage(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "channel_message_edited",
        metadata: expect.objectContaining({ action: "pinned" }),
      })
    );
  });
});

// ===========================================================================
// handleArchiveChannel
// ===========================================================================

describe("handleArchiveChannel", () => {
  const MOCK_CHANNEL = {
    id: MOCK_CHANNEL_ID,
    name: "old-channel",
    isArchived: false,
    orgId: MOCK_ORG_ID,
  };

  it("archives a channel by channelId and returns channelName", async () => {
    vi.mocked(getChannelById).mockResolvedValue(MOCK_CHANNEL as any);
    vi.mocked(updateChannel).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "archive_channel",
      plannedPayload: { channelId: MOCK_CHANNEL_ID },
    });

    const result = await handleArchiveChannel(action);

    expect(result.success).toBe(true);
    expect(result.result?.channelId).toBe(MOCK_CHANNEL_ID);
    expect(result.result?.channelName).toBe("old-channel");
    expect(updateChannel).toHaveBeenCalledWith(MOCK_ORG_ID, MOCK_CHANNEL_ID, { isArchived: true });
  });

  it("resolves channel by name when channelId is not provided", async () => {
    vi.mocked(getChannels).mockResolvedValue([MOCK_CHANNEL] as any);
    vi.mocked(getChannelById).mockResolvedValue(MOCK_CHANNEL as any);
    vi.mocked(updateChannel).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "archive_channel",
      plannedPayload: { channelName: "old-channel" },
    });

    const result = await handleArchiveChannel(action);

    expect(result.success).toBe(true);
    expect(result.result?.channelName).toBe("old-channel");
  });

  it("returns error when neither channelId nor channelName is provided", async () => {
    const action = mockPAAction({
      actionType: "archive_channel",
      plannedPayload: {},
    });

    const result = await handleArchiveChannel(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/channelId.*channelName.*required/i);
  });

  it("returns error when channel is not found", async () => {
    vi.mocked(getChannelById).mockResolvedValue(undefined);

    const action = mockPAAction({
      actionType: "archive_channel",
      plannedPayload: { channelId: MOCK_CHANNEL_ID },
    });

    const result = await handleArchiveChannel(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("logs activity with channel_updated type and archived action", async () => {
    vi.mocked(getChannelById).mockResolvedValue(MOCK_CHANNEL as any);
    vi.mocked(updateChannel).mockResolvedValue({} as any);
    vi.mocked(logActivity).mockResolvedValue({} as any);

    const action = mockPAAction({
      actionType: "archive_channel",
      plannedPayload: { channelId: MOCK_CHANNEL_ID },
    });

    await handleArchiveChannel(action);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "channel_updated",
        metadata: expect.objectContaining({ action: "archived" }),
      })
    );
  });
});

// ===========================================================================
// handleSearchMessages
// ===========================================================================

describe("handleSearchMessages", () => {
  const MOCK_SEARCH_RESULTS = [
    {
      id: "msg-1",
      content: "We discussed the API design in this message",
      channelId: MOCK_CHANNEL_ID,
      authorId: MOCK_USER_ID,
      createdAt: new Date("2025-01-01T00:00:00Z"),
    },
    {
      id: "msg-2",
      content: "The API endpoint needs pagination support",
      channelId: MOCK_CHANNEL_ID,
      authorId: "user-other",
      createdAt: new Date("2025-01-02T00:00:00Z"),
    },
  ];

  it("returns matching messages for a search query across all channels", async () => {
    vi.mocked(getChannels).mockResolvedValue([{ id: MOCK_CHANNEL_ID, name: "general" }] as any);
    vi.mocked(searchChannelMessages).mockResolvedValue(MOCK_SEARCH_RESULTS as any);

    const action = mockPAAction({
      actionType: "search_messages",
      plannedPayload: { query: "API design" },
    });

    const result = await handleSearchMessages(action);

    expect(result.success).toBe(true);
    expect(result.result?.query).toBe("API design");
    expect(result.result?.matchCount).toBe(2);
    expect(result.result?.messages).toHaveLength(2);
    expect(result.result?.messages[0]).toHaveProperty("id");
    expect(result.result?.messages[0]).toHaveProperty("content");
  });

  it("searches within a specific channel by channelId", async () => {
    vi.mocked(searchChannelMessages).mockResolvedValue(MOCK_SEARCH_RESULTS as any);

    const action = mockPAAction({
      actionType: "search_messages",
      plannedPayload: { query: "API", channelId: MOCK_CHANNEL_ID },
    });

    const result = await handleSearchMessages(action);

    expect(result.success).toBe(true);
    expect(searchChannelMessages).toHaveBeenCalledWith(
      MOCK_ORG_ID,
      [MOCK_CHANNEL_ID],
      "API",
      20
    );
  });

  it("resolves channel by name when channelName is provided", async () => {
    vi.mocked(getChannels).mockResolvedValue([{ id: MOCK_CHANNEL_ID, name: "backend" }] as any);
    vi.mocked(searchChannelMessages).mockResolvedValue([] as any);

    const action = mockPAAction({
      actionType: "search_messages",
      plannedPayload: { query: "deploy", channelName: "backend" },
    });

    const result = await handleSearchMessages(action);

    expect(result.success).toBe(true);
    expect(searchChannelMessages).toHaveBeenCalledWith(
      MOCK_ORG_ID,
      [MOCK_CHANNEL_ID],
      "deploy",
      20
    );
  });

  it("returns error when query is missing", async () => {
    const action = mockPAAction({
      actionType: "search_messages",
      plannedPayload: {},
    });

    const result = await handleSearchMessages(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/query.*required/i);
  });

  it("returns empty results when no messages match", async () => {
    vi.mocked(getChannels).mockResolvedValue([{ id: MOCK_CHANNEL_ID, name: "general" }] as any);
    vi.mocked(searchChannelMessages).mockResolvedValue([] as any);

    const action = mockPAAction({
      actionType: "search_messages",
      plannedPayload: { query: "nonexistent topic" },
    });

    const result = await handleSearchMessages(action);

    expect(result.success).toBe(true);
    expect(result.result?.matchCount).toBe(0);
    expect(result.result?.messages).toHaveLength(0);
  });

  it("truncates message content to 200 characters", async () => {
    const longContent = "A".repeat(300);
    vi.mocked(getChannels).mockResolvedValue([{ id: MOCK_CHANNEL_ID, name: "general" }] as any);
    vi.mocked(searchChannelMessages).mockResolvedValue([
      { id: "msg-long", content: longContent, channelId: MOCK_CHANNEL_ID, authorId: MOCK_USER_ID, createdAt: new Date() },
    ] as any);

    const action = mockPAAction({
      actionType: "search_messages",
      plannedPayload: { query: "test" },
    });

    const result = await handleSearchMessages(action);

    expect(result.success).toBe(true);
    expect(result.result?.messages[0].content).toHaveLength(200);
  });
});

// ===========================================================================
// handleExtractTasks
// ===========================================================================

describe("handleExtractTasks", () => {
  function setupDbSelectForExtract() {
    // db.select().from(organizationMembers).where() returns an array of {userId}
    const mockWhere = vi.fn().mockResolvedValue([{ userId: MOCK_USER_ID }]);
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);
  }

  it("extracts tasks from meeting notes and returns structured results", async () => {
    setupDbSelectForExtract();
    const { resolveUserMeta } = await import("@/lib/utils/user-resolver");
    vi.mocked(resolveUserMeta).mockResolvedValue({ displayName: "Test User", imageUrl: null } as any);

    vi.mocked(chatCompletion).mockResolvedValue(JSON.stringify([
      { title: "Fix login bug", priority: "high", assigneeName: "Alice" },
      { title: "Update docs", priority: "medium" },
    ]));

    const action = mockPAAction({
      actionType: "extract_tasks_from_notes",
      plannedPayload: {
        notes: "Alice needs to fix the login bug ASAP. We also need to update the documentation.",
      },
    });

    const result = await handleExtractTasks(action);

    expect(result.success).toBe(true);
    expect(result.result?.extractedCount).toBe(2);
    expect(result.result?.tasks).toHaveLength(2);
    expect(result.result?.tasks[0].title).toBe("Fix login bug");
  });

  it("handles AI response wrapped in markdown code blocks", async () => {
    setupDbSelectForExtract();
    const { resolveUserMeta } = await import("@/lib/utils/user-resolver");
    vi.mocked(resolveUserMeta).mockResolvedValue({ displayName: "Test User", imageUrl: null } as any);

    vi.mocked(chatCompletion).mockResolvedValue(
      '```json\n[{"title": "Deploy staging", "priority": "high"}]\n```'
    );

    const action = mockPAAction({
      actionType: "extract_tasks_from_notes",
      plannedPayload: { notes: "We need to deploy to staging as soon as possible." },
    });

    const result = await handleExtractTasks(action);

    expect(result.success).toBe(true);
    expect(result.result?.extractedCount).toBe(1);
    expect(result.result?.tasks[0].title).toBe("Deploy staging");
  });

  it("returns error when notes are too short (less than 10 chars)", async () => {
    const action = mockPAAction({
      actionType: "extract_tasks_from_notes",
      plannedPayload: { notes: "short" },
    });

    const result = await handleExtractTasks(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too short/i);
  });

  it("returns error when notes are empty", async () => {
    const action = mockPAAction({
      actionType: "extract_tasks_from_notes",
      plannedPayload: {},
    });

    const result = await handleExtractTasks(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/too short/i);
  });

  it("returns error when AI response cannot be parsed as JSON", async () => {
    setupDbSelectForExtract();
    const { resolveUserMeta } = await import("@/lib/utils/user-resolver");
    vi.mocked(resolveUserMeta).mockResolvedValue({ displayName: "Test User", imageUrl: null } as any);

    vi.mocked(chatCompletion).mockResolvedValue("Sorry, I cannot parse this content.");

    const action = mockPAAction({
      actionType: "extract_tasks_from_notes",
      plannedPayload: { notes: "This is a long meeting note with various discussion points." },
    });

    const result = await handleExtractTasks(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/failed to extract/i);
  });

  it("caps extracted tasks at 20", async () => {
    setupDbSelectForExtract();
    const { resolveUserMeta } = await import("@/lib/utils/user-resolver");
    vi.mocked(resolveUserMeta).mockResolvedValue({ displayName: "Test User", imageUrl: null } as any);

    const manyTasks = Array.from({ length: 25 }, (_, i) => ({
      title: `Task ${i + 1}`,
      priority: "medium",
    }));
    vi.mocked(chatCompletion).mockResolvedValue(JSON.stringify(manyTasks));

    const action = mockPAAction({
      actionType: "extract_tasks_from_notes",
      plannedPayload: { notes: "Very long meeting notes with many action items discussed by the team." },
    });

    const result = await handleExtractTasks(action);

    expect(result.success).toBe(true);
    expect(result.result?.extractedCount).toBe(20);
    expect(result.result?.tasks).toHaveLength(20);
  });

  it("uses content field as fallback when notes field is absent", async () => {
    setupDbSelectForExtract();
    const { resolveUserMeta } = await import("@/lib/utils/user-resolver");
    vi.mocked(resolveUserMeta).mockResolvedValue({ displayName: "Test User", imageUrl: null } as any);

    vi.mocked(chatCompletion).mockResolvedValue(JSON.stringify([
      { title: "Review PR", priority: "medium" },
    ]));

    const action = mockPAAction({
      actionType: "extract_tasks_from_notes",
      plannedPayload: { content: "We need to review the pull request from the team before end of day." },
    });

    const result = await handleExtractTasks(action);

    expect(result.success).toBe(true);
    expect(result.result?.extractedCount).toBe(1);
  });
});

// ===========================================================================
// handleQuery — check_email
// ===========================================================================

describe("handleQuery — check_email", () => {
  const MOCK_EMAILS = [
    {
      id: "email-1",
      from: "alice@example.com",
      subject: "Sprint Update",
      snippet: "Here's the latest sprint update...",
      date: "2026-03-01T10:00:00Z",
    },
    {
      id: "email-2",
      from: "bob@example.com",
      subject: "Meeting Notes",
      snippet: "Notes from today's standup...",
      date: "2026-03-01T11:00:00Z",
    },
  ];

  it("returns unread emails via Google Mail when Google integration is active", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleMail.getUnreadEmails).mockResolvedValue(MOCK_EMAILS as any);

    const action = mockPAAction({
      actionType: "check_email",
      plannedPayload: {},
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(true);
    expect(result.result?.count).toBe(2);
    expect(result.result?.emails[0]).toHaveProperty("from");
    expect(result.result?.emails[0]).toHaveProperty("subject");
    expect(googleMail.getUnreadEmails).toHaveBeenCalled();
  });

  it("falls back to Microsoft Mail when Google integration is absent", async () => {
    vi.mocked(getActiveIntegration)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ provider: "microsoft" } as any);
    vi.mocked(microsoftMail.getUnreadEmails).mockResolvedValue(MOCK_EMAILS as any);

    const action = mockPAAction({
      actionType: "check_email",
      plannedPayload: { count: 5 },
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(true);
    expect(result.result?.count).toBe(2);
    expect(microsoftMail.getUnreadEmails).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      expect.objectContaining({ maxResults: 5 })
    );
  });

  it("returns error when no email integration is connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const action = mockPAAction({
      actionType: "check_email",
      plannedPayload: {},
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/No email integration/i);
  });

  it("passes query filter to the email provider", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleMail.getUnreadEmails).mockResolvedValue([] as any);

    const action = mockPAAction({
      actionType: "check_email",
      plannedPayload: { query: "from:alice@example.com", count: 3 },
    });

    const result = await handleQuery(action);

    expect(result.success).toBe(true);
    expect(googleMail.getUnreadEmails).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      expect.objectContaining({ maxResults: 3, query: "from:alice@example.com" })
    );
  });

  it("defaults to 10 emails when count is not specified", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue({ provider: "google" } as any);
    vi.mocked(googleMail.getUnreadEmails).mockResolvedValue([] as any);

    const action = mockPAAction({
      actionType: "check_email",
      plannedPayload: {},
    });

    await handleQuery(action);

    expect(googleMail.getUnreadEmails).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      expect.objectContaining({ maxResults: 10 })
    );
  });
});
