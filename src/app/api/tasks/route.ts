import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { createTaskSchema, taskFiltersSchema } from "@/lib/utils/validation";
import { getTasks, createTask } from "@/lib/db/queries/tasks";
import { getProject, isProjectMember, isProjectLead } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { notifyOnTaskAssignment } from "@/lib/notifications/task-notifications";
import { createItem } from "@/lib/db/queries/items";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { getOrgMember } from "@/lib/db/queries/organizations";

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
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`tasks:create:${auth.userId}`, 30, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

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

    // Validate assigneeId belongs to the org
    if (parsed.data.assigneeId) {
      const assigneeMember = await getOrgMember(auth.orgId, parsed.data.assigneeId);
      if (!assigneeMember) {
        return Response.json(
          { error: "Assignee is not a member of this organization" },
          { status: 400 }
        );
      }
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

    // Create corresponding items row for the item graph
    await createItem({
      orgId: auth.orgId,
      projectId: task.projectId,
      type: "task",
      title: task.title,
      ownerId: task.assigneeId ?? auth.userId,
      status: task.status,
      sourceId: task.id,
    }).catch((err) => {
      console.error("[items] failed to create item for task", task.id, err);
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: task.projectId,
      taskId: task.id,
      userId: auth.userId,
      type: "task_created",
      metadata: { taskTitle: task.title },
    });

    if (task.assigneeId) {
      await notifyOnTaskAssignment({
        assigneeId: task.assigneeId,
        actorUserId: auth.userId,
        orgId: auth.orgId,
        taskId: task.id,
        projectId: task.projectId,
        taskTitle: task.title,
      });
    }

    // Enqueue embedding for semantic search
    const { enqueueEmbedding } = await import("@/lib/queue/jobs");
    enqueueEmbedding("task", task.id, `${task.title} ${task.description ?? ""}`, auth.orgId).catch(() => {});

    return Response.json({ data: task }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
