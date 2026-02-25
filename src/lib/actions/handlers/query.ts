import { getTasks, getUserTasks } from "@/lib/db/queries/tasks";
import { db } from "@/lib/db";
import { tasks, projects, organizationMembers } from "@/lib/db/schema";
import { eq, and, count, sql } from "drizzle-orm";
import { getActiveIntegration } from "@/lib/integrations/oauth";
import * as googleCalendar from "@/lib/integrations/google-calendar";
import * as microsoftCalendar from "@/lib/integrations/microsoft-calendar";
import * as googleMail from "@/lib/integrations/google-mail";
import * as microsoftMail from "@/lib/integrations/microsoft-mail";
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
      return await checkCalendar(action.userId, action.orgId, payload);
    case "check_email":
      return await checkEmail(action.userId, action.orgId, payload);
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

async function checkCalendar(userId: string, orgId: string, payload: Record<string, any>): Promise<ExecutionResult> {
  const google = await getActiveIntegration(userId, orgId, "google");
  const microsoft = !google ? await getActiveIntegration(userId, orgId, "microsoft") : null;

  if (!google && !microsoft) {
    return { success: false, error: "No calendar integration connected. Connect Google or Microsoft in Settings > Integrations." };
  }

  try {
    const now = new Date();
    const timeMin = payload.date
      ? new Date(payload.date).toISOString()
      : now.toISOString();
    const timeMax = payload.date
      ? new Date(new Date(payload.date).getTime() + 24 * 60 * 60 * 1000).toISOString()
      : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const events = google
      ? await googleCalendar.getEvents(userId, orgId, { timeMin, timeMax, maxResults: 20 })
      : await microsoftCalendar.getEvents(userId, orgId, { timeMin, timeMax, maxResults: 20 });

    return {
      success: true,
      result: {
        events: events.map((e) => ({
          id: e.id,
          summary: e.summary,
          startTime: e.startTime,
          endTime: e.endTime,
          attendees: e.attendees,
        })),
        count: events.length,
        timeRange: { from: timeMin, to: timeMax },
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch calendar events" };
  }
}

async function checkEmail(userId: string, orgId: string, payload: Record<string, any>): Promise<ExecutionResult> {
  const google = await getActiveIntegration(userId, orgId, "google");
  const microsoft = !google ? await getActiveIntegration(userId, orgId, "microsoft") : null;

  if (!google && !microsoft) {
    return { success: false, error: "No email integration connected. Connect Google or Microsoft in Settings > Integrations." };
  }

  try {
    const maxResults = payload.count ?? 10;
    const emails = google
      ? await googleMail.getUnreadEmails(userId, orgId, { maxResults, query: payload.query })
      : await microsoftMail.getUnreadEmails(userId, orgId, { maxResults, query: payload.query });

    return {
      success: true,
      result: {
        emails: emails.map((e) => ({
          id: e.id,
          from: e.from,
          subject: e.subject,
          snippet: e.snippet,
          date: e.date,
        })),
        count: emails.length,
      },
    };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to fetch emails" };
  }
}
