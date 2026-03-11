import { Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { AgentMentionJob } from "@/lib/queue/jobs";
import { postAgentMessage } from "@/lib/agents/channel-messenger";
import { db } from "@/lib/db";
import { beeInstances, beeTemplates, chatMessages } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

const { worker, log } = createTypedWorker<AgentMentionJob>(
  "agent-mention",
  QUEUE_NAMES.AGENT_MENTION,
  async (job: Job<AgentMentionJob>) => {
    const { orgId, channelId, messageContent, authorId, beeInstanceId } =
      job.data;

    // Loop prevention: skip if message author is an agent
    if (authorId.startsWith("agent:")) {
      log.info({ jobId: job.id }, "Skipping agent-authored mention (loop prevention)");
      return { skipped: true };
    }

    // Load bee instance + template
    const instance = await db.query.beeInstances.findFirst({
      where: and(
        eq(beeInstances.id, beeInstanceId),
        eq(beeInstances.orgId, orgId)
      ),
    });

    if (!instance) {
      log.warn({ beeInstanceId }, "Bee instance not found");
      return { error: "instance_not_found" };
    }

    const template = await db.query.beeTemplates.findFirst({
      where: eq(beeTemplates.id, instance.templateId),
    });

    if (!template) {
      log.warn({ templateId: instance.templateId }, "Template not found");
      return { error: "template_not_found" };
    }

    // Load recent channel context (last 10 messages)
    const recentMessages = await db
      .select({ content: chatMessages.content, authorId: chatMessages.authorId })
      .from(chatMessages)
      .where(and(eq(chatMessages.orgId, orgId), eq(chatMessages.channelId, channelId)))
      .orderBy(desc(chatMessages.createdAt))
      .limit(10);

    const contextMessages = recentMessages
      .reverse()
      .map((m) => `${m.authorId}: ${m.content}`)
      .join("\n");

    // Call Claude Sonnet
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: template.systemPrompt,
      messages: [
        {
          role: "user",
          content: `Recent channel messages:\n${contextMessages}\n\nA user mentioned you with this message:\n${messageContent}\n\nRespond helpfully and concisely.`,
        },
      ],
    });

    const responseText =
      response.content[0].type === "text"
        ? response.content[0].text.trim()
        : "I'm not sure how to respond to that.";

    // Post response to channel
    await postAgentMessage({
      channelId,
      orgId,
      beeInstanceId,
      content: responseText,
      metadata: {
        agentName: instance.name,
        agentType: template.type,
      },
    });

    log.info({ jobId: job.id, channelId }, "Agent mention response posted");
    return { success: true };
  },
  { concurrency: 3 }
);

export { worker as agentMentionWorker };
