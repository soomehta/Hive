import { Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { AgentCheckinJob } from "@/lib/queue/jobs";
import { postAgentMessage } from "@/lib/agents/channel-messenger";
import { generateCheckinQuestion } from "@/lib/agents/checkin-questions";
import { db } from "@/lib/db";
import { agentCheckins, tasks, taskComments } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { logActivity } from "@/lib/db/queries/activity";

const { worker, log } = createTypedWorker<AgentCheckinJob>(
  "agent-checkin",
  QUEUE_NAMES.AGENT_CHECKIN,
  async (job: Job<AgentCheckinJob>) => {
    const { checkinId, orgId, workspaceId, taskId, assigneeUserId, beeInstanceId, channelId } =
      job.data;

    log.info({ jobId: job.id, taskId, assigneeUserId }, "Processing check-in");

    // Load task details
    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.orgId, orgId)),
    });

    if (!task) {
      log.warn({ taskId }, "Task not found, skipping check-in");
      return { skipped: true, reason: "task_not_found" };
    }

    // Skip done/cancelled
    if (task.status === "done" || task.status === "cancelled") {
      log.info({ taskId, status: task.status }, "Task completed, skipping");
      await db
        .update(agentCheckins)
        .set({ status: "expired" })
        .where(eq(agentCheckins.id, checkinId));
      return { skipped: true, reason: "task_completed" };
    }

    // Load recent comments
    const recentComments = await db
      .select({ content: taskComments.content })
      .from(taskComments)
      .where(eq(taskComments.taskId, taskId))
      .orderBy(desc(taskComments.createdAt))
      .limit(5);

    // Load previous check-ins
    const previousCheckins = await db
      .select({
        question: agentCheckins.question,
        response: agentCheckins.response,
      })
      .from(agentCheckins)
      .where(
        and(
          eq(agentCheckins.taskId, taskId),
          eq(agentCheckins.assigneeUserId, assigneeUserId)
        )
      )
      .orderBy(desc(agentCheckins.createdAt))
      .limit(3);

    // Calculate time remaining
    const timeRemaining = task.dueDate
      ? getTimeRemaining(new Date(task.dueDate))
      : null;

    // Generate contextual question
    const question = await generateCheckinQuestion({
      taskTitle: task.title,
      taskDescription: task.description,
      taskStatus: task.status,
      taskPriority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : null,
      recentActivity: [],
      recentComments: recentComments.map((c) => c.content),
      previousCheckins: previousCheckins.map((c) => ({
        question: c.question,
        response: c.response,
      })),
      timeRemaining,
    });

    // Post to user's agent channel
    const message = await postAgentMessage({
      channelId,
      orgId,
      beeInstanceId,
      content: `📋 **Check-in: ${task.title}**\n\n${question}`,
      metadata: {
        agentName: "PM Agent",
        agentType: "check-in",
        checkinId,
      },
    });

    // Update check-in with message reference
    await db
      .update(agentCheckins)
      .set({
        question,
        messageId: message.id,
        channelId,
      })
      .where(eq(agentCheckins.id, checkinId));

    await logActivity({
      orgId,
      taskId,
      userId: `agent:${beeInstanceId}`,
      type: "agent_checkin_sent",
      metadata: { checkinId, assigneeUserId, taskTitle: task.title },
    });

    log.info({ jobId: job.id, checkinId, messageId: message.id }, "Check-in sent");
    return { success: true, messageId: message.id };
  },
  { concurrency: 5 }
);

function getTimeRemaining(dueDate: Date): string {
  const now = new Date();
  const diff = dueDate.getTime() - now.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 0) return "overdue";
  if (hours < 24) return `${hours} hours`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"}`;
}

export { worker as agentCheckinWorker };
