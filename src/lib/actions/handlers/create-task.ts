import { createTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCreateTask(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  const task = await createTask({
    projectId: payload.projectId,
    orgId: action.orgId,
    title: payload.title,
    description: payload.description,
    status: payload.status,
    priority: payload.priority,
    assigneeId: payload.assigneeId,
    createdBy: action.userId,
    dueDate: payload.dueDate,
    estimatedMinutes: payload.estimatedMinutes,
  });

  await logActivity({
    orgId: action.orgId,
    projectId: payload.projectId,
    taskId: task.id,
    userId: action.userId,
    type: "task_created",
    metadata: { title: task.title, createdByPa: true },
  });

  if (payload.assigneeId && payload.assigneeId !== action.userId) {
    await createNotification({
      userId: payload.assigneeId,
      orgId: action.orgId,
      type: "task_assigned",
      title: "New task assigned by PA",
      body: `"${task.title}" was created and assigned to you.`,
      metadata: { taskId: task.id, projectId: payload.projectId },
    });
  }

  return { success: true, result: { taskId: task.id, title: task.title } };
}
