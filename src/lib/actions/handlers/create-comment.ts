import { createTaskComment, getTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";
import { resolveTaskId } from "../resolve-task";

export async function handleCreateComment(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.content) {
    return { success: false, error: "Comment content is required" };
  }

  const resolved = await resolveTaskId(payload, action.userId, action.orgId);
  if ("error" in resolved) {
    return { success: false, error: resolved.error };
  }

  const task = await getTask(resolved.taskId);
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
    taskId: resolved.taskId,
    userId: action.userId,
    content: payload.content,
  });

  await logActivity({
    orgId: action.orgId,
    taskId: resolved.taskId,
    userId: action.userId,
    type: "task_commented",
    metadata: { commentId: comment.id, createdByPa: true },
  });

  return { success: true, result: { commentId: comment.id } };
}
