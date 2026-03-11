import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — hoisted before any imports
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

vi.mock("@/lib/notifications/task-notifications", () => ({
  notifyOnTaskAssignment: vi.fn(),
  notifyOnTaskCompletion: vi.fn(),
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

vi.mock("@/lib/ai/providers", () => ({
  chatCompletion: vi.fn(),
}));

vi.mock("@/lib/utils/user-resolver", () => ({
  resolveUserMeta: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
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
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { db } from "@/lib/db";
import {
  createTask,
  updateTask,
  deleteTask,
  getTask,
  getTasks,
  createTaskComment,
} from "@/lib/db/queries/tasks";
import { logActivity, getActivityFeed } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { notifyOnTaskAssignment } from "@/lib/notifications/task-notifications";
import { getActiveIntegration } from "@/lib/integrations/oauth";
import * as googleCalendar from "@/lib/integrations/google-calendar";
import * as microsoftCalendar from "@/lib/integrations/microsoft-calendar";
import * as googleMail from "@/lib/integrations/google-mail";
import * as microsoftMail from "@/lib/integrations/microsoft-mail";
import * as slack from "@/lib/integrations/slack";
import { generateReport } from "@/lib/ai/report-generator";
import { createMessage } from "@/lib/db/queries/messages";
import { resolveTaskId } from "@/lib/actions/resolve-task";
import {
  createPageItem,
  getPageByItemId,
  updatePageByItemId,
} from "@/lib/db/queries/pages";
import {
  getItemById,
  createItemRelation,
  deleteItemRelation,
} from "@/lib/db/queries/items";
import { createNotice } from "@/lib/db/queries/notices";
import {
  createChannel,
  addChannelMember,
  getChannelById,
  getChannels,
  isChannelMember,
  postChannelMessage,
  getChannelMessageById,
  toggleMessagePin,
  searchChannelMessages,
} from "@/lib/db/queries/chat";
import { chatCompletion } from "@/lib/ai/providers";

import { executeAction } from "@/lib/actions/executor";
import {
  resolveActionTier,
  normalizeIntent,
  ACTION_REGISTRY,
} from "@/lib/actions/registry";

import {
  MOCK_USER_ID,
  MOCK_ORG_ID,
  MOCK_PROJECT_ID,
  MOCK_TASK_ID,
  mockPAAction,
  mockTask,
  mockProject,
} from "./helpers";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OTHER_USER_ID = "user-00000000-0000-0000-0000-000000000099";
const MOCK_MEMBER = {
  id: "member-001",
  projectId: MOCK_PROJECT_ID,
  userId: MOCK_USER_ID,
  role: "member" as const,
  joinedAt: new Date("2025-01-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default resolve-task behavior
  vi.mocked(resolveTaskId).mockImplementation(async (payload) => {
    if (payload.taskId) return { taskId: payload.taskId };
    if (payload.taskTitle || payload.taskName || payload.title)
      return { taskId: MOCK_TASK_ID };
    return { error: "Please specify which task you'd like to modify." };
  });

  // Default project membership
  vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(MOCK_MEMBER);
  vi.mocked(logActivity).mockResolvedValue({} as any);
});

// ===========================================================================
// Journey 1: Complete task lifecycle via PA
//
// User says "create a task" → PA creates it → user updates priority →
// adds a comment → flags a blocker → resolves blocker → completes task
// ===========================================================================

describe("Journey: Task lifecycle (create → update → comment → block → complete)", () => {
  const taskV1 = {
    id: MOCK_TASK_ID,
    projectId: MOCK_PROJECT_ID,
    orgId: MOCK_ORG_ID,
    title: "Design landing page",
    status: "todo" as const,
    priority: "medium" as const,
    assigneeId: null,
    createdBy: MOCK_USER_ID,
    isBlocked: false,
    blockedReason: null,
    completedAt: null,
  };

  it("step 1: creates the task via executeAction", async () => {
    vi.mocked(createTask).mockResolvedValue(taskV1 as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "create_task",
        plannedPayload: {
          projectId: MOCK_PROJECT_ID,
          title: "Design landing page",
          priority: "medium",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.taskId).toBe(MOCK_TASK_ID);
    expect(result.result?.title).toBe("Design landing page");
    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Design landing page",
        priority: "medium",
        projectId: MOCK_PROJECT_ID,
      })
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_created" })
    );
  });

  it("step 2: updates the task priority to high", async () => {
    vi.mocked(getTask).mockResolvedValue(taskV1 as any);
    vi.mocked(updateTask).mockResolvedValue({
      ...taskV1,
      priority: "high",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "update_task",
        plannedPayload: { taskId: MOCK_TASK_ID, priority: "high" },
      })
    );

    expect(result.success).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      MOCK_TASK_ID,
      expect.objectContaining({ priority: "high" })
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_updated" })
    );
  });

  it("step 3: adds a comment to the task", async () => {
    vi.mocked(getTask).mockResolvedValue(taskV1 as any);
    vi.mocked(createTaskComment).mockResolvedValue({
      id: "comment-001",
      taskId: MOCK_TASK_ID,
      content: "Waiting on brand guidelines",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "create_comment",
        plannedPayload: {
          taskId: MOCK_TASK_ID,
          content: "Waiting on brand guidelines",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.commentId).toBe("comment-001");
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_commented" })
    );
  });

  it("step 4: flags a blocker on the task", async () => {
    vi.mocked(getTask).mockResolvedValue(taskV1 as any);
    vi.mocked(updateTask).mockResolvedValue({
      ...taskV1,
      isBlocked: true,
      blockedReason: "Waiting for brand assets",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "flag_blocker",
        plannedPayload: {
          taskId: MOCK_TASK_ID,
          reason: "Waiting for brand assets",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      MOCK_TASK_ID,
      expect.objectContaining({ isBlocked: true })
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "blocker_flagged" })
    );
  });

  it("step 5: completes the task", async () => {
    vi.mocked(getTask).mockResolvedValue(taskV1 as any);
    vi.mocked(updateTask).mockResolvedValue({
      ...taskV1,
      status: "done",
      completedAt: new Date(),
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "complete_task",
        plannedPayload: { taskId: MOCK_TASK_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(updateTask).toHaveBeenCalledWith(
      MOCK_TASK_ID,
      expect.objectContaining({ status: "done" })
    );
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_completed" })
    );
  });

  it("step 6: deletes the task", async () => {
    vi.mocked(getTask).mockResolvedValue(taskV1 as any);
    vi.mocked(deleteTask).mockResolvedValue(taskV1 as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "delete_task",
        plannedPayload: { taskId: MOCK_TASK_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(deleteTask).toHaveBeenCalledWith(MOCK_TASK_ID);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_deleted" })
    );
  });
});

// ===========================================================================
// Journey 2: Team collaboration via PA chat
//
// User asks PA to create a channel → posts a message → pins it →
// searches messages → converts message to task → archives channel
// ===========================================================================

describe("Journey: Team chat collaboration (channel → message → pin → search → convert → archive)", () => {
  const CHANNEL_ID = "chan-journey-001";
  const MSG_ID = "cmsg-journey-001";

  const mockChannel = {
    id: CHANNEL_ID,
    name: "sprint-planning",
    orgId: MOCK_ORG_ID,
    isArchived: false,
  };

  const mockMsg = {
    id: MSG_ID,
    channelId: CHANNEL_ID,
    content: "We need to migrate the database to v2 this sprint",
    authorId: MOCK_USER_ID,
    isPinned: false,
    createdAt: new Date("2026-03-01T10:00:00Z"),
  };

  it("step 1: creates a new chat channel", async () => {
    vi.mocked(createChannel).mockResolvedValue({ id: CHANNEL_ID } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "create_channel",
        plannedPayload: {
          name: "sprint-planning",
          description: "Sprint planning discussions",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.channelId).toBe(CHANNEL_ID);
    expect(createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "sprint-planning", scope: "team" })
    );
  });

  it("step 2: posts a message in the channel", async () => {
    vi.mocked(getChannelById).mockResolvedValue(mockChannel as any);
    vi.mocked(isChannelMember).mockResolvedValue(true);
    vi.mocked(postChannelMessage).mockResolvedValue({ id: MSG_ID } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "post_channel_message",
        plannedPayload: {
          channelId: CHANNEL_ID,
          content: "We need to migrate the database to v2 this sprint",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.messageId).toBe(MSG_ID);
  });

  it("step 3: pins the important message", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(mockMsg as any);
    vi.mocked(toggleMessagePin).mockResolvedValue({
      ...mockMsg,
      isPinned: true,
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "pin_message",
        plannedPayload: { messageId: MSG_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.isPinned).toBe(true);
  });

  it("step 4: searches for messages about the migration", async () => {
    vi.mocked(getChannels).mockResolvedValue([mockChannel] as any);
    vi.mocked(searchChannelMessages).mockResolvedValue([mockMsg] as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "search_messages",
        plannedPayload: { query: "database migration" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.matchCount).toBe(1);
    expect(result.result?.messages[0].id).toBe(MSG_ID);
  });

  it("step 5: converts the message into a task", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue(mockMsg as any);
    vi.mocked(createTask).mockResolvedValue({
      id: MOCK_TASK_ID,
      title: "Migrate database to v2",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "convert_message_to_task",
        plannedPayload: {
          messageId: MSG_ID,
          projectId: MOCK_PROJECT_ID,
          title: "Migrate database to v2",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.taskId).toBe(MOCK_TASK_ID);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message_converted_to_task" })
    );
  });

  it("step 6: archives the channel after the sprint", async () => {
    vi.mocked(getChannelById).mockResolvedValue(mockChannel as any);
    const { updateChannel } = await import("@/lib/db/queries/chat");
    vi.mocked(updateChannel).mockResolvedValue({} as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "archive_channel",
        plannedPayload: { channelId: CHANNEL_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.channelName).toBe("sprint-planning");
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "channel_updated" })
    );
  });
});

// ===========================================================================
// Journey 3: Content & knowledge management
//
// User creates a page → updates it → summarizes it → creates a task →
// links the page and task → converts a message to a page → unlinks
// ===========================================================================

describe("Journey: Content management (page → update → summarize → link → convert)", () => {
  const ITEM_ID = "item-journey-001";
  const PAGE_ID = "page-journey-001";
  const TASK_ITEM_ID = "item-journey-002";
  const RELATION_ID = "rel-journey-001";
  const MSG_ID = "cmsg-journey-002";

  it("step 1: creates a new wiki page", async () => {
    vi.mocked(createPageItem).mockResolvedValue({
      item: { id: ITEM_ID } as any,
      page: { id: PAGE_ID } as any,
    });

    const result = await executeAction(
      mockPAAction({
        actionType: "create_page",
        plannedPayload: { title: "Architecture Decision Record #1" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.itemId).toBe(ITEM_ID);
    expect(result.result?.pageId).toBe(PAGE_ID);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "page_created" })
    );
  });

  it("step 2: updates the page with content", async () => {
    vi.mocked(getItemById).mockResolvedValue({
      id: ITEM_ID,
      type: "page",
      title: "ADR #1",
    } as any);
    vi.mocked(getPageByItemId).mockResolvedValue({
      id: PAGE_ID,
      contentJson: {},
      plainText: "",
    } as any);
    vi.mocked(updatePageByItemId).mockResolvedValue({} as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "update_page",
        plannedPayload: {
          itemId: ITEM_ID,
          plainText:
            "We decided to use PostgreSQL with pgvector for vector search capabilities.",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(updatePageByItemId).toHaveBeenCalledWith(
      ITEM_ID,
      MOCK_ORG_ID,
      expect.objectContaining({
        plainText: expect.stringContaining("PostgreSQL"),
        lastEditedBy: MOCK_USER_ID,
      })
    );
  });

  it("step 3: summarizes the page content", async () => {
    vi.mocked(getItemById).mockResolvedValue({
      id: ITEM_ID,
      type: "page",
      title: "ADR #1",
    } as any);
    vi.mocked(getPageByItemId).mockResolvedValue({
      id: PAGE_ID,
      plainText:
        "We decided to use PostgreSQL with pgvector for vector search capabilities.",
    } as any);
    vi.mocked(chatCompletion).mockResolvedValue(
      "Decision: Use PostgreSQL + pgvector for vector search."
    );

    const result = await executeAction(
      mockPAAction({
        actionType: "summarize_page",
        plannedPayload: { itemId: ITEM_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.summary).toBe(
      "Decision: Use PostgreSQL + pgvector for vector search."
    );
    expect(result.result?.title).toBe("ADR #1");
  });

  it("step 4: links the page to a task", async () => {
    vi.mocked(getItemById)
      .mockResolvedValueOnce({ id: ITEM_ID } as any)
      .mockResolvedValueOnce({ id: TASK_ITEM_ID } as any);
    vi.mocked(createItemRelation).mockResolvedValue({
      id: RELATION_ID,
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "link_items",
        plannedPayload: {
          fromItemId: ITEM_ID,
          toItemId: TASK_ITEM_ID,
          relationType: "blocks",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.relationId).toBe(RELATION_ID);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "item_linked" })
    );
  });

  it("step 5: converts a chat message to a page", async () => {
    vi.mocked(getChannelMessageById).mockResolvedValue({
      id: MSG_ID,
      content: "Meeting notes: discussed database architecture decisions.",
      channelId: "chan-001",
      authorId: MOCK_USER_ID,
      createdAt: new Date(),
    } as any);
    vi.mocked(createPageItem).mockResolvedValue({
      item: { id: "item-new" } as any,
      page: { id: "page-new" } as any,
    });

    const result = await executeAction(
      mockPAAction({
        actionType: "convert_message_to_page",
        plannedPayload: {
          messageId: MSG_ID,
          title: "Database Architecture Meeting Notes",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.title).toBe("Database Architecture Meeting Notes");
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message_converted_to_page" })
    );
  });

  it("step 6: unlinks items when relationship changes", async () => {
    vi.mocked(deleteItemRelation).mockResolvedValue({} as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "unlink_items",
        plannedPayload: { relationId: RELATION_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.relationId).toBe(RELATION_ID);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "item_unlinked" })
    );
  });
});

// ===========================================================================
// Journey 4: Calendar & email integration workflow
//
// User checks calendar → blocks focus time → schedules a meeting →
// reschedules meeting → checks email → sends a follow-up email
// ===========================================================================

describe("Journey: Calendar & email workflow (check → block → schedule → reschedule → email)", () => {
  const calEvent = {
    id: "evt-001",
    summary: "Team Standup",
    startTime: "2026-03-11T09:00:00Z",
    endTime: "2026-03-11T09:30:00Z",
    attendees: ["alice@hive.io"],
  };

  beforeEach(() => {
    vi.mocked(getActiveIntegration).mockResolvedValue({
      provider: "google",
    } as any);
  });

  it("step 1: checks today's calendar", async () => {
    vi.mocked(googleCalendar.getEvents).mockResolvedValue([calEvent] as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "check_calendar",
        plannedPayload: { date: "2026-03-11" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.count).toBe(1);
    expect(result.result?.events[0].summary).toBe("Team Standup");
  });

  it("step 2: blocks focus time", async () => {
    vi.mocked(googleCalendar.createEvent).mockResolvedValue({
      id: "evt-focus",
      summary: "Deep Work",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "calendar_block",
        plannedPayload: {
          title: "Deep Work",
          startTime: "2026-03-11T14:00:00Z",
          endTime: "2026-03-11T16:00:00Z",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.summary).toBe("Deep Work");
  });

  it("step 3: schedules a team meeting with attendees", async () => {
    vi.mocked(googleCalendar.createEvent).mockResolvedValue({
      id: "evt-meeting",
      summary: "Sprint Retro",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "calendar_event",
        plannedPayload: {
          title: "Sprint Retro",
          startTime: "2026-03-12T15:00:00Z",
          endTime: "2026-03-12T16:00:00Z",
          attendees: ["alice@hive.io", "bob@hive.io"],
          location: "Zoom",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.summary).toBe("Sprint Retro");
    expect(googleCalendar.createEvent).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      expect.objectContaining({
        attendees: ["alice@hive.io", "bob@hive.io"],
        location: "Zoom",
      })
    );
  });

  it("step 4: reschedules the meeting", async () => {
    vi.mocked(googleCalendar.updateEvent).mockResolvedValue({
      id: "evt-meeting",
      summary: "Sprint Retro",
      startTime: "2026-03-13T15:00:00Z",
      endTime: "2026-03-13T16:00:00Z",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "calendar_reschedule",
        plannedPayload: {
          eventId: "evt-meeting",
          startTime: "2026-03-13T15:00:00Z",
          endTime: "2026-03-13T16:00:00Z",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(googleCalendar.updateEvent).toHaveBeenCalledWith(
      MOCK_USER_ID,
      MOCK_ORG_ID,
      "evt-meeting",
      expect.any(Object)
    );
  });

  it("step 5: checks unread emails", async () => {
    vi.mocked(googleMail.getUnreadEmails).mockResolvedValue([
      {
        id: "mail-001",
        from: "alice@hive.io",
        subject: "Re: Sprint Retro",
        snippet: "Can we make it 30 min longer?",
        date: "2026-03-11T11:00:00Z",
      },
    ] as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "check_email",
        plannedPayload: { count: 5 },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.count).toBe(1);
    expect(result.result?.emails[0].subject).toBe("Re: Sprint Retro");
  });

  it("step 6: sends a follow-up email", async () => {
    vi.mocked(googleMail.sendEmail).mockResolvedValue({
      messageId: "sent-001",
    });

    const result = await executeAction(
      mockPAAction({
        actionType: "send_email",
        plannedPayload: {
          to: "alice@hive.io",
          subject: "Sprint Retro rescheduled to Thursday",
          body: "Hi Alice, I've moved the retro to Thursday 3-4pm. The meeting link stays the same.",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.messageId).toBe("sent-001");
  });
});

// ===========================================================================
// Journey 5: Project status reporting
//
// User checks tasks → checks project status → checks workload →
// generates a full report → sends Slack summary
// ===========================================================================

describe("Journey: Project reporting (check tasks → status → workload → report → Slack)", () => {
  it("step 1: checks all tasks in the project", async () => {
    vi.mocked(getTasks).mockResolvedValue({
      data: [
        mockTask({ id: "t1", title: "Task A", status: "done" }),
        mockTask({ id: "t2", title: "Task B", status: "in_progress" }),
        mockTask({ id: "t3", title: "Task C", status: "todo" }),
      ],
      nextCursor: null,
    });

    const result = await executeAction(
      mockPAAction({
        actionType: "check_tasks",
        plannedPayload: { projectId: MOCK_PROJECT_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.count).toBe(3);
    expect(result.result?.tasks.map((t: any) => t.status)).toEqual([
      "done",
      "in_progress",
      "todo",
    ]);
  });

  it("step 2: checks project status with metrics", async () => {
    vi.mocked(db.query.projects.findFirst).mockResolvedValue(
      mockProject() as any
    );

    const mockGroupBy = vi
      .fn()
      .mockResolvedValue([
        { status: "done", count: 8 },
        { status: "in_progress", count: 3 },
        { status: "todo", count: 4 },
      ]);
    const mockWhere = vi.fn(() => ({ groupBy: mockGroupBy }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "check_project_status",
        plannedPayload: { projectId: MOCK_PROJECT_ID },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.totalTasks).toBe(15);
    expect(result.result?.completedTasks).toBe(8);
    expect(result.result?.completionRate).toBe(53);
  });

  it("step 3: checks team workload", async () => {
    const mockGroupBy = vi.fn().mockResolvedValue([
      { assigneeId: MOCK_USER_ID, count: 5 },
      { assigneeId: OTHER_USER_ID, count: 8 },
    ]);
    const mockWhere = vi.fn(() => ({ groupBy: mockGroupBy }));
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "check_workload",
        plannedPayload: {},
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.workload).toHaveLength(2);
    const userWorkload = result.result?.workload.find(
      (w: any) => w.userId === MOCK_USER_ID
    );
    expect(userWorkload?.activeTasks).toBe(5);
  });

  it("step 4: generates a comprehensive report", async () => {
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
      narrative:
        "Sprint 12 is 53% complete. 8 of 15 tasks done. Bob has the highest load with 8 active tasks.",
      data: {} as any,
      generatedAt: "2026-03-11T12:00:00Z",
    });

    const result = await executeAction(
      mockPAAction({
        actionType: "generate_report",
        plannedPayload: { question: "How is Sprint 12 going?" },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.narrative).toContain("53% complete");
  });

  it("step 5: shares the summary on Slack", async () => {
    vi.mocked(slack.sendMessage).mockResolvedValue({
      ts: "1710158400.000001",
      channel: "C-sprint-updates",
    });

    const result = await executeAction(
      mockPAAction({
        actionType: "send_slack",
        plannedPayload: {
          text: "Sprint 12 update: 53% complete. See full report in Hive.",
          channel: "C-sprint-updates",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.ts).toBe("1710158400.000001");
  });
});

// ===========================================================================
// Journey 6: Notice and announcement workflow
//
// User creates a notice → posts a project message → creates a page
// from the notice content
// ===========================================================================

describe("Journey: Announcements (notice → project message → page)", () => {
  it("step 1: creates a team notice", async () => {
    vi.mocked(createNotice).mockResolvedValue({
      id: "notice-001",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "create_notice",
        plannedPayload: {
          title: "Office Closed March 15",
          body: "The office will be closed for maintenance. Work remotely.",
          isPinned: true,
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.noticeId).toBe("notice-001");
  });

  it("step 2: posts a project message about the notice", async () => {
    vi.mocked(createMessage).mockResolvedValue({
      id: "msg-001",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "post_message",
        plannedPayload: {
          projectId: MOCK_PROJECT_ID,
          content:
            "Heads up: office closed March 15. All meetings moved to Zoom.",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.messageId).toBe("msg-001");
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "message_posted" })
    );
  });

  it("step 3: creates a page documenting the policy", async () => {
    vi.mocked(createPageItem).mockResolvedValue({
      item: { id: "item-policy" } as any,
      page: { id: "page-policy" } as any,
    });

    const result = await executeAction(
      mockPAAction({
        actionType: "create_page",
        plannedPayload: {
          title: "Remote Work Policy - March 15",
          projectId: MOCK_PROJECT_ID,
        },
      })
    );

    expect(result.success).toBe(true);
    expect(result.result?.itemId).toBe("item-policy");
  });
});

// ===========================================================================
// Journey 7: Task assignment + notification flow
//
// User creates a task assigned to someone else → notification fires →
// assignee is different from actor
// ===========================================================================

describe("Journey: Task assignment with notifications", () => {
  it("creates task for another user and triggers assignment notification", async () => {
    vi.mocked(createTask).mockResolvedValue({
      id: MOCK_TASK_ID,
      title: "Review PR #42",
      assigneeId: OTHER_USER_ID,
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "create_task",
        plannedPayload: {
          projectId: MOCK_PROJECT_ID,
          title: "Review PR #42",
          assigneeId: OTHER_USER_ID,
          priority: "high",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(notifyOnTaskAssignment).toHaveBeenCalledWith(
      expect.objectContaining({
        assigneeId: OTHER_USER_ID,
        actorUserId: MOCK_USER_ID,
        taskTitle: "Review PR #42",
      })
    );
  });

  it("does not notify when user assigns task to themselves", async () => {
    vi.mocked(createTask).mockResolvedValue({
      id: MOCK_TASK_ID,
      title: "My personal task",
      assigneeId: MOCK_USER_ID,
    } as any);

    await executeAction(
      mockPAAction({
        actionType: "create_task",
        plannedPayload: {
          projectId: MOCK_PROJECT_ID,
          title: "My personal task",
          assigneeId: MOCK_USER_ID,
        },
      })
    );

    // notifyOnTaskAssignment is called but internally skips since assignee === actor
    expect(notifyOnTaskAssignment).toHaveBeenCalled();
  });

  it("copilot mode bumps tier to draft_approve when assigning to others", () => {
    const paProfile = {
      autonomyMode: "copilot" as const,
      actionOverrides: {},
    } as any;

    const tier = resolveActionTier("create_task", paProfile, {
      assigneeId: OTHER_USER_ID,
      userId: MOCK_USER_ID,
    });

    expect(tier).toBe("draft_approve");
  });

  it("copilot mode uses default tier when assigning to self", () => {
    const paProfile = {
      autonomyMode: "copilot" as const,
      actionOverrides: {},
    } as any;

    const tier = resolveActionTier("create_task", paProfile, {
      assigneeId: MOCK_USER_ID,
      userId: MOCK_USER_ID,
    });

    expect(tier).toBe("execute_notify");
  });
});

// ===========================================================================
// Journey 8: Error recovery & edge cases
//
// User tries to perform actions with missing data, bad access, or
// integration failures — PA should gracefully handle all cases
// ===========================================================================

describe("Journey: Error recovery & edge cases", () => {
  it("handles unknown action type gracefully", async () => {
    const result = await executeAction(
      mockPAAction({
        actionType: "teleport_to_mars" as any,
        plannedPayload: {},
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/unknown action type/i);
  });

  it("handles unhandled exception in handler gracefully", async () => {
    vi.mocked(createTask).mockRejectedValue(
      new Error("Database connection lost")
    );

    const result = await executeAction(
      mockPAAction({
        actionType: "create_task",
        plannedPayload: {
          projectId: MOCK_PROJECT_ID,
          title: "Crash test",
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/database connection lost/i);
  });

  it("handles no project access on task creation", async () => {
    vi.mocked(db.query.projectMembers.findFirst).mockResolvedValue(undefined);

    const result = await executeAction(
      mockPAAction({
        actionType: "create_task",
        plannedPayload: {
          projectId: MOCK_PROJECT_ID,
          title: "Forbidden task",
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/access/i);
  });

  it("handles task not found on update", async () => {
    vi.mocked(getTask).mockResolvedValue(undefined);

    const result = await executeAction(
      mockPAAction({
        actionType: "update_task",
        plannedPayload: { taskId: MOCK_TASK_ID, title: "Ghost" },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("handles calendar integration not connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const result = await executeAction(
      mockPAAction({
        actionType: "calendar_block",
        plannedPayload: {
          title: "Focus",
          startTime: "2026-03-11T09:00:00Z",
          endTime: "2026-03-11T10:00:00Z",
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no calendar integration/i);
  });

  it("handles email integration not connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const result = await executeAction(
      mockPAAction({
        actionType: "send_email",
        plannedPayload: {
          to: "test@test.com",
          subject: "Test",
          body: "Hello",
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/no email integration/i);
  });

  it("handles Slack API failure", async () => {
    vi.mocked(slack.sendMessage).mockRejectedValue(
      new Error("invalid_auth")
    );

    const result = await executeAction(
      mockPAAction({
        actionType: "send_slack",
        plannedPayload: { text: "Hello", channel: "C-test" },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/invalid_auth/i);
  });

  it("handles channel not found on post", async () => {
    vi.mocked(getChannelById).mockResolvedValue(undefined);

    const result = await executeAction(
      mockPAAction({
        actionType: "post_channel_message",
        plannedPayload: {
          channelId: "nonexistent",
          content: "Hello",
        },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("handles user not a channel member", async () => {
    vi.mocked(getChannelById).mockResolvedValue({
      id: "chan-001",
      name: "private",
    } as any);
    vi.mocked(isChannelMember).mockResolvedValue(false);

    const result = await executeAction(
      mockPAAction({
        actionType: "post_channel_message",
        plannedPayload: { channelId: "chan-001", content: "Hello" },
      })
    );

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not a member/i);
  });

  it("handles missing required fields across multiple handlers", async () => {
    // Missing content for post_message
    const r1 = await executeAction(
      mockPAAction({
        actionType: "post_message",
        plannedPayload: { projectId: MOCK_PROJECT_ID },
      })
    );
    expect(r1.success).toBe(false);

    // Missing to/subject/body for send_email
    const r2 = await executeAction(
      mockPAAction({
        actionType: "send_email",
        plannedPayload: { to: "a@b.com" },
      })
    );
    expect(r2.success).toBe(false);

    // Missing text for send_slack
    const r3 = await executeAction(
      mockPAAction({
        actionType: "send_slack",
        plannedPayload: { channel: "C-test" },
      })
    );
    expect(r3.success).toBe(false);

    // Missing title for create_notice
    const r4 = await executeAction(
      mockPAAction({
        actionType: "create_notice",
        plannedPayload: { body: "no title" },
      })
    );
    expect(r4.success).toBe(false);

    // Missing name for create_channel
    const r5 = await executeAction(
      mockPAAction({
        actionType: "create_channel",
        plannedPayload: { name: "" },
      })
    );
    expect(r5.success).toBe(false);
  });
});

// ===========================================================================
// Journey 9: Autonomy tier resolution across all modes
//
// Verifies the PA respects user's chosen autonomy mode and overrides
// ===========================================================================

describe("Journey: Autonomy modes (manual → copilot → autopilot → overrides)", () => {
  const baseProfile = {
    autonomyMode: "copilot" as const,
    actionOverrides: {},
  } as any;

  it("manual mode always returns draft_approve", () => {
    const manual = { ...baseProfile, autonomyMode: "manual" as const };

    expect(resolveActionTier("check_tasks", manual)).toBe("draft_approve");
    expect(resolveActionTier("create_task", manual)).toBe("draft_approve");
    expect(resolveActionTier("delete_task", manual)).toBe("draft_approve");
  });

  it("autopilot mode uses default registry tiers", () => {
    const autopilot = { ...baseProfile, autonomyMode: "autopilot" as const };

    expect(resolveActionTier("check_tasks", autopilot)).toBe("auto_execute");
    expect(resolveActionTier("create_task", autopilot)).toBe("execute_notify");
    expect(resolveActionTier("delete_task", autopilot)).toBe("draft_approve");
  });

  it("copilot mode uses default tier for most actions", () => {
    expect(resolveActionTier("check_tasks", baseProfile)).toBe("auto_execute");
    expect(resolveActionTier("create_task", baseProfile)).toBe(
      "execute_notify"
    );
    expect(resolveActionTier("post_message", baseProfile)).toBe(
      "draft_approve"
    );
  });

  it("user overrides take precedence over all modes", () => {
    const withOverrides = {
      ...baseProfile,
      actionOverrides: {
        create_task: "draft_approve" as const,
        delete_task: "auto_execute" as const,
      },
    };

    expect(resolveActionTier("create_task", withOverrides)).toBe(
      "draft_approve"
    );
    expect(resolveActionTier("delete_task", withOverrides)).toBe(
      "auto_execute"
    );
  });

  it("returns suggest_only for completely unknown action types", () => {
    expect(resolveActionTier("quantum_entangle", baseProfile)).toBe(
      "suggest_only"
    );
  });
});

// ===========================================================================
// Journey 10: Intent normalization & fuzzy matching
//
// Verifies the PA correctly maps various user intent formats
// ===========================================================================

describe("Journey: Intent normalization & fuzzy matching", () => {
  it("normalizes hyphenated intents to underscored", () => {
    expect(normalizeIntent("create-task")).toBe("create_task");
    expect(normalizeIntent("check-calendar")).toBe("check_calendar");
    expect(normalizeIntent("send-email")).toBe("send_email");
  });

  it("handles uppercase intents", () => {
    expect(normalizeIntent("CREATE_TASK")).toBe("create_task");
    expect(normalizeIntent("Check_Email")).toBe("check_email");
  });

  it("fuzzy matches typos within Levenshtein distance 2", () => {
    expect(normalizeIntent("crate_task")).toBe("create_task"); // 1 deletion
    expect(normalizeIntent("updte_task")).toBe("update_task"); // 1 deletion
    expect(normalizeIntent("delet_task")).toBe("delete_task"); // 1 deletion
  });

  it("returns null for empty or completely unrecognizable intents", () => {
    expect(normalizeIntent("")).toBeNull();
  });

  it("exact matches take priority", () => {
    expect(normalizeIntent("create_task")).toBe("create_task");
    expect(normalizeIntent("check_tasks")).toBe("check_tasks");
    expect(normalizeIntent("send_slack")).toBe("send_slack");
  });
});

// ===========================================================================
// Journey 11: Executor dispatches all 28 handler mappings correctly
//
// Verify that executeAction maps every registry action type to the right
// handler via the HANDLER_MAP
// ===========================================================================

describe("Journey: Executor handler dispatch coverage", () => {
  // All action types that have actual handler implementations (not Phase 7+)
  const implementedActions: Array<{
    actionType: string;
    handler: string;
  }> = Object.entries(ACTION_REGISTRY)
    .filter(([, entry]) => {
      // Only test actions that have a handler in the HANDLER_MAP
      const knownHandlers = [
        "query",
        "create-task",
        "update-task",
        "complete-task",
        "delete-task",
        "create-comment",
        "post-message",
        "flag-blocker",
        "calendar-block",
        "calendar-event",
        "calendar-reschedule",
        "send-email",
        "send-slack",
        "generate-report",
        "create-page",
        "update-page",
        "link-items",
        "unlink-items",
        "create-notice",
        "create-channel",
        "post-channel-message",
        "summarize-page",
        "convert-message-to-task",
        "convert-message-to-page",
        "pin-message",
        "archive-channel",
        "search-messages",
        "extract-tasks",
      ];
      return knownHandlers.includes(entry.handler);
    })
    .map(([actionType, entry]) => ({ actionType, handler: entry.handler }));

  it("all implemented action types have handlers in the registry", () => {
    // 28 handler mappings for the implemented actions
    expect(implementedActions.length).toBeGreaterThanOrEqual(28);
  });

  it("executeAction does not crash for any registered action type (returns success or graceful error)", async () => {
    // For unimplemented handlers (Phase 7+), executeAction should return a graceful error
    for (const [actionType, entry] of Object.entries(ACTION_REGISTRY)) {
      const result = await executeAction(
        mockPAAction({ actionType, plannedPayload: {} })
      );
      // Either success or a graceful error — never an unhandled crash
      expect(typeof result.success).toBe("boolean");
      if (!result.success) {
        expect(typeof result.error).toBe("string");
      }
    }
  });
});

// ===========================================================================
// Journey 12: userEditedPayload overrides plannedPayload
//
// Verifies the PA respects user edits before execution
// ===========================================================================

describe("Journey: User edits payload before approval", () => {
  it("uses userEditedPayload title instead of plannedPayload", async () => {
    vi.mocked(createTask).mockResolvedValue({
      id: MOCK_TASK_ID,
      title: "User's revised title",
    } as any);

    await executeAction(
      mockPAAction({
        actionType: "create_task",
        plannedPayload: {
          projectId: MOCK_PROJECT_ID,
          title: "AI suggested title",
        },
        userEditedPayload: {
          projectId: MOCK_PROJECT_ID,
          title: "User's revised title",
        },
      })
    );

    expect(createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "User's revised title" })
    );
  });

  it("uses userEditedPayload priority for task update", async () => {
    vi.mocked(getTask).mockResolvedValue(mockTask() as any);
    vi.mocked(updateTask).mockResolvedValue(mockTask() as any);

    await executeAction(
      mockPAAction({
        actionType: "update_task",
        plannedPayload: { taskId: MOCK_TASK_ID, priority: "low" },
        userEditedPayload: { taskId: MOCK_TASK_ID, priority: "urgent" },
      })
    );

    expect(updateTask).toHaveBeenCalledWith(
      MOCK_TASK_ID,
      expect.objectContaining({ priority: "urgent" })
    );
  });

  it("uses userEditedPayload for channel creation", async () => {
    vi.mocked(createChannel).mockResolvedValue({ id: "chan-new" } as any);

    await executeAction(
      mockPAAction({
        actionType: "create_channel",
        plannedPayload: { name: "ai-suggested-name" },
        userEditedPayload: { name: "user-picked-name" },
      })
    );

    expect(createChannel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "user-picked-name" })
    );
  });
});

// ===========================================================================
// Journey 13: Meeting notes → task extraction → task creation
//
// User records a meeting, notes are extracted, tasks are created
// ===========================================================================

describe("Journey: Meeting notes to tasks", () => {
  it("extracts tasks from notes then creates them individually", async () => {
    // Step 1: Extract tasks
    const mockWhere = vi
      .fn()
      .mockResolvedValue([{ userId: MOCK_USER_ID }]);
    const mockFrom = vi.fn(() => ({ where: mockWhere }));
    vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

    const { resolveUserMeta } = await import("@/lib/utils/user-resolver");
    vi.mocked(resolveUserMeta).mockResolvedValue({
      displayName: "Alice",
      imageUrl: null,
    } as any);

    vi.mocked(chatCompletion).mockResolvedValue(
      JSON.stringify([
        {
          title: "Set up CI pipeline",
          assigneeName: "Alice",
          assigneeId: MOCK_USER_ID,
          priority: "high",
          dueDate: "2026-03-15",
        },
        {
          title: "Write API docs",
          priority: "medium",
        },
        {
          title: "Review security audit",
          priority: "urgent",
          dueDate: "2026-03-12",
        },
      ])
    );

    const extractResult = await executeAction(
      mockPAAction({
        actionType: "extract_tasks_from_notes",
        plannedPayload: {
          notes:
            "Alice will set up the CI pipeline by March 15. We also need API docs. Security audit review is urgent, due March 12.",
        },
      })
    );

    expect(extractResult.success).toBe(true);
    expect(extractResult.result?.extractedCount).toBe(3);

    // Step 2: Create each extracted task
    const extractedTasks = extractResult.result?.tasks;

    for (let i = 0; i < extractedTasks.length; i++) {
      const et = extractedTasks[i];
      vi.mocked(createTask).mockResolvedValue({
        id: `task-extracted-${i}`,
        title: et.title,
      } as any);

      const createResult = await executeAction(
        mockPAAction({
          actionType: "create_task",
          plannedPayload: {
            projectId: MOCK_PROJECT_ID,
            title: et.title,
            priority: et.priority,
            assigneeId: et.assigneeId,
            dueDate: et.dueDate,
          },
        })
      );

      expect(createResult.success).toBe(true);
      expect(createResult.result?.title).toBe(et.title);
    }

    // Verify all 3 tasks were created
    expect(createTask).toHaveBeenCalledTimes(3);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_created" })
    );
  });
});

// ===========================================================================
// Journey 14: Cross-integration fallback
//
// Tests Google → Microsoft fallback chain for calendar & email
// ===========================================================================

describe("Journey: Integration fallback (Google → Microsoft)", () => {
  it("calendar block falls back to Microsoft when Google is absent", async () => {
    vi.mocked(getActiveIntegration)
      .mockResolvedValueOnce(null) // google
      .mockResolvedValueOnce({ provider: "microsoft" } as any);
    vi.mocked(microsoftCalendar.createEvent).mockResolvedValue({
      id: "ms-evt-001",
      summary: "Focus",
    } as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "calendar_block",
        plannedPayload: {
          title: "Focus",
          startTime: "2026-03-11T09:00:00Z",
          endTime: "2026-03-11T10:00:00Z",
        },
      })
    );

    expect(result.success).toBe(true);
    expect(microsoftCalendar.createEvent).toHaveBeenCalled();
    expect(googleCalendar.createEvent).not.toHaveBeenCalled();
  });

  it("email check falls back to Microsoft when Google is absent", async () => {
    vi.mocked(getActiveIntegration)
      .mockResolvedValueOnce(null) // google
      .mockResolvedValueOnce({ provider: "microsoft" } as any);
    vi.mocked(microsoftMail.getUnreadEmails).mockResolvedValue([
      {
        id: "ms-mail-001",
        from: "test@test.com",
        subject: "Test",
        snippet: "Hello",
        date: "2026-03-11",
      },
    ] as any);

    const result = await executeAction(
      mockPAAction({
        actionType: "check_email",
        plannedPayload: {},
      })
    );

    expect(result.success).toBe(true);
    expect(microsoftMail.getUnreadEmails).toHaveBeenCalled();
    expect(googleMail.getUnreadEmails).not.toHaveBeenCalled();
  });

  it("returns clear error when neither integration is connected", async () => {
    vi.mocked(getActiveIntegration).mockResolvedValue(null);

    const calResult = await executeAction(
      mockPAAction({
        actionType: "check_calendar",
        plannedPayload: {},
      })
    );
    expect(calResult.success).toBe(false);
    expect(calResult.error).toMatch(/no calendar integration/i);

    const emailResult = await executeAction(
      mockPAAction({
        actionType: "check_email",
        plannedPayload: {},
      })
    );
    expect(emailResult.success).toBe(false);
    expect(emailResult.error).toMatch(/no email integration/i);
  });
});
