import { Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { AgentScheduleJob } from "@/lib/queue/jobs";
import { postAgentMessage } from "@/lib/agents/channel-messenger";
import { db } from "@/lib/db";
import {
  agentReports,
  agentSchedules,
  beeInstances,
  chatChannels,
} from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import {
  getWorkspaceTaskSummary,
  getWorkspaceVelocity,
  getWorkspaceBlockers,
  getTeamMemberActivity,
} from "@/lib/data/workspace-metrics";
import { logActivity } from "@/lib/db/queries/activity";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const { worker, log } = createTypedWorker<AgentScheduleJob>(
  "agent-schedule",
  QUEUE_NAMES.AGENT_SCHEDULE,
  async (job: Job<AgentScheduleJob>) => {
    const { scheduleId, orgId, workspaceId, beeInstanceId, scheduleType } =
      job.data;

    log.info({ jobId: job.id, scheduleType, workspaceId }, "Processing agent schedule");

    // Find the agent's channel in this workspace
    const agentChannel = await db.query.chatChannels.findFirst({
      where: and(
        eq(chatChannels.orgId, orgId),
        eq(chatChannels.workspaceId, workspaceId),
        eq(chatChannels.scope, "agent")
      ),
    });

    const instance = await db.query.beeInstances.findFirst({
      where: eq(beeInstances.id, beeInstanceId),
    });

    if (scheduleType === "daily_standup") {
      await generateStandup(orgId, workspaceId, beeInstanceId, agentChannel?.id, instance?.name ?? "PM Agent");
    } else if (scheduleType === "weekly_report") {
      await generateWeeklyReport(orgId, workspaceId, beeInstanceId, agentChannel?.id, instance?.name ?? "PM Agent");
    }
    // checkin_sweep is handled separately by the checkin worker

    // Update last_run_at
    await db
      .update(agentSchedules)
      .set({ lastRunAt: new Date() })
      .where(eq(agentSchedules.id, scheduleId));

    return { success: true, scheduleType };
  },
  { concurrency: 2 }
);

async function generateStandup(
  orgId: string,
  workspaceId: string,
  beeInstanceId: string,
  channelId: string | undefined,
  agentName: string
) {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const [taskSummary, blockers] = await Promise.all([
    getWorkspaceTaskSummary(workspaceId, orgId, { start: yesterday, end: now }),
    getWorkspaceBlockers(workspaceId, orgId),
  ]);

  const prompt = `Generate a concise daily standup summary based on this data:

Task Summary (last 24h):
- Todo: ${taskSummary.todo}
- In Progress: ${taskSummary.in_progress}
- In Review: ${taskSummary.in_review}
- Done: ${taskSummary.done}
- Total: ${taskSummary.total}

Active Blockers: ${blockers.length > 0 ? blockers.map((b) => `"${b.title}" (${b.blockedReason ?? "no reason given"})`).join(", ") : "None"}

Date: ${now.toISOString().split("T")[0]}

Format as a brief daily standup. Lead with highlights, then blockers, then outlook.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 500,
    messages: [{ role: "user", content: prompt }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  // Store report
  await db.insert(agentReports).values({
    orgId,
    workspaceId,
    beeInstanceId,
    reportType: "daily_standup",
    title: `Daily Standup - ${now.toISOString().split("T")[0]}`,
    content,
    contentJson: { taskSummary, blockerCount: blockers.length },
    channelId,
    period: { start: yesterday.toISOString(), end: now.toISOString() },
  });

  // Post to channel
  if (channelId) {
    await postAgentMessage({
      channelId,
      orgId,
      beeInstanceId,
      content,
      metadata: { agentName, agentType: "PM Agent" },
    });
  }

  await logActivity({
    orgId,
    userId: `agent:${beeInstanceId}`,
    type: "agent_report_generated",
    metadata: { reportType: "daily_standup", workspaceId },
  });
}

async function generateWeeklyReport(
  orgId: string,
  workspaceId: string,
  beeInstanceId: string,
  channelId: string | undefined,
  agentName: string
) {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [taskSummary, velocity, blockers, teamActivity] = await Promise.all([
    getWorkspaceTaskSummary(workspaceId, orgId, { start: weekAgo, end: now }),
    getWorkspaceVelocity(workspaceId, orgId, 4),
    getWorkspaceBlockers(workspaceId, orgId),
    getTeamMemberActivity(workspaceId, orgId, { start: weekAgo, end: now }),
  ]);

  const prompt = `Generate a weekly project management report based on this data:

Task Summary (this week):
- Todo: ${taskSummary.todo}
- In Progress: ${taskSummary.in_progress}
- In Review: ${taskSummary.in_review}
- Done: ${taskSummary.done}
- Total: ${taskSummary.total}

Velocity (recent weeks): ${JSON.stringify(velocity)}

Active Blockers: ${blockers.length}

Team Activity (this week): ${teamActivity.map((t) => `${t.userId}: ${t.count} actions`).join(", ")}

Week ending: ${now.toISOString().split("T")[0]}

Format as a structured weekly report with sections: Summary, Velocity Trend, Blockers, Team Contributions, Upcoming Focus.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const content =
    response.content[0].type === "text" ? response.content[0].text.trim() : "";

  await db.insert(agentReports).values({
    orgId,
    workspaceId,
    beeInstanceId,
    reportType: "weekly_report",
    title: `Weekly Report - Week ending ${now.toISOString().split("T")[0]}`,
    content,
    contentJson: { taskSummary, velocity, blockerCount: blockers.length },
    channelId,
    period: { start: weekAgo.toISOString(), end: now.toISOString() },
  });

  if (channelId) {
    await postAgentMessage({
      channelId,
      orgId,
      beeInstanceId,
      content,
      metadata: { agentName, agentType: "PM Agent" },
    });
  }

  await logActivity({
    orgId,
    userId: `agent:${beeInstanceId}`,
    type: "agent_report_generated",
    metadata: { reportType: "weekly_report", workspaceId },
  });
}

export { worker as agentScheduleWorker };
