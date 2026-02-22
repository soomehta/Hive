import { db } from "@/lib/db";
import { hiveContext } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { ContextType } from "@/types/bees";

export async function writeContext(data: {
  swarmSessionId: string;
  beeRunId: string;
  key: string;
  value: unknown;
  contextType: ContextType;
  isVisible?: boolean;
}) {
  const [entry] = await db
    .insert(hiveContext)
    .values({
      swarmSessionId: data.swarmSessionId,
      beeRunId: data.beeRunId,
      key: data.key,
      value: data.value as any,
      contextType: data.contextType,
      isVisible: data.isVisible ?? true,
    })
    .returning();

  return entry;
}

export async function getSwarmContext(swarmSessionId: string) {
  return db
    .select()
    .from(hiveContext)
    .where(eq(hiveContext.swarmSessionId, swarmSessionId))
    .orderBy(hiveContext.createdAt);
}

export async function getVisibleSwarmContext(swarmSessionId: string) {
  return db
    .select()
    .from(hiveContext)
    .where(
      and(
        eq(hiveContext.swarmSessionId, swarmSessionId),
        eq(hiveContext.isVisible, true)
      )
    )
    .orderBy(hiveContext.createdAt);
}

export async function getContextByType(
  swarmSessionId: string,
  contextType: ContextType
) {
  return db
    .select()
    .from(hiveContext)
    .where(
      and(
        eq(hiveContext.swarmSessionId, swarmSessionId),
        eq(hiveContext.contextType, contextType)
      )
    )
    .orderBy(hiveContext.createdAt);
}

export async function getContextSnapshot(swarmSessionId: string) {
  const entries = await getSwarmContext(swarmSessionId);
  const snapshot: Record<string, unknown> = {};

  for (const entry of entries) {
    snapshot[entry.key] = entry.value;
  }

  return snapshot;
}
