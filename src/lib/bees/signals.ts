import { db } from "@/lib/db";
import { beeSignals } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { SignalType } from "@/types/bees";

export async function createSignal(data: {
  swarmSessionId: string;
  fromBeeRunId: string;
  targetBeeRunId?: string;
  signalType: SignalType;
  message: string;
  data?: unknown;
}) {
  const [signal] = await db
    .insert(beeSignals)
    .values({
      swarmSessionId: data.swarmSessionId,
      fromBeeRunId: data.fromBeeRunId,
      targetBeeRunId: data.targetBeeRunId ?? null,
      signalType: data.signalType,
      message: data.message,
      data: data.data ?? null,
    })
    .returning();

  return signal;
}

export async function resolveSignal(signalId: string) {
  const [resolved] = await db
    .update(beeSignals)
    .set({ isResolved: true })
    .where(eq(beeSignals.id, signalId))
    .returning();

  return resolved;
}

export async function getUnresolvedSignals(swarmSessionId: string) {
  return db
    .select()
    .from(beeSignals)
    .where(
      and(
        eq(beeSignals.swarmSessionId, swarmSessionId),
        eq(beeSignals.isResolved, false)
      )
    )
    .orderBy(beeSignals.createdAt);
}

export async function getSwarmSignals(swarmSessionId: string) {
  return db
    .select()
    .from(beeSignals)
    .where(eq(beeSignals.swarmSessionId, swarmSessionId))
    .orderBy(beeSignals.createdAt);
}

export async function hasHoldSignal(swarmSessionId: string): Promise<boolean> {
  const holds = await db
    .select()
    .from(beeSignals)
    .where(
      and(
        eq(beeSignals.swarmSessionId, swarmSessionId),
        eq(beeSignals.signalType, "hold"),
        eq(beeSignals.isResolved, false)
      )
    )
    .limit(1);

  return holds.length > 0;
}
