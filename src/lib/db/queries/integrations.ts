import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encryptToken } from "@/lib/integrations/oauth";

export async function getIntegration(
  userId: string,
  orgId: string,
  provider: "google" | "microsoft" | "slack"
) {
  return db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, userId),
      eq(integrations.orgId, orgId),
      eq(integrations.provider, provider)
    ),
  });
}

export async function getUserIntegrations(userId: string, orgId: string) {
  return db
    .select({
      id: integrations.id,
      provider: integrations.provider,
      providerAccountEmail: integrations.providerAccountEmail,
      isActive: integrations.isActive,
      createdAt: integrations.createdAt,
    })
    .from(integrations)
    .where(
      and(eq(integrations.userId, userId), eq(integrations.orgId, orgId))
    );
}

export async function createIntegration(data: {
  userId: string;
  orgId: string;
  provider: "google" | "microsoft" | "slack";
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  scopes?: string[];
  providerAccountId?: string;
  providerAccountEmail?: string;
}) {
  // Encrypt tokens before storing
  const [integration] = await db
    .insert(integrations)
    .values({
      userId: data.userId,
      orgId: data.orgId,
      provider: data.provider,
      accessToken: encryptToken(data.accessToken),
      refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : null,
      tokenExpiresAt: data.tokenExpiresAt,
      scopes: data.scopes,
      providerAccountId: data.providerAccountId,
      providerAccountEmail: data.providerAccountEmail,
    })
    .onConflictDoUpdate({
      target: [integrations.userId, integrations.orgId, integrations.provider],
      set: {
        accessToken: encryptToken(data.accessToken),
        refreshToken: data.refreshToken ? encryptToken(data.refreshToken) : null,
        tokenExpiresAt: data.tokenExpiresAt,
        scopes: data.scopes,
        providerAccountId: data.providerAccountId,
        providerAccountEmail: data.providerAccountEmail,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  return integration;
}

export async function updateIntegration(
  id: string,
  updates: Partial<{
    accessToken: string;
    refreshToken: string;
    tokenExpiresAt: Date;
    isActive: boolean;
    providerAccountEmail: string;
  }>
) {
  const encrypted: Record<string, any> = { ...updates, updatedAt: new Date() };
  if (updates.accessToken) encrypted.accessToken = encryptToken(updates.accessToken);
  if (updates.refreshToken) encrypted.refreshToken = encryptToken(updates.refreshToken);

  const [updated] = await db
    .update(integrations)
    .set(encrypted)
    .where(eq(integrations.id, id))
    .returning();

  return updated;
}

export async function deleteIntegration(id: string, userId: string, orgId: string) {
  const [deleted] = await db
    .delete(integrations)
    .where(
      and(
        eq(integrations.id, id),
        eq(integrations.userId, userId),
        eq(integrations.orgId, orgId)
      )
    )
    .returning();

  return deleted;
}

export async function deactivateIntegration(id: string) {
  const [updated] = await db
    .update(integrations)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(integrations.id, id))
    .returning();

  return updated;
}
