import { getTasks, getUserTasks } from "@/lib/db/queries/tasks";
import { db } from "@/lib/db";
import { tasks, projects, organizationMembers } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleQuery(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.plannedPayload) as Record<string, any>;

  switch (action.actionType) {
    case "check_tasks":
      return await checkTasks(action.orgId, payload);
    case "check_project_status":
      return await checkProjectStatus(action.orgId, payload);
    case "check_workload":
      return await checkWorkload(action.orgId, payload);
    case "check_calendar":
      return { success: false, error: "Calendar integration not yet connected." };
    case "check_email":
      return { success: false, error: "Email integration not yet connected." };
    default:
      return { success: false, error: `Unknown query type: ${action.actionType}` };
  }
}

async function checkTasks(orgId: string, payload: Record<string, any>): Promise<ExecutionResult> {
  const { data } = await getTasks({
    orgId,
    projectId: payload.projectId,
    assigneeId: payload.assigneeId,
    status: payload.status,
    limit: 20,
  });

  return {
    success: true,
    result: {
      tasks: data.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assigneeId,
        dueDate: t.dueDate,
      })),
      count: data.length,
    },
  };
}

async function checkProjectStatus(orgId: string, payload: Record<string, any>): Promise<ExecutionResult> {
  const projectId = payload.projectId;
  if (!projectId) {
    return { success: false, error: "Project ID is required" };
  }

  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), eq(projects.orgId, orgId)),
  });

  if (!project) {
    return { success: false, error: "Project not found" };
  }

  const taskStats = await db
    .select({
      status: tasks.status,
      count: count(),
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .groupBy(tasks.status);

  const statusMap: Record<string, number> = {};
  for (const stat of taskStats) {
    statusMap[stat.status] = Number(stat.count);
  }

  const total = Object.values(statusMap).reduce((a, b) => a + b, 0);
  const completed = statusMap["done"] ?? 0;

  return {
    success: true,
    result: {
      project: { id: project.id, name: project.name, status: project.status },
      taskStats: statusMap,
      totalTasks: total,
      completedTasks: completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    },
  };
}

async function checkWorkload(orgId: string, payload: Record<string, any>): Promise<ExecutionResult> {
  const workload = await db
    .select({
      assigneeId: tasks.assigneeId,
      count: count(),
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.orgId, orgId),
        sql`${tasks.status} NOT IN ('done', 'cancelled')`
      )
    )
    .groupBy(tasks.assigneeId);

  return {
    success: true,
    result: {
      workload: workload.map((w) => ({
        userId: w.assigneeId,
        activeTasks: Number(w.count),
      })),
    },
  };
}
