import { getTasks } from "@/lib/db/queries/tasks";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { getNotices } from "@/lib/db/queries/notices";

// ─── Types ───────────────────────────────────────────────

export interface BriefingTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
}

export interface BriefingOverdueTask {
  id: string;
  title: string;
  dueDate: string;
}

export interface BriefingBlocker {
  id: string;
  title: string;
  reason?: string;
}

export interface BriefingActivity {
  type: string;
  description: string;
  createdAt: string;
}

export interface BriefingNotice {
  id: string;
  title: string;
  isPinned: boolean;
  status: string;
}

export interface BriefingData {
  todayTasks: BriefingTask[];
  weekTasks: BriefingTask[];
  overdueTasks: BriefingOverdueTask[];
  blockers: BriefingBlocker[];
  recentActivity: BriefingActivity[];
  totalActiveTasks: number;
  /** Active/pinned notices for digest inclusion */
  activeNotices: BriefingNotice[];
}

// ─── Shared Aggregator ───────────────────────────────────

/**
 * Fetches and categorizes task and activity data needed for a morning briefing.
 * Used by both the cron job (morning-briefing) and the on-demand briefing API.
 *
 * @param userId    The user whose tasks should be fetched.
 * @param orgId     The org scope for task and activity queries.
 * @param timezone  IANA timezone string (e.g. "America/New_York"). Defaults to "UTC".
 */
export async function aggregateBriefingData(
  userId: string,
  orgId: string,
  timezone = "UTC"
): Promise<BriefingData> {
  const now = new Date();

  // Compute the current date boundaries in the user's local timezone
  const userNow = new Date(now.toLocaleString("en-US", { timeZone: timezone }));
  const todayStart = new Date(
    userNow.getFullYear(),
    userNow.getMonth(),
    userNow.getDate()
  );
  const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [myTasksResult, activityResult, noticesResult] = await Promise.all([
    getTasks({ orgId, assigneeId: userId, limit: 100 }),
    getActivityFeed({ orgId, limit: 30 }),
    getNotices(orgId).catch(() => []),
  ]);

  const myTasks = myTasksResult.data;

  // ── Tasks due today ──────────────────────────────────
  const todayTasks: BriefingTask[] = myTasks
    .filter((t) => {
      if (!t.dueDate || t.status === "done" || t.status === "cancelled")
        return false;
      const due = new Date(t.dueDate);
      return due >= todayStart && due < todayEnd;
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate
        ? new Date(t.dueDate).toISOString().split("T")[0]
        : undefined,
    }));

  // ── Tasks due this week (after today) ─────────────────
  const weekTasks: BriefingTask[] = myTasks
    .filter((t) => {
      if (!t.dueDate || t.status === "done" || t.status === "cancelled")
        return false;
      const due = new Date(t.dueDate);
      return due >= todayEnd && due < weekEnd;
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate
        ? new Date(t.dueDate).toISOString().split("T")[0]
        : undefined,
    }));

  // ── Overdue tasks ─────────────────────────────────────
  const overdueTasks: BriefingOverdueTask[] = myTasks
    .filter((t) => {
      if (!t.dueDate || t.status === "done" || t.status === "cancelled")
        return false;
      return new Date(t.dueDate) < todayStart;
    })
    .map((t) => ({
      id: t.id,
      title: t.title,
      dueDate: new Date(t.dueDate!).toISOString().split("T")[0],
    }));

  // ── Blocked tasks ─────────────────────────────────────
  const blockers: BriefingBlocker[] = myTasks
    .filter((t) => t.isBlocked)
    .map((t) => ({
      id: t.id,
      title: t.title,
      reason: t.blockedReason ?? undefined,
    }));

  // ── Recent activity (last 24h) ────────────────────────
  const recentActivity: BriefingActivity[] = activityResult.data
    .filter((a) => new Date(a.createdAt) >= oneDayAgo)
    .map((a) => ({
      type: a.type,
      description: `${a.type} on ${a.taskId ?? a.projectId ?? "org"}`,
      createdAt: new Date(a.createdAt).toISOString(),
    }));

  const totalActiveTasks = myTasks.filter(
    (t) => t.status !== "done" && t.status !== "cancelled"
  ).length;

  // Active/pinned notices for digest
  const activeNotices: BriefingNotice[] = noticesResult
    .filter((n) => n.status === "active")
    .slice(0, 5)
    .map((n) => ({
      id: n.id,
      title: n.title,
      isPinned: n.isPinned,
      status: n.status,
    }));

  return {
    todayTasks,
    weekTasks,
    overdueTasks,
    blockers,
    recentActivity,
    totalActiveTasks,
    activeNotices,
  };
}
