import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { updateTaskSchema } from "@/lib/utils/validation";
import { getTask, updateTask, deleteTask } from "@/lib/db/queries/tasks";
import { isProjectMember, isProjectLead } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { notifyOnTaskAssignment, notifyOnTaskCompletion } from "@/lib/notifications/task-notifications";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ taskId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { taskId } = await params;

    const task = await getTask(taskId);
    if (!task || task.orgId !== auth.orgId) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    return Response.json({ data: task });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { taskId } = await params;

    const task = await getTask(taskId);
    if (!task || task.orgId !== auth.orgId) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Check permission: task:edit_any allows editing any task
    // Otherwise, creator or assignee can edit their own tasks
    const isLead = await isProjectLead(task.projectId, auth.userId);
    const isMember = await isProjectMember(task.projectId, auth.userId);
    const isCreator = task.createdBy === auth.userId;
    const isAssignee = task.assigneeId === auth.userId;

    const canEditAny = hasPermission(auth.memberRole, "task:edit_any", {
      isProjectLead: isLead,
      isProjectMember: isMember,
      isCreator,
    });

    if (!canEditAny && !isCreator && !isAssignee) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const updated = await updateTask(taskId, parsed.data);

    // Determine activity type
    const isCompleted = parsed.data.status === "done" && task.status !== "done";
    const isAssigned = parsed.data.assigneeId && parsed.data.assigneeId !== task.assigneeId;

    if (isCompleted) {
      await logActivity({
        orgId: auth.orgId,
        projectId: task.projectId,
        taskId,
        userId: auth.userId,
        type: "task_completed",
        metadata: { taskTitle: task.title },
      });

      await notifyOnTaskCompletion({
        creatorUserId: task.createdBy,
        actorUserId: auth.userId,
        orgId: auth.orgId,
        taskId,
        projectId: task.projectId,
        taskTitle: task.title,
      });
    } else if (isAssigned) {
      await logActivity({
        orgId: auth.orgId,
        projectId: task.projectId,
        taskId,
        userId: auth.userId,
        type: "task_assigned",
        metadata: { taskTitle: task.title, assigneeId: parsed.data.assigneeId },
      });

      await notifyOnTaskAssignment({
        assigneeId: parsed.data.assigneeId!,
        actorUserId: auth.userId,
        orgId: auth.orgId,
        taskId,
        projectId: task.projectId,
        taskTitle: task.title,
      });
    } else {
      await logActivity({
        orgId: auth.orgId,
        projectId: task.projectId,
        taskId,
        userId: auth.userId,
        type: "task_updated",
        metadata: {
          taskTitle: task.title,
          fields: Object.keys(parsed.data),
          ...(parsed.data.status ? { oldStatus: task.status, newStatus: parsed.data.status } : {}),
        },
      });
    }

    // Notify if blocker flagged
    if (parsed.data.isBlocked === true && !task.isBlocked) {
      await logActivity({
        orgId: auth.orgId,
        projectId: task.projectId,
        taskId,
        userId: auth.userId,
        type: "blocker_flagged",
        metadata: { taskTitle: task.title, reason: parsed.data.blockedReason },
      });
    }
    if (parsed.data.isBlocked === false && task.isBlocked) {
      await logActivity({
        orgId: auth.orgId,
        projectId: task.projectId,
        taskId,
        userId: auth.userId,
        type: "blocker_resolved",
        metadata: { taskTitle: task.title },
      });
    }

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { taskId } = await params;

    const task = await getTask(taskId);
    if (!task || task.orgId !== auth.orgId) {
      return Response.json({ error: "Task not found" }, { status: 404 });
    }

    // Check task:delete permission
    const isLead = await isProjectLead(task.projectId, auth.userId);
    const isCreator = task.createdBy === auth.userId;

    if (
      !hasPermission(auth.memberRole, "task:delete", {
        isProjectLead: isLead,
        isCreator,
      })
    ) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await logActivity({
      orgId: auth.orgId,
      projectId: task.projectId,
      userId: auth.userId,
      type: "task_deleted",
      metadata: { taskId, taskTitle: task.title },
    });

    const deleted = await deleteTask(taskId);

    return Response.json({ data: deleted });
  } catch (error) {
    return errorResponse(error);
  }
}
