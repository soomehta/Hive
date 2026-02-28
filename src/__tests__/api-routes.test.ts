import { vi, describe, it, expect, beforeEach } from "vitest";

// ─── Mocks (must be hoisted before any imports that use them) ────────────────

vi.mock("@/lib/auth/api-auth", () => {
  class AuthError extends Error {
    statusCode: number;
    constructor(message: string, statusCode: number) {
      super(message);
      this.name = "AuthError";
      this.statusCode = statusCode;
    }
  }
  return {
    authenticateRequest: vi.fn(),
    AuthError,
    authErrorResponse: vi.fn(),
  };
});

vi.mock("@/lib/auth/permissions", () => ({
  hasPermission: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/db/queries/tasks", () => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  getTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock("@/lib/db/queries/projects", () => ({
  getProjects: vi.fn(),
  getProject: vi.fn(),
  createProject: vi.fn(),
  isProjectMember: vi.fn(),
  isProjectLead: vi.fn(),
}));

vi.mock("@/lib/db/queries/messages", () => ({
  getMessages: vi.fn(),
  createMessage: vi.fn(),
}));

vi.mock("@/lib/db/queries/activity", () => ({
  logActivity: vi.fn(),
}));

vi.mock("@/lib/notifications/in-app", () => ({
  createNotification: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/utils/validation", async () => {
  const { z } = await import("zod/v4");
  return {
    // Use z.string() (not z.uuid()) so that test helper IDs like
    // "00000000-0000-0000-0000-000000000002" pass — those are synthetic,
    // non-RFC-4122 UUIDs. Strict UUID format is exercised in validation.test.ts.
    createTaskSchema: z.object({
      projectId: z.string().min(1),
      title: z.string().min(1).max(500),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      assigneeId: z.string().optional(),
      dueDate: z.string().optional(),
      estimatedMinutes: z.number().optional(),
      parentTaskId: z.string().optional(),
    }),
    updateTaskSchema: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      assigneeId: z.string().optional(),
      dueDate: z.string().optional(),
      isBlocked: z.boolean().optional(),
      blockedReason: z.string().optional(),
    }),
    // taskFiltersSchema uses z.string().min(1) for projectId so the synthetic
    // helper IDs pass through. The "invalid filter" test exercises the status
    // enum constraint instead, which is correct behavior either way.
    taskFiltersSchema: z.object({
      projectId: z.string().min(1).optional(),
      status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]).optional(),
    }),
    createProjectSchema: z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      color: z.string().optional(),
      startDate: z.string().optional(),
      targetDate: z.string().optional(),
      memberIds: z.array(z.string()).optional(),
    }),
    createMessageSchema: z.object({
      projectId: z.string().min(1),
      title: z.string().optional(),
      content: z.string().min(1).max(20000),
    }),
  };
});

// ─── Module imports (after mocks) ────────────────────────────────────────────

import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getTasks, createTask, getTask, updateTask, deleteTask } from "@/lib/db/queries/tasks";
import { getProjects, getProject, createProject, isProjectMember, isProjectLead } from "@/lib/db/queries/projects";
import { getMessages, createMessage } from "@/lib/db/queries/messages";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";

import { GET, POST } from "@/app/api/tasks/route";
import {
  GET as GET_TASK,
  PATCH as PATCH_TASK,
  DELETE as DELETE_TASK,
} from "@/app/api/tasks/[taskId]/route";
import { GET as GET_PROJECTS, POST as POST_PROJECT } from "@/app/api/projects/route";
import { GET as GET_MESSAGES, POST as POST_MESSAGE } from "@/app/api/messages/route";

import {
  MOCK_USER_ID,
  MOCK_ORG_ID,
  MOCK_PROJECT_ID,
  MOCK_TASK_ID,
  mockAuthResult,
  mockTask,
  mockProject,
  mockMessage,
  mockNextRequest,
} from "./helpers";

// ─── Shared helpers ──────────────────────────────────────────────────────────

const MOCK_ASSIGNEE_ID = "user-00000000-0000-0000-0000-000000000099";

function makeTaskParams(taskId = MOCK_TASK_ID) {
  return { params: Promise.resolve({ taskId }) };
}

// ─── GET /api/tasks ──────────────────────────────────────────────────────────

describe("GET /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns tasks on success", async () => {
    const tasks = [mockTask(), mockTask({ id: "00000000-0000-0000-0000-000000000099" })];
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getTasks).mockResolvedValue({ data: tasks, nextCursor: null });

    const req = mockNextRequest("GET", "/api/tasks");
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(body.nextCursor).toBeNull();
  });

  it("passes filters through to getTasks", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getTasks).mockResolvedValue({ data: [], nextCursor: null });

    const req = mockNextRequest(
      "GET",
      `/api/tasks?projectId=${MOCK_PROJECT_ID}&status=todo`
    );
    await GET(req);

    expect(getTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: MOCK_ORG_ID,
        projectId: MOCK_PROJECT_ID,
        status: "todo",
      })
    );
  });

  it("returns 401 when authenticateRequest throws AuthError", async () => {
    vi.mocked(authenticateRequest).mockRejectedValue(
      new AuthError("Unauthorized", 401)
    );

    const req = mockNextRequest("GET", "/api/tasks");
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });

  it("returns 400 for invalid filter values", async () => {
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());

    // "badstatus" is not a valid enum value for the status filter, so the
    // taskFiltersSchema.safeParse() fails and the handler returns 400.
    const req = mockNextRequest(
      "GET",
      "/api/tasks?status=badstatus"
    );
    const response = await GET(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
  });
});

// ─── POST /api/tasks ─────────────────────────────────────────────────────────

describe("POST /api/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getProject).mockResolvedValue(mockProject());
    vi.mocked(isProjectMember).mockResolvedValue(true);
    vi.mocked(isProjectLead).mockResolvedValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(createTask).mockResolvedValue(mockTask());
    vi.mocked(logActivity).mockResolvedValue(undefined as any);
    vi.mocked(createNotification).mockResolvedValue(undefined as any);
  });

  it("creates a task and returns 201 with task data", async () => {
    const req = mockNextRequest("POST", "/api/tasks", {
      body: { projectId: MOCK_PROJECT_ID, title: "New Task" },
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toBeDefined();
    expect(body.data.title).toBe("Test Task");
    expect(createTask).toHaveBeenCalledOnce();
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_created" })
    );
  });

  it("returns 400 when body is missing required title field", async () => {
    const req = mockNextRequest("POST", "/api/tasks", {
      body: { projectId: MOCK_PROJECT_ID },
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(createTask).not.toHaveBeenCalled();
  });

  it("returns 404 when project does not exist", async () => {
    vi.mocked(getProject).mockResolvedValue(undefined);

    const req = mockNextRequest("POST", "/api/tasks", {
      body: { projectId: MOCK_PROJECT_ID, title: "Task" },
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Project not found");
    expect(createTask).not.toHaveBeenCalled();
  });

  it("returns 403 when user lacks task:create permission", async () => {
    vi.mocked(hasPermission).mockReturnValue(false);

    const req = mockNextRequest("POST", "/api/tasks", {
      body: { projectId: MOCK_PROJECT_ID, title: "Task" },
    });
    const response = await POST(req);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Insufficient permissions");
    expect(createTask).not.toHaveBeenCalled();
  });

  it("notifies the assignee when they differ from the creator", async () => {
    const taskWithAssignee = mockTask({ assigneeId: MOCK_ASSIGNEE_ID });
    vi.mocked(createTask).mockResolvedValue(taskWithAssignee);

    const req = mockNextRequest("POST", "/api/tasks", {
      body: {
        projectId: MOCK_PROJECT_ID,
        title: "Assigned Task",
        assigneeId: MOCK_ASSIGNEE_ID,
      },
    });
    const response = await POST(req);

    expect(response.status).toBe(201);
    expect(createNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: MOCK_ASSIGNEE_ID,
        type: "task_assigned",
      })
    );
  });
});

// ─── GET /api/tasks/[taskId] ─────────────────────────────────────────────────

describe("GET /api/tasks/[taskId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getTask).mockResolvedValue(mockTask());
  });

  it("returns a single task on success", async () => {
    const req = mockNextRequest("GET", `/api/tasks/${MOCK_TASK_ID}`);
    const response = await GET_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.id).toBe(MOCK_TASK_ID);
    expect(getTask).toHaveBeenCalledWith(MOCK_TASK_ID);
  });

  it("returns 404 when getTask returns null", async () => {
    vi.mocked(getTask).mockResolvedValue(undefined as any);

    const req = mockNextRequest("GET", `/api/tasks/${MOCK_TASK_ID}`);
    const response = await GET_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });

  it("returns 404 when task belongs to a different org", async () => {
    vi.mocked(getTask).mockResolvedValue(
      mockTask({ orgId: "00000000-0000-0000-0000-000000000999" })
    );

    const req = mockNextRequest("GET", `/api/tasks/${MOCK_TASK_ID}`);
    const response = await GET_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Task not found");
  });
});

// ─── PATCH /api/tasks/[taskId] ───────────────────────────────────────────────

describe("PATCH /api/tasks/[taskId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getTask).mockResolvedValue(mockTask());
    vi.mocked(isProjectLead).mockResolvedValue(false);
    vi.mocked(isProjectMember).mockResolvedValue(true);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(updateTask).mockResolvedValue(mockTask({ title: "Updated Task" }));
    vi.mocked(logActivity).mockResolvedValue(undefined as any);
    vi.mocked(createNotification).mockResolvedValue(undefined as any);
  });

  it("updates fields and returns the updated task", async () => {
    const req = mockNextRequest("PATCH", `/api/tasks/${MOCK_TASK_ID}`, {
      body: { title: "Updated Task", priority: "high" },
    });
    const response = await PATCH_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(updateTask).toHaveBeenCalledWith(
      MOCK_TASK_ID,
      expect.objectContaining({ title: "Updated Task", priority: "high" })
    );
  });

  it("returns 403 when user is not owner, creator, or assignee", async () => {
    // hasPermission returns false (no edit_any) and the task has a different
    // creator and no assignee, so the user has no edit rights.
    vi.mocked(hasPermission).mockReturnValue(false);
    vi.mocked(getTask).mockResolvedValue(
      mockTask({ createdBy: MOCK_ASSIGNEE_ID, assigneeId: null })
    );

    const req = mockNextRequest("PATCH", `/api/tasks/${MOCK_TASK_ID}`, {
      body: { title: "Sneaky Edit" },
    });
    const response = await PATCH_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Insufficient permissions");
    expect(updateTask).not.toHaveBeenCalled();
  });

  it("logs task_completed activity when status changes to done", async () => {
    // Existing task is not yet done
    vi.mocked(getTask).mockResolvedValue(mockTask({ status: "in_progress" }));

    const req = mockNextRequest("PATCH", `/api/tasks/${MOCK_TASK_ID}`, {
      body: { status: "done" },
    });
    await PATCH_TASK(req, makeTaskParams());

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_completed" })
    );
  });

  it("logs blocker_flagged activity when isBlocked is set to true", async () => {
    // Existing task is not blocked
    vi.mocked(getTask).mockResolvedValue(mockTask({ isBlocked: false }));

    const req = mockNextRequest("PATCH", `/api/tasks/${MOCK_TASK_ID}`, {
      body: { isBlocked: true, blockedReason: "Waiting on design" },
    });
    await PATCH_TASK(req, makeTaskParams());

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "blocker_flagged" })
    );
  });
});

// ─── DELETE /api/tasks/[taskId] ──────────────────────────────────────────────

describe("DELETE /api/tasks/[taskId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getTask).mockResolvedValue(mockTask());
    vi.mocked(isProjectLead).mockResolvedValue(false);
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(logActivity).mockResolvedValue(undefined as any);
    vi.mocked(deleteTask).mockResolvedValue(mockTask() as any);
  });

  it("deletes task on success and returns the deleted record", async () => {
    const req = mockNextRequest("DELETE", `/api/tasks/${MOCK_TASK_ID}`);
    const response = await DELETE_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(deleteTask).toHaveBeenCalledWith(MOCK_TASK_ID);
    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({ type: "task_deleted" })
    );
  });

  it("returns 403 when user lacks task:delete permission", async () => {
    vi.mocked(hasPermission).mockReturnValue(false);

    const req = mockNextRequest("DELETE", `/api/tasks/${MOCK_TASK_ID}`);
    const response = await DELETE_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Insufficient permissions");
    expect(deleteTask).not.toHaveBeenCalled();
  });

  it("allows the task creator to delete their own task", async () => {
    // The auth user IS the creator (createdBy === MOCK_USER_ID by default).
    // hasPermission receives isCreator: true which grants the delete right.
    vi.mocked(hasPermission).mockImplementation(
      (_role: any, _action: any, ctx?: any) => {
        return Boolean(ctx?.isCreator);
      }
    );

    const req = mockNextRequest("DELETE", `/api/tasks/${MOCK_TASK_ID}`);
    const response = await DELETE_TASK(req, makeTaskParams());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toBeDefined();
    expect(deleteTask).toHaveBeenCalledWith(MOCK_TASK_ID);
  });
});

// ─── GET /api/projects ───────────────────────────────────────────────────────

describe("GET /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the full list of projects for the org", async () => {
    const projects = [mockProject(), mockProject({ id: "00000000-0000-0000-0000-000000000020" })];
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getProjects).mockResolvedValue(projects as any);

    const req = mockNextRequest("GET", "/api/projects");
    const response = await GET_PROJECTS(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(2);
    expect(getProjects).toHaveBeenCalledWith(MOCK_ORG_ID);
  });

  it("returns 401 when the request is unauthenticated", async () => {
    vi.mocked(authenticateRequest).mockRejectedValue(
      new AuthError("Unauthorized", 401)
    );

    const req = mockNextRequest("GET", "/api/projects");
    const response = await GET_PROJECTS(req);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("Unauthorized");
  });
});

// ─── POST /api/projects ──────────────────────────────────────────────────────

describe("POST /api/projects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(hasPermission).mockReturnValue(true);
    vi.mocked(createProject).mockResolvedValue(mockProject() as any);
    vi.mocked(logActivity).mockResolvedValue(undefined as any);
    vi.mocked(createNotification).mockResolvedValue(undefined as any);
  });

  it("creates a project and returns 201 with project data", async () => {
    const req = mockNextRequest("POST", "/api/projects", {
      body: { name: "My New Project" },
    });
    const response = await POST_PROJECT(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toBeDefined();
    expect(body.data.name).toBe("Test Project");
    expect(createProject).toHaveBeenCalledOnce();
  });

  it("returns 400 when project name is missing", async () => {
    const req = mockNextRequest("POST", "/api/projects", {
      body: { description: "No name provided" },
    });
    const response = await POST_PROJECT(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(createProject).not.toHaveBeenCalled();
  });

  it("logs project_created activity after successful creation", async () => {
    const req = mockNextRequest("POST", "/api/projects", {
      body: { name: "Activity Test Project" },
    });
    await POST_PROJECT(req);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "project_created",
        orgId: MOCK_ORG_ID,
        projectId: MOCK_PROJECT_ID,
      })
    );
  });
});

// ─── GET /api/messages ───────────────────────────────────────────────────────

describe("GET /api/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getProject).mockResolvedValue(mockProject());
    vi.mocked(getMessages).mockResolvedValue([mockMessage()] as any);
  });

  it("returns messages for a valid projectId query param", async () => {
    const req = mockNextRequest(
      "GET",
      `/api/messages?projectId=${MOCK_PROJECT_ID}`
    );
    const response = await GET_MESSAGES(req);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toHaveLength(1);
    expect(getMessages).toHaveBeenCalledWith(MOCK_PROJECT_ID);
  });

  it("returns 400 when projectId query param is absent", async () => {
    const req = mockNextRequest("GET", "/api/messages");
    const response = await GET_MESSAGES(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain("projectId");
    expect(getMessages).not.toHaveBeenCalled();
  });

  it("returns 404 when the project does not belong to the org", async () => {
    vi.mocked(getProject).mockResolvedValue(
      mockProject({ orgId: "00000000-0000-0000-0000-000000000999" })
    );

    const req = mockNextRequest(
      "GET",
      `/api/messages?projectId=${MOCK_PROJECT_ID}`
    );
    const response = await GET_MESSAGES(req);
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body.error).toBe("Project not found");
    expect(getMessages).not.toHaveBeenCalled();
  });
});

// ─── POST /api/messages ──────────────────────────────────────────────────────

describe("POST /api/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authenticateRequest).mockResolvedValue(mockAuthResult());
    vi.mocked(getProject).mockResolvedValue(mockProject());
    vi.mocked(createMessage).mockResolvedValue(mockMessage() as any);
    vi.mocked(logActivity).mockResolvedValue(undefined as any);
  });

  it("creates a message and returns 201 with message data", async () => {
    const req = mockNextRequest("POST", "/api/messages", {
      body: { projectId: MOCK_PROJECT_ID, content: "Hello team!" },
    });
    const response = await POST_MESSAGE(req);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data).toBeDefined();
    expect(body.data.content).toBe("Test content");
    expect(createMessage).toHaveBeenCalledOnce();
  });

  it("returns 400 when required content field is missing", async () => {
    const req = mockNextRequest("POST", "/api/messages", {
      body: { projectId: MOCK_PROJECT_ID },
    });
    const response = await POST_MESSAGE(req);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toBeDefined();
    expect(createMessage).not.toHaveBeenCalled();
  });

  it("logs message_posted activity after successful creation", async () => {
    const req = mockNextRequest("POST", "/api/messages", {
      body: { projectId: MOCK_PROJECT_ID, content: "Activity test message" },
    });
    await POST_MESSAGE(req);

    expect(logActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "message_posted",
        orgId: MOCK_ORG_ID,
        projectId: MOCK_PROJECT_ID,
      })
    );
  });
});
