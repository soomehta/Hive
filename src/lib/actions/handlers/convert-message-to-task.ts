import { getChannelMessageById } from "@/lib/db/queries/chat";
import { createTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleConvertMessageToTask(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.messageId) {
    return { success: false, error: "messageId is required" };
  }

  const message = await getChannelMessageById(action.orgId, payload.messageId);
  if (!message) {
    return { success: false, error: "Message not found" };
  }

  if (!payload.projectId) {
    return { success: false, error: "projectId is required to create a task" };
  }

  const title = payload.title || message.content.slice(0, 100);

  const task = await createTask({
    orgId: action.orgId,
    projectId: payload.projectId,
    title,
    description: message.content,
    createdBy: action.userId,
    status: "todo",
    priority: payload.priority || "medium",
  });

  await logActivity({
    orgId: action.orgId,
    projectId: payload.projectId,
    taskId: task.id,
    userId: action.userId,
    type: "message_converted_to_task",
    metadata: {
      messageId: payload.messageId,
      taskId: task.id,
      title,
      createdByPa: true,
    },
  });

  return { success: true, result: { taskId: task.id, title } };
}
