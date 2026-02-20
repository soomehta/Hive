import { updateTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCompleteTask(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.taskId) {
    return { success: false, error: "Task ID is required" };
  }

  const task = await updateTask(payload.taskId, {
    status: "done",
    completedAt: new Date().toISOString(),
  });

  if (!task) {
    return { success: false, error: "Task not found" };
  }

  await logActivity({
    orgId: action.orgId,
    taskId: task.id,
    projectId: task.projectId,
    userId: action.userId,
    type: "task_completed",
    metadata: { title: task.title, completedByPa: true },
  });

  return { success: true, result: { taskId: task.id, title: task.title } };
}
