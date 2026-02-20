import { db } from "@/lib/db";
import { messages } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

// ─── Read Queries ───────────────────────────────────────

export async function getMessages(projectId: string) {
  return db
    .select()
    .from(messages)
    .where(eq(messages.projectId, projectId))
    .orderBy(desc(messages.createdAt));
}

export async function getMessage(messageId: string) {
  return db.query.messages.findFirst({
    where: eq(messages.id, messageId),
  });
}

// ─── Write Queries ──────────────────────────────────────

export async function createMessage(data: {
  projectId: string;
  orgId: string;
  userId: string;
  title?: string;
  content: string;
}) {
  const [message] = await db
    .insert(messages)
    .values({
      projectId: data.projectId,
      orgId: data.orgId,
      userId: data.userId,
      title: data.title,
      content: data.content,
    })
    .returning();

  return message;
}

export async function updateMessage(
  messageId: string,
  data: Partial<{ title: string | null; content: string; isPinned: boolean }>
) {
  const [updated] = await db
    .update(messages)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(messages.id, messageId))
    .returning();

  return updated;
}

export async function deleteMessage(messageId: string) {
  const [deleted] = await db
    .delete(messages)
    .where(eq(messages.id, messageId))
    .returning();

  return deleted;
}

export async function togglePinMessage(messageId: string) {
  const existing = await getMessage(messageId);
  if (!existing) return undefined;

  const [updated] = await db
    .update(messages)
    .set({ isPinned: !existing.isPinned, updatedAt: new Date() })
    .where(eq(messages.id, messageId))
    .returning();

  return updated;
}
