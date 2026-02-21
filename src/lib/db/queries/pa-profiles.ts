import { db } from "@/lib/db";
import { paProfiles } from "@/lib/db/schema";
import { eq, and, sql } from "drizzle-orm";

export async function getOrCreatePaProfile(userId: string, orgId: string) {
  // Use upsert to avoid race condition
  const [profile] = await db
    .insert(paProfiles)
    .values({ userId, orgId })
    .onConflictDoNothing({ target: [paProfiles.userId, paProfiles.orgId] })
    .returning();

  if (profile) return profile;

  // If conflict, the profile already exists — fetch it
  const existing = await db.query.paProfiles.findFirst({
    where: and(eq(paProfiles.userId, userId), eq(paProfiles.orgId, orgId)),
  });

  return existing!;
}

export async function getPaProfile(userId: string, orgId: string) {
  return db.query.paProfiles.findFirst({
    where: and(eq(paProfiles.userId, userId), eq(paProfiles.orgId, orgId)),
  });
}

export async function updatePaProfile(
  userId: string,
  orgId: string,
  updates: Partial<{
    autonomyMode: "autopilot" | "copilot" | "manual";
    verbosity: "concise" | "detailed" | "bullet_points";
    formality: "casual" | "professional" | "mixed";
    morningBriefingEnabled: boolean;
    morningBriefingTime: string;
    endOfDayDigestEnabled: boolean;
    endOfDayDigestTime: string;
    weeklyDigestEnabled: boolean;
    weeklyDigestDay: number;
    timezone: string;
    workingHoursStart: string;
    workingHoursEnd: string;
    actionOverrides: Record<string, string>;
  }>
) {
  const [updated] = await db
    .update(paProfiles)
    .set({ ...updates, updatedAt: new Date() })
    .where(and(eq(paProfiles.userId, userId), eq(paProfiles.orgId, orgId)))
    .returning();

  return updated;
}

export async function incrementInteractions(
  userId: string,
  orgId: string,
  intent?: string
) {
  const profile = await getOrCreatePaProfile(userId, orgId);

  // Atomic increment via SQL
  const updates: Record<string, any> = {
    totalInteractions: sql`${paProfiles.totalInteractions} + 1`,
    lastActiveAt: new Date(),
  };

  if (intent) {
    const commonIntents = (profile.commonIntents ?? {}) as Record<string, number>;
    commonIntents[intent] = (commonIntents[intent] ?? 0) + 1;
    updates.commonIntents = commonIntents;
  }

  await db.update(paProfiles)
    .set(updates)
    .where(and(eq(paProfiles.userId, userId), eq(paProfiles.orgId, orgId)));
}
