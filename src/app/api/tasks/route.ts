import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createTaskSchema, taskFiltersSchema } from "@/lib/utils/validation";
import { getTasks, createTask } from "@/lib/db/queries/tasks";
import { getProject, isProjectMember, isProjectLead } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { createLogger } from "@/lib/logger";

const log = createLogger("tasks");

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = taskFiltersSchema.safeParse(searchParams);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await getTasks({
      orgId: auth.orgId,
      ...parsed.data,
    });

    return Response.json({ data: result.data, nextCursor: result.nextCursor });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/tasks error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const body = await req.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Verify project belongs to this org
    const project = await getProject(parsed.data.projectId);
    if (!project || project.orgId !== auth.orgId) {
      return Response.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check permission: task:create requires project membership for regular members
    const isMember = await isProjectMember(project.id, auth.userId);
    const isLead = await isProjectLead(project.id, auth.userId);

    if (
      !hasPermission(auth.memberRole, "task:create", {
        isProjectMember: isMember,
        isProjectLead: isLead,
      })
    ) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const task = await createTask({
      projectId: parsed.data.projectId,
      orgId: auth.orgId,
      title: parsed.data.title,
      description: parsed.data.description,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assigneeId: parsed.data.assigneeId,
      createdBy: auth.userId,
      dueDate: parsed.data.dueDate,
      estimatedMinutes: parsed.data.estimatedMinutes,
      parentTaskId: parsed.data.parentTaskId,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: task.projectId,
      taskId: task.id,
      userId: auth.userId,
      type: "task_created",
      metadata: { taskTitle: task.title },
    });

    // Notify assignee if assigned to someone else
    if (task.assigneeId && task.assigneeId !== auth.userId) {
      await createNotification({
        userId: task.assigneeId,
        orgId: auth.orgId,
        type: "task_assigned",
        title: `You were assigned "${task.title}"`,
        metadata: { taskId: task.id, projectId: task.projectId },
      });
    }

    return Response.json({ data: task }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "POST /api/tasks error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
