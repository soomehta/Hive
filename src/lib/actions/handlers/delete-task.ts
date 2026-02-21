import { deleteTask, getTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/activity";
import { db } from "@/lib/db";
import { projectMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleDeleteTask(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.taskId) {
    return { success: false, error: "Task ID is required" };
  }

  const existing = await getTask(payload.taskId);
  if (!existing) {
    return { success: false, error: "Task not found" };
  }

  const membership = await db.query.projectMembers.findFirst({
    where: and(
      eq(projectMembers.projectId, existing.projectId),
      eq(projectMembers.userId, action.userId)
    ),
  });
  if (!membership) {
    return { success: false, error: "You don't have access to this project" };
  }

  await deleteTask(payload.taskId);

  await logActivity({
    orgId: action.orgId,
    taskId: payload.taskId,
    projectId: existing.projectId,
    userId: action.userId,
    type: "task_deleted",
    metadata: { title: existing.title, deletedByPa: true },
  });

  return { success: true, result: { taskId: payload.taskId, title: existing.title } };
}
