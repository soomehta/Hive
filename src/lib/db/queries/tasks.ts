import { db } from "@/lib/db";
import { tasks, taskComments } from "@/lib/db/schema";
import { eq, and, ilike, lt, desc, asc, sql } from "drizzle-orm";

// ─── Types ──────────────────────────────────────────────

interface TaskFilters {
  orgId: string;
  projectId?: string;
  assigneeId?: string;
  status?: string;
  priority?: string;
  isBlocked?: boolean;
  search?: string;
  sort?: string;
  order?: string;
  limit?: number;
  cursor?: string;
}

// ─── Read Queries ───────────────────────────────────────

export async function getTasks(filters: TaskFilters) {
  const {
    orgId,
    projectId,
    assigneeId,
    status,
    priority,
    isBlocked,
    search,
    sort = "created_at",
    order = "desc",
    limit: rawLimit = 20,
    cursor,
  } = filters;

  // Hard cap to prevent unbounded result sets
  const MAX_LIMIT = 500;
  const limit = Math.min(Math.max(1, rawLimit), MAX_LIMIT);

  const conditions = [eq(tasks.orgId, orgId)];

  if (projectId) {
    conditions.push(eq(tasks.projectId, projectId));
  }

  if (assigneeId) {
    conditions.push(eq(tasks.assigneeId, assigneeId));
  }

  if (status) {
    conditions.push(
      eq(tasks.status, status as "todo" | "in_progress" | "in_review" | "done" | "cancelled")
    );
  }

  if (priority) {
    conditions.push(
      eq(tasks.priority, priority as "low" | "medium" | "high" | "urgent")
    );
  }

  if (isBlocked !== undefined) {
    conditions.push(eq(tasks.isBlocked, isBlocked));
  }

  if (search) {
    const escapedSearch = search.replace(/[%_\\]/g, '\\$&');
    conditions.push(ilike(tasks.title, `%${escapedSearch}%`));
  }

  if (cursor) {
    conditions.push(lt(tasks.id, cursor));
  }

  // Determine sort column
  const sortColumnMap: Record<string, typeof tasks.createdAt | typeof tasks.dueDate | typeof tasks.priority | typeof tasks.position> = {
    created_at: tasks.createdAt,
    due_date: tasks.dueDate,
    priority: tasks.priority,
    position: tasks.position,
  };

  const sortColumn = sortColumnMap[sort] ?? tasks.createdAt;
  const orderFn = order === "asc" ? asc : desc;

  const data = await db
    .select()
    .from(tasks)
    .where(and(...conditions))
    .orderBy(orderFn(sortColumn), desc(tasks.id))
    .limit(limit + 1);

  const hasMore = data.length > limit;
  const results = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? results[results.length - 1].id : null;

  return { data: results, nextCursor };
}

export async function getTask(taskId: string) {
  return db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });
}

export async function getUserTasks(userId: string, orgId: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.assigneeId, userId), eq(tasks.orgId, orgId)))
    .orderBy(desc(tasks.createdAt));
}

// ─── Write Queries ──────────────────────────────────────

export async function createTask(data: {
  projectId: string;
  orgId: string;
  title: string;
  description?: string;
  status?: "todo" | "in_progress" | "in_review" | "done" | "cancelled";
  priority?: "low" | "medium" | "high" | "urgent";
  assigneeId?: string;
  createdBy: string;
  dueDate?: string;
  estimatedMinutes?: number;
  parentTaskId?: string;
}) {
  const [task] = await db
    .insert(tasks)
    .values({
      projectId: data.projectId,
      orgId: data.orgId,
      title: data.title,
      description: data.description,
      status: data.status,
      priority: data.priority,
      assigneeId: data.assigneeId,
      createdBy: data.createdBy,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
      estimatedMinutes: data.estimatedMinutes,
      parentTaskId: data.parentTaskId,
    })
    .returning();

  return task;
}

export async function updateTask(
  taskId: string,
  data: Partial<{
    title: string;
    description: string | null;
    status: "todo" | "in_progress" | "in_review" | "done" | "cancelled";
    priority: "low" | "medium" | "high" | "urgent";
    assigneeId: string | null;
    dueDate: string | null;
    completedAt: string | null;
    estimatedMinutes: number | null;
    position: number;
    isBlocked: boolean;
    blockedReason: string | null;
  }>
) {
  const updateData: Record<string, unknown> = {};

  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.status !== undefined) {
    updateData.status = data.status;

    // Auto-set completedAt when status changes to 'done'
    if (data.status === "done" && data.completedAt === undefined) {
      updateData.completedAt = new Date();
    }

    // Clear completedAt when status changes from 'done' to something else
    if (data.status !== "done") {
      updateData.completedAt = null;
    }
  }
  if (data.priority !== undefined) updateData.priority = data.priority;
  if (data.assigneeId !== undefined) updateData.assigneeId = data.assigneeId;
  if (data.dueDate !== undefined)
    updateData.dueDate = data.dueDate ? new Date(data.dueDate) : null;
  if (data.completedAt !== undefined && data.status === undefined)
    updateData.completedAt = data.completedAt
      ? new Date(data.completedAt)
      : null;
  if (data.estimatedMinutes !== undefined)
    updateData.estimatedMinutes = data.estimatedMinutes;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.isBlocked !== undefined) updateData.isBlocked = data.isBlocked;
  if (data.blockedReason !== undefined)
    updateData.blockedReason = data.blockedReason;

  updateData.updatedAt = new Date();

  const [updated] = await db
    .update(tasks)
    .set(updateData)
    .where(eq(tasks.id, taskId))
    .returning();

  return updated;
}

export async function deleteTask(taskId: string) {
  const [deleted] = await db
    .delete(tasks)
    .where(eq(tasks.id, taskId))
    .returning();

  return deleted;
}

// ─── Comment Queries ────────────────────────────────────

export async function getTaskComments(taskId: string) {
  return db
    .select()
    .from(taskComments)
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt));
}

export async function createTaskComment(data: {
  taskId: string;
  userId: string;
  content: string;
}) {
  const [comment] = await db
    .insert(taskComments)
    .values({
      taskId: data.taskId,
      userId: data.userId,
      content: data.content,
    })
    .returning();

  return comment;
}
