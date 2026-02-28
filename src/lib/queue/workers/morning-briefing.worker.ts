import { Job } from "bullmq";
import { QUEUE_NAMES, getNotificationQueue } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { BriefingJob, NotificationJob } from "@/lib/queue/jobs";
import { generateBriefing, type BriefingContext } from "@/lib/ai/briefing-generator";
import { getTasks } from "@/lib/db/queries/tasks";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import { getActivityFeed } from "@/lib/db/queries/activity";
import { resolveUserMeta } from "@/lib/utils/user-resolver";

const { worker, log } = createTypedWorker<BriefingJob>(
  "morning-briefing",
  QUEUE_NAMES.BRIEFING,
  async (job: Job<BriefingJob>) => {
    const { userId, orgId } = job.data;

    log.info(
      { jobId: job.id, userId, orgId },
      "Processing morning briefing"
    );

    // 1. Fetch user's PA profile for preferences
    const profile = await getOrCreatePaProfile(userId, orgId);

    // 2. Gather user context data

    // Tasks assigned to the user
    const { data: myTasks } = await getTasks({
      orgId,
      assigneeId: userId,
      limit: 50,
    });

    // Overdue tasks (due date in the past, not completed)
    const now = new Date();
    const overdueTasks = myTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate) < now &&
        t.status !== "done" &&
        t.status !== "cancelled"
    );

    // Tasks due today
    const todayStr = now.toISOString().slice(0, 10);
    const dueTodayTasks = myTasks.filter(
      (t) =>
        t.dueDate &&
        new Date(t.dueDate).toISOString().slice(0, 10) === todayStr &&
        t.status !== "done" &&
        t.status !== "cancelled"
    );

    // In-progress tasks
    const inProgressTasks = myTasks.filter((t) => t.status === "in_progress");

    // Blocked tasks
    const blockedTasks = myTasks.filter((t) => t.isBlocked);

    // Recent activity (last 24 hours)
    const { data: recentActivity } = await getActivityFeed({
      orgId,
      userId,
      limit: 20,
    });

    // 3. Resolve user display name
    const userMeta = await resolveUserMeta(userId);

    // 4. Generate the briefing using AI
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const briefingContext: BriefingContext = {
      userName: userMeta.displayName,
      firstName: userMeta.firstName,
      date: todayStr,
      dayOfWeek: days[now.getDay()],
      timezone: profile.timezone,
      todayTasks: dueTodayTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString(),
      })),
      weekTasks: inProgressTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
      })),
      overdueTasks: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.dueDate?.toISOString() ?? todayStr,
      })),
      meetings: [],
      recentActivity: recentActivity.map((a) => ({
        type: a.type,
        description: `Activity ${a.type}`,
        createdAt: a.createdAt.toISOString(),
      })),
      blockers: blockedTasks.map((t) => ({
        id: t.id,
        title: t.title,
        reason: t.blockedReason ?? undefined,
      })),
    };

    const briefingResult = await generateBriefing(briefingContext);

    // 4. Send briefing as a notification
    const notificationJob: NotificationJob = {
      userId,
      orgId,
      type: "pa_briefing",
      title: "Good morning! Here's your daily briefing",
      body: briefingResult.briefing,
      channel: (profile.notificationChannel as "in_app" | "email" | "slack") ?? "in_app",
      metadata: {
        briefingType: "morning",
        taskCount: myTasks.length,
        overdueCount: overdueTasks.length,
        dueTodayCount: dueTodayTasks.length,
        blockedCount: blockedTasks.length,
      },
    };

    await getNotificationQueue().add("morning-briefing", notificationJob);

    log.info(
      { jobId: job.id, briefingLength: briefingResult.briefing.length },
      "Briefing generated"
    );

    return {
      userId,
      briefingLength: briefingResult.briefing.length,
      stats: {
        totalTasks: myTasks.length,
        overdue: overdueTasks.length,
        dueToday: dueTodayTasks.length,
        inProgress: inProgressTasks.length,
        blocked: blockedTasks.length,
      },
    };
  },
  { concurrency: 3 }
);

export { worker as morningBriefingWorker };
