import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { createCommentSchema } from "@/lib/utils/validation";
import { getTask, getTaskComments, createTaskComment } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { createLogger } from "@/lib/logger";

const log = createLogger("task-comments");

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { taskId } = await params;

    // Verify task belongs to org
    const task = await getTask(taskId);
    if (!task || task.orgId !== auth.orgId) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const comments = await getTaskComments(taskId);

    return Response.json({ data: comments });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/tasks/[taskId]/comments error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { taskId } = await params;

    // Verify task belongs to org
    const task = await getTask(taskId);
    if (!task || task.orgId !== auth.orgId) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = createCommentSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const comment = await createTaskComment({
      taskId,
      userId: auth.userId,
      content: parsed.data.content,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: task.projectId,
      taskId,
      userId: auth.userId,
      type: "task_commented",
      metadata: { taskTitle: task.title },
    });

    // Notify task assignee and creator (if different from commenter)
    const notifyUserIds = new Set<string>();
    if (task.assigneeId && task.assigneeId !== auth.userId) {
      notifyUserIds.add(task.assigneeId);
    }
    if (task.createdBy !== auth.userId) {
      notifyUserIds.add(task.createdBy);
    }

    for (const userId of notifyUserIds) {
      await createNotification({
        userId,
        orgId: auth.orgId,
        type: "task_commented",
        title: `New comment on "${task.title}"`,
        body: parsed.data.content.slice(0, 200),
        metadata: { taskId, projectId: task.projectId },
      });
    }

    return Response.json({ data: comment }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "POST /api/tasks/[taskId]/comments error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
