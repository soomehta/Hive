import { createTaskComment } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCreateComment(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.taskId || !payload.content) {
    return { success: false, error: "Task ID and content are required" };
  }

  const comment = await createTaskComment({
    taskId: payload.taskId,
    userId: action.userId,
    content: payload.content,
  });

  await logActivity({
    orgId: action.orgId,
    taskId: payload.taskId,
    userId: action.userId,
    type: "task_commented",
    metadata: { commentId: comment.id, createdByPa: true },
  });

  return { success: true, result: { commentId: comment.id } };
}
