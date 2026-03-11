import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";

interface PostAgentMessageParams {
  channelId: string;
  orgId: string;
  beeInstanceId: string;
  content: string;
  metadata?: {
    agentName?: string;
    agentType?: string;
    avatarUrl?: string;
    checkinId?: string;
    reportId?: string;
  };
}

// Rate limit: max 10 agent messages per user per hour
const agentMessageCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(channelId: string): boolean {
  const now = Date.now();
  const entry = agentMessageCounts.get(channelId);
  if (!entry || now > entry.resetAt) {
    agentMessageCounts.set(channelId, { count: 1, resetAt: now + 3600_000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count++;
  return true;
}

export async function postAgentMessage(params: PostAgentMessageParams) {
  if (!checkRateLimit(params.channelId)) {
    throw new Error("Agent message rate limit exceeded for this channel");
  }

  const [message] = await db
    .insert(chatMessages)
    .values({
      orgId: params.orgId,
      channelId: params.channelId,
      authorId: `agent:${params.beeInstanceId}`,
      content: params.content,
      isAgentMessage: true,
      agentBeeInstanceId: params.beeInstanceId,
      agentMetadata: params.metadata ?? {},
    })
    .returning();

  return message;
}
