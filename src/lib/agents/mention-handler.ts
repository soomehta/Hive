/**
 * @mention processing pipeline.
 * On message creation: parse mentions → store mention rows → create notifications → enqueue agent jobs.
 */

import { db } from "@/lib/db";
import { mentions } from "@/lib/db/schema";
import { createNotification } from "@/lib/notifications/in-app";
import type { ParsedMention } from "@/lib/utils/mention-parser";

type MentionSourceType = "chat_message" | "thread_message" | "task_comment";

interface ProcessMentionsParams {
  orgId: string;
  sourceType: MentionSourceType;
  sourceId: string;
  parsedMentions: ParsedMention[];
  authorId: string;
  channelId?: string;
}

/**
 * Store parsed mentions in the database and trigger notifications/agent jobs.
 */
export async function processMentions(params: ProcessMentionsParams) {
  const { orgId, sourceType, sourceId, parsedMentions, authorId, channelId } =
    params;

  if (parsedMentions.length === 0) return;

  // Insert mention rows
  await db.insert(mentions).values(
    parsedMentions.map((m) => ({
      orgId,
      sourceType,
      sourceId,
      mentionType: m.type,
      targetId: m.targetId,
      displayText: m.displayText,
      startOffset: m.startOffset,
      endOffset: m.endOffset,
    }))
  );

  // Create notifications for @user mentions
  for (const mention of parsedMentions) {
    if (mention.type === "user" && mention.targetId !== authorId) {
      await createNotification({
        userId: mention.targetId,
        orgId,
        type: "task_commented", // reuse existing notification type for mentions
        title: `You were mentioned in a ${sourceType.replace("_", " ")}`,
        metadata: {
          sourceType,
          sourceId,
          mentionedBy: authorId,
        },
      });
    }
  }

  // For @agent mentions: enqueue agent mention job via BullMQ
  // The actual queue enqueue is done by the caller since we don't
  // want a hard dependency on BullMQ in this module.
  const agentMentions = parsedMentions.filter((m) => m.type === "agent");
  return { agentMentions };
}
