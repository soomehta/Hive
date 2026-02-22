import { db } from "@/lib/db";
import { swarmSessions, beeRuns, beeInstances, beeTemplates } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function createSwarmSession(data: {
  orgId: string;
  userId: string;
  conversationId?: string;
  triggerMessage: string;
  dispatchPlan: unknown;
}) {
  const [session] = await db
    .insert(swarmSessions)
    .values({
      orgId: data.orgId,
      userId: data.userId,
      conversationId: data.conversationId,
      triggerMessage: data.triggerMessage,
      dispatchPlan: data.dispatchPlan,
      status: "planning",
    })
    .returning();

  return session;
}

export async function updateSwarmSession(
  sessionId: string,
  updates: Partial<{
    status: string;
    result: unknown;
  }>
) {
  const [updated] = await db
    .update(swarmSessions)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(eq(swarmSessions.id, sessionId))
    .returning();

  return updated;
}

export async function getSwarmSession(sessionId: string) {
  return db.query.swarmSessions.findFirst({
    where: eq(swarmSessions.id, sessionId),
  });
}

export async function getSwarmSessionWithRuns(sessionId: string) {
  const session = await getSwarmSession(sessionId);
  if (!session) return null;

  const runs = await db
    .select({
      run: beeRuns,
      instance: beeInstances,
      template: beeTemplates,
    })
    .from(beeRuns)
    .innerJoin(beeInstances, eq(beeRuns.beeInstanceId, beeInstances.id))
    .innerJoin(beeTemplates, eq(beeInstances.templateId, beeTemplates.id))
    .where(eq(beeRuns.swarmSessionId, sessionId))
    .orderBy(beeRuns.order, beeRuns.createdAt);

  return { ...session, runs };
}

export async function getUserSwarmSessions(
  userId: string,
  orgId: string,
  limit: number = 20
) {
  return db
    .select()
    .from(swarmSessions)
    .where(
      and(
        eq(swarmSessions.userId, userId),
        eq(swarmSessions.orgId, orgId)
      )
    )
    .orderBy(desc(swarmSessions.createdAt))
    .limit(limit);
}

export async function createBeeRun(data: {
  swarmSessionId: string;
  beeInstanceId: string;
  order: number;
  input?: unknown;
}) {
  const [run] = await db
    .insert(beeRuns)
    .values({
      swarmSessionId: data.swarmSessionId,
      beeInstanceId: data.beeInstanceId,
      order: data.order,
      input: data.input ?? null,
      status: "queued",
    })
    .returning();

  return run;
}

export async function updateBeeRun(
  runId: string,
  updates: Partial<{
    status: string;
    output: unknown;
    statusText: string;
    tokensUsed: number;
    durationMs: number;
  }>
) {
  const [updated] = await db
    .update(beeRuns)
    .set({ ...updates, updatedAt: new Date() } as any)
    .where(eq(beeRuns.id, runId))
    .returning();

  return updated;
}

export async function getSwarmRuns(swarmSessionId: string) {
  return db
    .select()
    .from(beeRuns)
    .where(eq(beeRuns.swarmSessionId, swarmSessionId))
    .orderBy(beeRuns.order, beeRuns.createdAt);
}
