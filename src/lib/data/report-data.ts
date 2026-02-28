import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";
import type { ReportData } from "@/lib/ai/report-generator";

// ─── Types ───────────────────────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
}

// ─── Shared Aggregator ───────────────────────────────────

/**
 * Fetches and aggregates all report metrics for an org within a date range.
 * Used by both the cron job (weekly-digest) and the on-demand report API.
 *
 * @param orgId      The org to aggregate data for.
 * @param dateRange  Start and end Date boundaries for the reporting period.
 * @param projectId  Optional project filter.
 */
export async function aggregateReportData(
  orgId: string,
  dateRange: DateRange,
  projectId?: string
): Promise<ReportData> {
  const { start, end } = dateRange;
  const now = new Date();

  const taskFilters: { orgId: string; projectId?: string; limit: number } = {
    orgId,
    limit: 500,
  };
  if (projectId) {
    taskFilters.projectId = projectId;
  }

  const [allTasksResult, activityResult] = await Promise.all([
    getTasks(taskFilters),
    getActivityFeed({ orgId, limit: 100 }),
  ]);

  const allTasks = allTasksResult.data;

  // ── tasksByStatus ────────────────────────────────────
  const tasksByStatus: Record<string, number> = {};
  for (const t of allTasks) {
    tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
  }

  // ── tasksByAssignee ──────────────────────────────────
  const tasksByAssignee: Record<string, number> = {};
  for (const t of allTasks) {
    const key = t.assigneeId ?? "unassigned";
    tasksByAssignee[key] = (tasksByAssignee[key] ?? 0) + 1;
  }

  // ── tasksByPriority ──────────────────────────────────
  const tasksByPriority: Record<string, number> = {};
  for (const t of allTasks) {
    tasksByPriority[t.priority] = (tasksByPriority[t.priority] ?? 0) + 1;
  }

  // ── completionRate ───────────────────────────────────
  const doneCount = allTasks.filter(
    (t) => t.status === "done" || t.status === "cancelled"
  ).length;
  const completionRate =
    allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

  // ── overdueTasks ─────────────────────────────────────
  const overdueTasks = allTasks
    .filter((t) => {
      if (!t.dueDate || t.status === "done" || t.status === "cancelled")
        return false;
      return new Date(t.dueDate) < now;
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.assigneeId ?? undefined,
      dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
    }));

  // ── blockers ─────────────────────────────────────────
  const blockers = allTasks
    .filter((t) => t.isBlocked)
    .map((t) => ({
      id: t.id,
      title: t.title,
      assignee: t.assigneeId ?? undefined,
    }));

  // ── velocity (trailing 4 weeks from end of date range) ───
  const velocity: number[] = [];
  for (let w = 3; w >= 0; w--) {
    const weekStart = new Date(end.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(end.getTime() - w * 7 * 24 * 60 * 60 * 1000);
    const count = allTasks.filter((t) => {
      if (!t.completedAt) return false;
      const completed = new Date(t.completedAt);
      return completed >= weekStart && completed < weekEnd;
    }).length;
    velocity.push(count);
  }

  // ── upcomingDeadlines (next 7 days from now) ─────────
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcomingDeadlines = allTasks
    .filter((t) => {
      if (!t.dueDate || t.status === "done" || t.status === "cancelled")
        return false;
      const due = new Date(t.dueDate);
      return due >= now && due <= nextWeek;
    })
    .sort(
      (a, b) =>
        new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
    )
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
    }));

  // ── workloadByPerson ─────────────────────────────────
  const workloadByPerson: Record<string, number> = {};
  for (const t of allTasks) {
    if (t.assigneeId && t.status !== "done" && t.status !== "cancelled") {
      workloadByPerson[t.assigneeId] =
        (workloadByPerson[t.assigneeId] ?? 0) + 1;
    }
  }

  // ── recentActivity within the date range ─────────────
  const recentActivity = activityResult.data
    .filter((a) => {
      const created = new Date(a.createdAt);
      return created >= start && created <= end;
    })
    .map((a) => ({
      type: a.type,
      description: `${a.type} on ${a.taskId ?? a.projectId ?? "org"}`,
      createdAt: new Date(a.createdAt).toISOString(),
    }));

  return {
    tasksByStatus,
    tasksByAssignee,
    tasksByPriority,
    completionRate,
    overdueTasks,
    blockers,
    velocity,
    upcomingDeadlines,
    workloadByPerson,
    recentActivity,
  };
}
