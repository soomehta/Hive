import { db } from "@/lib/db";
import {
  chatChannels,
  chatChannelMembers,
  chatMessages,
  chatThreads,
  chatThreadMessages,
  messageReactions,
} from "@/lib/db/schema";
import { and, asc, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";

export type ChannelScope = "team" | "project" | "workspace" | "agent";
export type ChannelMemberRole = "owner" | "moderator" | "member";

export async function getChannels(orgId: string, projectId?: string) {
  return db
    .select()
    .from(chatChannels)
    .where(
      projectId
        ? and(eq(chatChannels.orgId, orgId), eq(chatChannels.projectId, projectId))
        : eq(chatChannels.orgId, orgId)
    )
    .orderBy(asc(chatChannels.name));
}

export async function getChannelsForUser(orgId: string, userId: string, projectId?: string) {
  const conditions = [
    eq(chatChannels.orgId, orgId),
    eq(chatChannelMembers.userId, userId),
  ];
  if (projectId) conditions.push(eq(chatChannels.projectId, projectId));

  return db
    .select({
      id: chatChannels.id,
      orgId: chatChannels.orgId,
      projectId: chatChannels.projectId,
      scope: chatChannels.scope,
      name: chatChannels.name,
      topic: chatChannels.topic,
      isArchived: chatChannels.isArchived,
      createdBy: chatChannels.createdBy,
      createdAt: chatChannels.createdAt,
      updatedAt: chatChannels.updatedAt,
    })
    .from(chatChannels)
    .innerJoin(chatChannelMembers, eq(chatChannels.id, chatChannelMembers.channelId))
    .where(and(...conditions))
    .orderBy(asc(chatChannels.name));
}

export async function getChannelById(orgId: string, channelId: string) {
  return db.query.chatChannels.findFirst({
    where: and(eq(chatChannels.orgId, orgId), eq(chatChannels.id, channelId)),
  });
}

export async function createChannel(data: {
  orgId: string;
  projectId?: string;
  scope: ChannelScope;
  name: string;
  topic?: string;
  createdBy: string;
}) {
  return db.transaction(async (tx) => {
    const [channel] = await tx
      .insert(chatChannels)
      .values({
        orgId: data.orgId,
        projectId: data.projectId,
        scope: data.scope,
        name: data.name,
        topic: data.topic,
        createdBy: data.createdBy,
      })
      .returning();

    await tx.insert(chatChannelMembers).values({
      orgId: data.orgId,
      channelId: channel.id,
      userId: data.createdBy,
      role: "owner",
    });

    return channel;
  });
}

export async function updateChannel(
  orgId: string,
  channelId: string,
  data: Partial<{ name: string; topic: string | null; isArchived: boolean }>
) {
  const [updated] = await db
    .update(chatChannels)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(chatChannels.orgId, orgId), eq(chatChannels.id, channelId)))
    .returning();

  return updated;
}

export async function addChannelMember(data: {
  orgId: string;
  channelId: string;
  userId: string;
  role?: ChannelMemberRole;
}) {
  const [created] = await db
    .insert(chatChannelMembers)
    .values({
      orgId: data.orgId,
      channelId: data.channelId,
      userId: data.userId,
      role: data.role ?? "member",
    })
    .returning();

  return created;
}

export async function getChannelMembers(orgId: string, channelId: string) {
  return db
    .select()
    .from(chatChannelMembers)
    .where(
      and(
        eq(chatChannelMembers.orgId, orgId),
        eq(chatChannelMembers.channelId, channelId)
      )
    )
    .orderBy(asc(chatChannelMembers.createdAt));
}

export async function isChannelMember(orgId: string, channelId: string, userId: string) {
  const member = await db.query.chatChannelMembers.findFirst({
    where: and(
      eq(chatChannelMembers.orgId, orgId),
      eq(chatChannelMembers.channelId, channelId),
      eq(chatChannelMembers.userId, userId)
    ),
  });

  return !!member;
}

export async function removeChannelMember(orgId: string, channelId: string, userId: string) {
  const [deleted] = await db
    .delete(chatChannelMembers)
    .where(
      and(
        eq(chatChannelMembers.orgId, orgId),
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId)
      )
    )
    .returning();

  return deleted;
}

export async function listChannelMessages(
  orgId: string,
  channelId: string,
  limit = 50,
  before?: string
) {
  const conditions = [
    eq(chatMessages.orgId, orgId),
    eq(chatMessages.channelId, channelId),
  ];

  if (before) {
    // Get the createdAt of the cursor message
    const cursorMsg = await db.query.chatMessages.findFirst({
      where: and(eq(chatMessages.orgId, orgId), eq(chatMessages.id, before)),
      columns: { createdAt: true },
    });
    if (cursorMsg) {
      conditions.push(sql`${chatMessages.createdAt} < ${cursorMsg.createdAt}`);
    }
  }

  return db
    .select()
    .from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function getChannelMessageById(orgId: string, messageId: string) {
  return db.query.chatMessages.findFirst({
    where: and(eq(chatMessages.orgId, orgId), eq(chatMessages.id, messageId)),
  });
}

export async function postChannelMessage(data: {
  orgId: string;
  channelId: string;
  authorId: string;
  content: string;
  contentJson?: Record<string, unknown>;
}) {
  const [created] = await db
    .insert(chatMessages)
    .values({
      orgId: data.orgId,
      channelId: data.channelId,
      authorId: data.authorId,
      content: data.content,
      contentJson: data.contentJson,
    })
    .returning();

  return created;
}

export async function createThread(orgId: string, channelId: string, rootMessageId: string) {
  const existing = await db.query.chatThreads.findFirst({
    where: and(
      eq(chatThreads.orgId, orgId),
      eq(chatThreads.channelId, channelId),
      eq(chatThreads.rootMessageId, rootMessageId)
    ),
  });

  if (existing) return existing;

  const [created] = await db
    .insert(chatThreads)
    .values({
      orgId,
      channelId,
      rootMessageId,
    })
    .returning();

  return created;
}

export async function getThreadById(orgId: string, threadId: string) {
  return db.query.chatThreads.findFirst({
    where: and(eq(chatThreads.orgId, orgId), eq(chatThreads.id, threadId)),
  });
}

export async function listThreadMessages(orgId: string, threadId: string) {
  return db
    .select()
    .from(chatThreadMessages)
    .where(
      and(
        eq(chatThreadMessages.orgId, orgId),
        eq(chatThreadMessages.threadId, threadId)
      )
    )
    .orderBy(asc(chatThreadMessages.createdAt));
}

export async function postThreadMessage(data: {
  orgId: string;
  threadId: string;
  authorId: string;
  content: string;
}) {
  const [created] = await db
    .insert(chatThreadMessages)
    .values({
      orgId: data.orgId,
      threadId: data.threadId,
      authorId: data.authorId,
      content: data.content,
    })
    .returning();

  return created;
}

export async function updateChannelMessage(
  orgId: string,
  messageId: string,
  data: { content: string; contentJson?: Record<string, unknown> }
) {
  const [updated] = await db
    .update(chatMessages)
    .set({
      content: data.content,
      contentJson: data.contentJson,
      editedAt: new Date(),
    })
    .where(and(eq(chatMessages.orgId, orgId), eq(chatMessages.id, messageId)))
    .returning();

  return updated;
}

export async function softDeleteChannelMessage(orgId: string, messageId: string) {
  const [updated] = await db
    .update(chatMessages)
    .set({ deletedAt: new Date() })
    .where(and(eq(chatMessages.orgId, orgId), eq(chatMessages.id, messageId)))
    .returning();

  return updated;
}

export async function updateThreadMessage(
  orgId: string,
  messageId: string,
  data: { content: string }
) {
  const [updated] = await db
    .update(chatThreadMessages)
    .set({
      content: data.content,
      editedAt: new Date(),
    })
    .where(
      and(
        eq(chatThreadMessages.orgId, orgId),
        eq(chatThreadMessages.id, messageId)
      )
    )
    .returning();

  return updated;
}

export async function getThreadMessageById(orgId: string, messageId: string) {
  return db.query.chatThreadMessages.findFirst({
    where: and(
      eq(chatThreadMessages.orgId, orgId),
      eq(chatThreadMessages.id, messageId)
    ),
  });
}

export async function deleteThreadMessage(orgId: string, messageId: string) {
  const [deleted] = await db
    .delete(chatThreadMessages)
    .where(
      and(
        eq(chatThreadMessages.orgId, orgId),
        eq(chatThreadMessages.id, messageId)
      )
    )
    .returning();
  return deleted;
}

export async function searchChannelMessages(
  orgId: string,
  channelIds: string[],
  query: string,
  limit = 20,
) {
  if (channelIds.length === 0) return [];
  return db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.orgId, orgId),
        inArray(chatMessages.channelId, channelIds),
        ilike(chatMessages.content, `%${query}%`),
      ),
    )
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function toggleMessagePin(orgId: string, messageId: string, isPinned: boolean) {
  const [updated] = await db
    .update(chatMessages)
    .set({ isPinned })
    .where(and(eq(chatMessages.orgId, orgId), eq(chatMessages.id, messageId)))
    .returning();
  return updated;
}

export async function markChannelRead(orgId: string, channelId: string, userId: string) {
  const [updated] = await db
    .update(chatChannelMembers)
    .set({ lastReadAt: new Date() })
    .where(
      and(
        eq(chatChannelMembers.orgId, orgId),
        eq(chatChannelMembers.channelId, channelId),
        eq(chatChannelMembers.userId, userId),
      ),
    )
    .returning();
  return updated;
}

export async function getUnreadCounts(orgId: string, userId: string) {
  const rows = await db
    .select({
      channelId: chatChannelMembers.channelId,
      count: sql<number>`count(${chatMessages.id})::int`,
    })
    .from(chatChannelMembers)
    .leftJoin(
      chatMessages,
      and(
        eq(chatMessages.channelId, chatChannelMembers.channelId),
        eq(chatMessages.orgId, chatChannelMembers.orgId),
        isNull(chatMessages.deletedAt),
        sql`(${chatChannelMembers.lastReadAt} IS NULL OR ${chatMessages.createdAt} > ${chatChannelMembers.lastReadAt})`,
      ),
    )
    .where(
      and(
        eq(chatChannelMembers.orgId, orgId),
        eq(chatChannelMembers.userId, userId),
      ),
    )
    .groupBy(chatChannelMembers.channelId);

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.channelId] = row.count;
  }
  return counts;
}

export async function getPinnedMessages(orgId: string, channelId: string) {
  return db
    .select()
    .from(chatMessages)
    .where(
      and(
        eq(chatMessages.orgId, orgId),
        eq(chatMessages.channelId, channelId),
        eq(chatMessages.isPinned, true),
      ),
    )
    .orderBy(desc(chatMessages.createdAt));
}

export async function addReaction(orgId: string, messageId: string, userId: string, emoji: string) {
  const [created] = await db
    .insert(messageReactions)
    .values({ orgId, messageId, userId, emoji })
    .onConflictDoNothing()
    .returning();
  return created ?? null;
}

export async function removeReaction(orgId: string, messageId: string, userId: string, emoji: string) {
  const [deleted] = await db
    .delete(messageReactions)
    .where(
      and(
        eq(messageReactions.orgId, orgId),
        eq(messageReactions.messageId, messageId),
        eq(messageReactions.userId, userId),
        eq(messageReactions.emoji, emoji),
      )
    )
    .returning();
  return deleted ?? null;
}

export async function getReactionsForMessages(orgId: string, messageIds: string[]) {
  if (messageIds.length === 0) return {};

  const rows = await db
    .select({
      messageId: messageReactions.messageId,
      emoji: messageReactions.emoji,
      userId: messageReactions.userId,
    })
    .from(messageReactions)
    .where(
      and(
        eq(messageReactions.orgId, orgId),
        inArray(messageReactions.messageId, messageIds),
      )
    );

  // Group by messageId -> emoji -> { count, userIds }
  const result: Record<string, Array<{ emoji: string; count: number; userIds: string[] }>> = {};

  for (const row of rows) {
    if (!result[row.messageId]) result[row.messageId] = [];
    const existing = result[row.messageId].find((r) => r.emoji === row.emoji);
    if (existing) {
      existing.count++;
      existing.userIds.push(row.userId);
    } else {
      result[row.messageId].push({ emoji: row.emoji, count: 1, userIds: [row.userId] });
    }
  }

  return result;
}
