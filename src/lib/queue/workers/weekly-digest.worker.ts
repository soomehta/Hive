import { Job } from "bullmq";
import { QUEUE_NAMES, getNotificationQueue } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { DigestJob, NotificationJob } from "@/lib/queue/jobs";
import { generateReport, type ReportData } from "@/lib/ai/report-generator";
import { getTasks } from "@/lib/db/queries/tasks";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

const { worker, log } = createTypedWorker<DigestJob>(
  "weekly-digest",
  QUEUE_NAMES.DIGEST,
  async (job: Job<DigestJob>) => {
    const { userId, orgId } = job.data;

    log.info(
      { jobId: job.id, userId, orgId },
      "Processing weekly digest"
    );

    // 1. Fetch user's PA profile for preferences
    const profile = await getOrCreatePaProfile(userId, orgId);

    // 2. Calculate the past week's date range
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 3. Aggregate weekly data

    // Tasks completed this week
    const completedThisWeek = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, orgId),
          eq(tasks.assigneeId, userId),
          eq(tasks.status, "done"),
          gte(tasks.completedAt, weekAgo),
          lte(tasks.completedAt, now)
        )
      );

    // Tasks created this week assigned to the user
    const createdThisWeek = await db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.orgId, orgId),
          eq(tasks.assigneeId, userId),
          gte(tasks.createdAt, weekAgo)
        )
      );

    // Current open tasks
    const { data: openTasks } = await getTasks({
      orgId,
      assigneeId: userId,
      limit: 100,
    });

    const activeTasks = openTasks.filter(
      (t) => t.status !== "done" && t.status !== "cancelled"
    );

    // Blocked tasks
    const blockedTasks = activeTasks.filter((t) => t.isBlocked);

    // Overdue tasks
    const overdueTasks = activeTasks.filter(
      (t) => t.dueDate && new Date(t.dueDate) < now
    );

    // Activity count for the week
    const { data: weeklyActivity } = await getActivityFeed({
      orgId,
      userId,
      limit: 100,
    });

    // Filter to this week only
    const weeklyActivityCount = weeklyActivity.filter(
      (a) => new Date(a.createdAt) >= weekAgo
    ).length;

    // Calculate velocity (tasks completed per week)
    const velocity = completedThisWeek.length;

    // 4. Build report data for the digest
    const tasksByStatus: Record<string, number> = {};
    const tasksByPriority: Record<string, number> = {};
    const tasksByAssignee: Record<string, number> = {};
    const workloadByPerson: Record<string, number> = {};

    for (const t of activeTasks) {
      tasksByStatus[t.status] = (tasksByStatus[t.status] ?? 0) + 1;
      tasksByPriority[t.priority] = (tasksByPriority[t.priority] ?? 0) + 1;
      if (t.assigneeId) {
        tasksByAssignee[t.assigneeId] = (tasksByAssignee[t.assigneeId] ?? 0) + 1;
        workloadByPerson[t.assigneeId] = (workloadByPerson[t.assigneeId] ?? 0) + 1;
      }
    }

    const total = activeTasks.length + completedThisWeek.length;
    const completionRate = total > 0 ? completedThisWeek.length / total : 0;

    const reportData: ReportData = {
      tasksByStatus,
      tasksByAssignee,
      tasksByPriority,
      completionRate,
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate?.toISOString() ?? "",
      })),
      blockers: blockedTasks.map((t) => ({
        id: t.id,
        title: t.title,
      })),
      velocity: [velocity],
      upcomingDeadlines: activeTasks
        .filter((t) => t.dueDate && new Date(t.dueDate) > now)
        .slice(0, 5)
        .map((t) => ({
          id: t.id,
          title: t.title,
          dueDate: t.dueDate!.toISOString(),
        })),
      workloadByPerson,
      recentActivity: [],
    };

    const digestResult = await generateReport(
      "Give me a weekly digest summary. What did the team accomplish this week, what's at risk, and what should we focus on next week?",
      reportData,
      { role: "member", name: userId, date: now.toISOString().split("T")[0] }
    );

    // 5. Send digest as a notification
    const notificationJob: NotificationJob = {
      userId,
      orgId,
      type: "pa_report_ready",
      title: "Your weekly digest is ready",
      body: digestResult.narrative,
      channel: (profile.notificationChannel as "in_app" | "email" | "slack") ?? "in_app",
      metadata: {
        digestType: "weekly",
        periodStart: weekAgo.toISOString(),
        periodEnd: now.toISOString(),
        tasksCompleted: completedThisWeek.length,
        velocity,
        openTasks: activeTasks.length,
        blockedTasks: blockedTasks.length,
      },
    };

    await getNotificationQueue().add("weekly-digest", notificationJob);

    log.info(
      { jobId: job.id, digestLength: digestResult.narrative.length, velocity },
      "Digest generated"
    );

    return {
      userId,
      digestLength: digestResult.narrative.length,
      stats: {
        tasksCompleted: completedThisWeek.length,
        tasksCreated: createdThisWeek.length,
        openTasks: activeTasks.length,
        blockedTasks: blockedTasks.length,
        overdueTasks: overdueTasks.length,
        velocity,
        activityCount: weeklyActivityCount,
      },
    };
  },
  { concurrency: 3 }
);

export { worker as weeklyDigestWorker };
