/**
 * Workspace-level data aggregation for PM agent reports.
 */

import { db } from "@/lib/db";
import { tasks, projects, activityLog, projectMembers } from "@/lib/db/schema";
import { and, eq, gte, lte, sql, count, inArray, desc } from "drizzle-orm";

export async function getWorkspaceTaskSummary(
  workspaceId: string,
  orgId: string,
  dateRange?: { start: Date; end: Date }
) {
  const projectIds = await getWorkspaceProjectIds(workspaceId, orgId);
  if (projectIds.length === 0) return { todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0, total: 0 };

  const conditions = [
    eq(tasks.orgId, orgId),
    inArray(tasks.projectId, projectIds),
  ];

  if (dateRange) {
    conditions.push(gte(tasks.createdAt, dateRange.start));
    conditions.push(lte(tasks.createdAt, dateRange.end));
  }

  const rows = await db
    .select({
      status: tasks.status,
      count: count(),
    })
    .from(tasks)
    .where(and(...conditions))
    .groupBy(tasks.status);

  const summary: Record<string, number> = { todo: 0, in_progress: 0, in_review: 0, done: 0, cancelled: 0 };
  for (const row of rows) {
    summary[row.status] = row.count;
  }
  return { ...summary, total: Object.values(summary).reduce((a, b) => a + b, 0) };
}

export async function getWorkspaceVelocity(
  workspaceId: string,
  orgId: string,
  weeks: number = 4
) {
  const projectIds = await getWorkspaceProjectIds(workspaceId, orgId);
  if (projectIds.length === 0) return [];

  const since = new Date();
  since.setDate(since.getDate() - weeks * 7);

  const rows = await db
    .select({
      week: sql<string>`to_char(${tasks.updatedAt}, 'IYYY-IW')`,
      count: count(),
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.orgId, orgId),
        inArray(tasks.projectId, projectIds),
        eq(tasks.status, "done"),
        gte(tasks.updatedAt, since)
      )
    )
    .groupBy(sql`to_char(${tasks.updatedAt}, 'IYYY-IW')`)
    .orderBy(sql`to_char(${tasks.updatedAt}, 'IYYY-IW')`);

  return rows.map((r) => ({ week: r.week, completed: r.count }));
}

export async function getWorkspaceBlockers(workspaceId: string, orgId: string) {
  const projectIds = await getWorkspaceProjectIds(workspaceId, orgId);
  if (projectIds.length === 0) return [];

  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.orgId, orgId),
        inArray(tasks.projectId, projectIds),
        eq(tasks.isBlocked, true)
      )
    )
    .orderBy(desc(tasks.updatedAt));
}

export async function getTeamMemberActivity(
  workspaceId: string,
  orgId: string,
  dateRange: { start: Date; end: Date }
) {
  const projectIds = await getWorkspaceProjectIds(workspaceId, orgId);
  if (projectIds.length === 0) return [];

  return db
    .select({
      userId: activityLog.userId,
      count: count(),
    })
    .from(activityLog)
    .where(
      and(
        eq(activityLog.orgId, orgId),
        inArray(activityLog.projectId, projectIds),
        gte(activityLog.createdAt, dateRange.start),
        lte(activityLog.createdAt, dateRange.end)
      )
    )
    .groupBy(activityLog.userId)
    .orderBy(desc(count()));
}

export async function getProjectProgress(projectId: string, orgId: string) {
  const rows = await db
    .select({
      status: tasks.status,
      count: count(),
    })
    .from(tasks)
    .where(and(eq(tasks.orgId, orgId), eq(tasks.projectId, projectId)))
    .groupBy(tasks.status);

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const done = rows.find((r) => r.status === "done")?.count ?? 0;

  return {
    total,
    done,
    completionPercent: total > 0 ? Math.round((done / total) * 100) : 0,
    breakdown: Object.fromEntries(rows.map((r) => [r.status, r.count])),
  };
}

async function getWorkspaceProjectIds(workspaceId: string, orgId: string): Promise<string[]> {
  const rows = await db
    .select({ id: projects.id })
    .from(projects)
    .where(and(eq(projects.orgId, orgId), eq(projects.workspaceId, workspaceId)));
  return rows.map((r) => r.id);
}
