import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";
import { generateReport, type ReportData } from "@/lib/ai/report-generator";
import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";

export async function handleGenerateReport(
  action: PAAction
): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<
    string,
    any
  >;
  const question =
    (payload.question as string) ?? "Give me a project status update";
  const projectId = payload.projectId as string | undefined;

  try {
    // ── Fetch tasks ──────────────────────────────────────
    const taskFilters: {
      orgId: string;
      projectId?: string;
      limit: number;
    } = {
      orgId: action.orgId,
      limit: 500,
    };
    if (projectId) {
      taskFilters.projectId = projectId;
    }

    const [allTasksResult, activityResult] = await Promise.all([
      getTasks(taskFilters),
      getActivityFeed({ orgId: action.orgId, limit: 50 }),
    ]);

    const allTasks = allTasksResult.data;
    const now = new Date();

    // ── Aggregate metrics ────────────────────────────────
    const tasksByStatus: Record<string, number> = {};
    const tasksByAssignee: Record<string, number> = {};
    const tasksByPriority: Record<string, number> = {};
    const workloadByPerson: Record<string, number> = {};

    for (const t of allTasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
      tasksByPriority[t.priority] = (tasksByPriority[t.priority] ?? 0) + 1;

      const assigneeKey = t.assigneeId ?? "unassigned";
      tasksByAssignee[assigneeKey] = (tasksByAssignee[assigneeKey] ?? 0) + 1;

      if (
        t.assigneeId &&
        t.status !== "done" &&
        t.status !== "cancelled"
      ) {
        workloadByPerson[t.assigneeId] =
          (workloadByPerson[t.assigneeId] ?? 0) + 1;
      }
    }

    // Completion rate
    const doneCount = allTasks.filter(
      (t) => t.status === "done" || t.status === "cancelled"
    ).length;
    const completionRate =
      allTasks.length > 0 ? Math.round((doneCount / allTasks.length) * 100) : 0;

    // Overdue tasks
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

    // Blockers
    const blockers = allTasks
      .filter((t) => t.isBlocked)
      .map((t) => ({
        id: t.id,
        title: t.title,
        assignee: t.assigneeId ?? undefined,
      }));

    // Velocity (trailing 4 weeks)
    const velocity: number[] = [];
    for (let w = 3; w >= 0; w--) {
      const weekStart = new Date(
        now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000
      );
      const weekEnd = new Date(
        now.getTime() - w * 7 * 24 * 60 * 60 * 1000
      );
      const count = allTasks.filter((t) => {
        if (!t.completedAt) return false;
        const completed = new Date(t.completedAt);
        return completed >= weekStart && completed < weekEnd;
      }).length;
      velocity.push(count);
    }

    // Upcoming deadlines (next 7 days)
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

    // Recent activity
    const recentActivity = activityResult.data.map((a) => ({
      type: a.type,
      description: `${a.type} on ${a.taskId ?? a.projectId ?? "org"}`,
      createdAt: new Date(a.createdAt).toISOString(),
    }));

    // ── Build report data ────────────────────────────────
    const reportData: ReportData = {
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

    // ── Generate report narrative ────────────────────────
    const result = await generateReport(question, reportData, {
      role: "member",
      name: action.userId,
      date: now.toISOString().split("T")[0],
    });

    return {
      success: true,
      result: {
        narrative: result.narrative,
        generatedAt: result.generatedAt,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return {
      success: false,
      error: `Report generation failed: ${message}`,
    };
  }
}
