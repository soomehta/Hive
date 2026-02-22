import { db } from "@/lib/db";
import { beeHandovers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { HandoverType } from "@/types/bees";

export async function createHandover(data: {
  swarmSessionId: string;
  fromBeeRunId: string;
  toBeeRunId: string;
  handoverType: HandoverType;
  summary: string;
  data?: Record<string, unknown>;
  request?: string;
  constraints?: Record<string, unknown>;
}) {
  const [handover] = await db
    .insert(beeHandovers)
    .values({
      swarmSessionId: data.swarmSessionId,
      fromBeeRunId: data.fromBeeRunId,
      toBeeRunId: data.toBeeRunId,
      handoverType: data.handoverType,
      summary: data.summary,
      data: data.data ?? null,
      request: data.request ?? null,
      constraints: data.constraints ?? null,
    })
    .returning();

  return handover;
}

export async function getSwarmHandovers(swarmSessionId: string) {
  return db
    .select()
    .from(beeHandovers)
    .where(eq(beeHandovers.swarmSessionId, swarmSessionId))
    .orderBy(beeHandovers.createdAt);
}
