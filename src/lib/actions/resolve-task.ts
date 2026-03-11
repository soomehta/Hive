import { db } from "@/lib/db";
import { tasks, projectMembers, projects } from "@/lib/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";

/**
 * Resolve a taskId for action handlers.
 * 1. If payload.taskId is a valid UUID → validate it exists and user has access → return it
 * 2. If payload.taskTitle is provided → fuzzy search tasks in the org by title (case-insensitive ILIKE)
 * 3. If neither → return error
 */
export async function resolveTaskId(
  payload: Record<string, any>,
  userId: string,
  orgId: string
): Promise<{ taskId: string } | { error: string }> {
  // Path 1: explicit UUID taskId
  if (payload.taskId && isUUID(payload.taskId)) {
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, payload.taskId),
    });
    if (!task) {
      return { error: "Task not found" };
    }
    if (task.orgId !== orgId) {
      return { error: "Task not found in your organization" };
    }
    // Verify user has project access
    const membership = await db.query.projectMembers.findFirst({
      where: and(
        eq(projectMembers.projectId, task.projectId),
        eq(projectMembers.userId, userId)
      ),
    });
    if (!membership) {
      return { error: "You don't have access to this task's project" };
    }
    return { taskId: task.id };
  }

  // Path 2: search by task title
  const title = payload.taskTitle || payload.taskName || payload.title;
  if (title && typeof title === "string") {
    const escapedTitle = title.replace(/[%_\\]/g, "\\$&");

    // Search tasks in user's org that they have project access to
    const results = await db
      .select({ id: tasks.id, title: tasks.title })
      .from(tasks)
      .innerJoin(projectMembers, and(
        eq(projectMembers.projectId, tasks.projectId),
        eq(projectMembers.userId, userId)
      ))
      .where(and(
        eq(tasks.orgId, orgId),
        ilike(tasks.title, `%${escapedTitle}%`)
      ))
      .limit(5);

    if (results.length === 1) {
      return { taskId: results[0].id };
    }

    if (results.length > 1) {
      // Pick best match: prefer exact case-insensitive match, then shortest title
      const exact = results.find(
        (r) => r.title.toLowerCase() === title.toLowerCase()
      );
      if (exact) return { taskId: exact.id };

      // Return first match (closest by DB ordering)
      return { taskId: results[0].id };
    }

    return { error: `No task found matching "${title}". Please check the task name and try again.` };
  }

  return { error: "Please specify which task you'd like to modify." };
}

function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}
