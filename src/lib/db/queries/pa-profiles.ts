import { db } from "@/lib/db";
import { paProfiles } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export async function getOrCreatePaProfile(userId: string, orgId: string) {
  const existing = await db.query.paProfiles.findFirst({
    where: and(eq(paProfiles.userId, userId), eq(paProfiles.orgId, orgId)),
  });

  if (existing) return existing;

  const [profile] = await db
    .insert(paProfiles)
    .values({ userId, orgId })
    .returning();

  return profile;
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
  const commonIntents = (profile.commonIntents ?? {}) as Record<string, number>;
  if (intent) {
    commonIntents[intent] = (commonIntents[intent] ?? 0) + 1;
  }

  await db
    .update(paProfiles)
    .set({
      totalInteractions: (profile.totalInteractions ?? 0) + 1,
      commonIntents,
      updatedAt: new Date(),
    })
    .where(and(eq(paProfiles.userId, userId), eq(paProfiles.orgId, orgId)));
}
