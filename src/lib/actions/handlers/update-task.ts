import { updateTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleUpdateTask(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;
  const { taskId, ...updates } = payload;

  if (!taskId) {
    return { success: false, error: "Task ID is required" };
  }

  const task = await updateTask(taskId, updates);
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  await logActivity({
    orgId: action.orgId,
    taskId: task.id,
    projectId: task.projectId,
    userId: action.userId,
    type: "task_updated",
    metadata: { updates, updatedByPa: true },
  });

  return { success: true, result: { taskId: task.id, title: task.title } };
}
