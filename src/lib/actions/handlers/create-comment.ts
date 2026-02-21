import { createTaskComment, getTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCreateComment(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.taskId || !payload.content) {
    return { success: false, error: "Task ID and content are required" };
  }

  const task = await getTask(payload.taskId);
  if (!task) {
    return { success: false, error: "Task not found" };
  }

  const membership = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, task.projectId),
      eq(projectMembers.userId, action.userId)
    ),
  });
  if (!membership) {
    return { success: false, error: "You don't have access to this project" };
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
