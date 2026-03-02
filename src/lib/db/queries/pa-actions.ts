import { db } from "@/lib/db";
import { paActions, paChatSessions, paConversations, paCorrections } from "@/lib/db/schema";
import { eq, and, lt, desc, sql } from "drizzle-orm";

export async function createPaAction(data: {
  userId: string;
  orgId: string;
  conversationId?: string;
  actionType: string;
  tier: string;
  plannedPayload: Record<string, any>;
  expiresAt?: Date;
}) {
  const [action] = await db
    .insert(paActions)
    .values({
      userId: data.userId,
      orgId: data.orgId,
      conversationId: data.conversationId,
      actionType: data.actionType as any,
      tier: data.tier as any,
      status: "pending",
      plannedPayload: data.plannedPayload,
      expiresAt: data.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h default
    })
    .returning();

  return action;
}

export async function getPendingActions(userId: string, orgId: string) {
  return db
    .select()
    .from(paActions)
    .where(
      and(
        eq(paActions.userId, userId),
        eq(paActions.orgId, orgId),
        eq(paActions.status, "pending")
      )
    )
    .orderBy(desc(paActions.createdAt));
}

export async function getPaAction(actionId: string) {
  return db.query.paActions.findFirst({
    where: eq(paActions.id, actionId),
  });
}

export async function updatePaAction(
  actionId: string,
  updates: Partial<{
    status: string;
    executedPayload: Record<string, any>;
    executionResult: Record<string, any>;
    userEditedPayload: Record<string, any>;
    rejectionReason: string;
    approvedAt: Date;
    executedAt: Date;
  }>
) {
  const [updated] = await db
    .update(paActions)
    .set(updates as any)
    .where(eq(paActions.id, actionId))
    .returning();

  return updated;
}

export async function expireStaleActions() {
  return db
    .update(paActions)
    .set({ status: "expired" as any })
    .where(
      and(
        eq(paActions.status, "pending"),
        lt(paActions.expiresAt, new Date())
      )
    )
    .returning();
}

// ─── Chat Sessions ──────────────────────────────────────

export async function createChatSession(data: {
  userId: string;
  orgId: string;
  title: string;
}) {
  const [session] = await db
    .insert(paChatSessions)
    .values({
      userId: data.userId,
      orgId: data.orgId,
      title: data.title,
    })
    .returning();

  return session;
}

export async function getChatSessions(
  userId: string,
  orgId: string,
  limit: number = 30,
  offset: number = 0
) {
  return db
    .select()
    .from(paChatSessions)
    .where(
      and(
        eq(paChatSessions.userId, userId),
        eq(paChatSessions.orgId, orgId)
      )
    )
    .orderBy(desc(paChatSessions.lastMessageAt))
    .limit(limit)
    .offset(offset);
}

export async function getChatSession(sessionId: string) {
  return db.query.paChatSessions.findFirst({
    where: eq(paChatSessions.id, sessionId),
  });
}

export async function getChatSessionMessages(
  sessionId: string,
  limit: number = 50,
  offset: number = 0
) {
  return db
    .select()
    .from(paConversations)
    .where(eq(paConversations.sessionId, sessionId))
    .orderBy(paConversations.createdAt)
    .limit(limit)
    .offset(offset);
}

export async function updateChatSessionTitle(
  sessionId: string,
  title: string
) {
  const [updated] = await db
    .update(paChatSessions)
    .set({ title })
    .where(eq(paChatSessions.id, sessionId))
    .returning();

  return updated;
}

export async function deleteChatSession(sessionId: string) {
  await db.delete(paChatSessions).where(eq(paChatSessions.id, sessionId));
}

// ─── Conversations ──────────────────────────────────────

export async function addConversationMessage(data: {
  userId: string;
  orgId: string;
  role: string;
  content: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}) {
  const [message] = await db
    .insert(paConversations)
    .values({
      userId: data.userId,
      orgId: data.orgId,
      sessionId: data.sessionId ?? null,
      role: data.role,
      content: data.content,
      metadata: data.metadata ?? null,
    })
    .returning();

  // Update session stats if linked to a session
  if (data.sessionId) {
    await db
      .update(paChatSessions)
      .set({
        lastMessageAt: new Date(),
        messageCount: sql`${paChatSessions.messageCount} + 1`,
      })
      .where(eq(paChatSessions.id, data.sessionId));
  }

  return message;
}

export async function getRecentConversations(
  userId: string,
  orgId: string,
  limit: number = 10
) {
  return db
    .select()
    .from(paConversations)
    .where(
      and(
        eq(paConversations.userId, userId),
        eq(paConversations.orgId, orgId)
      )
    )
    .orderBy(desc(paConversations.createdAt))
    .limit(limit);
}

// ─── Corrections ────────────────────────────────────────

export async function createPaCorrection(data: {
  userId: string;
  orgId: string;
  actionId?: string;
  originalOutput: string;
  correctedOutput: string;
  correctionType?: string;
}) {
  const [correction] = await db
    .insert(paCorrections)
    .values({
      userId: data.userId,
      orgId: data.orgId,
      actionId: data.actionId,
      originalOutput: data.originalOutput,
      correctedOutput: data.correctedOutput,
      correctionType: data.correctionType,
    })
    .returning();

  return correction;
}

// ─── Voice Transcripts ─────────────────────────────────

export async function createVoiceTranscript(data: {
  userId: string;
  orgId: string;
  audioUrl?: string;
  audioFormat?: string;
  durationMs?: number;
  transcript: string;
  language?: string;
  confidence?: number;
  provider: string;
  rawResponse?: Record<string, any>;
}) {
  const { voiceTranscripts } = await import("@/lib/db/schema");
  const [transcript] = await db
    .insert(voiceTranscripts)
    .values({
      userId: data.userId,
      orgId: data.orgId,
      audioUrl: data.audioUrl,
      audioFormat: data.audioFormat,
      durationMs: data.durationMs,
      transcript: data.transcript,
      language: data.language,
      confidence: data.confidence,
      provider: data.provider,
      rawResponse: data.rawResponse,
    })
    .returning();

  return transcript;
}
