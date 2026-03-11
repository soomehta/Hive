import { createTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import { notifyOnTaskAssignment } from "@/lib/notifications/task-notifications";
import { resolveProjectId } from "../resolve-project";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCreateTask(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  const resolved = await resolveProjectId(payload.projectId, action.userId, action.orgId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }
  const { projectId } = resolved;

  // Validate dueDate is a parseable date string
  let dueDate = payload.dueDate;
  if (dueDate && isNaN(new Date(dueDate).getTime())) {
    dueDate = undefined; // Drop unparseable dates rather than crash
  }

  const task = await createTask({
    projectId,
    orgId: action.orgId,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    priority: payload.priority,
    assigneeId: payload.assigneeId,
    createdBy: action.userId,
    dueDate,
    estimatedMinutes: payload.estimatedMinutes,
  });

  await logActivity({
    orgId: action.orgId,
    projectId,
    taskId: task.id,
    userId: action.userId,
    type: "task_created",
    metadata: { title: task.title, createdByPa: true },
  });

  if (payload.assigneeId) {
    await notifyOnTaskAssignment({
      assigneeId: payload.assigneeId,
      actorUserId: action.userId,
      orgId: action.orgId,
      taskId: task.id,
      projectId,
      taskTitle: task.title,
      body: `"${task.title}" was created and assigned to you by PA.`,
    });
  }

  return { success: true, result: { taskId: task.id, title: task.title } };
}
