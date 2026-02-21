import { createCipheriv, createDecipheriv, randomBytes } from "crypto";
import { db } from "@/lib/db";
import { integrations } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import type { Integration } from "@/types/integrations";

const ALGORITHM = "aes-256-gcm";

function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error("ENCRYPTION_KEY environment variable is required");
  if (!/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new Error("ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes for AES-256)");
  }
  return Buffer.from(key, "hex");
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:authTag:encrypted (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptToken(ciphertext: string): string {
  const key = getEncryptionKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 3 || !parts[0] || !parts[1]) {
    throw new Error("Malformed encrypted token");
  }
  const [ivB64, authTagB64, encryptedB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const encrypted = Buffer.from(encryptedB64, "base64");
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final("utf8");
}

export async function getActiveIntegration(
  userId: string,
  orgId: string,
  provider: "google" | "microsoft" | "slack"
): Promise<(Integration & { decryptedAccessToken: string; decryptedRefreshToken: string | null }) | null> {
  const integration = await db.query.integrations.findFirst({
    where: and(
      eq(integrations.userId, userId),
      eq(integrations.orgId, orgId),
      eq(integrations.provider, provider),
      eq(integrations.isActive, true)
    ),
  });

  if (!integration) return null;

  // Check if token needs refresh
  if (integration.tokenExpiresAt && new Date(integration.tokenExpiresAt) < new Date()) {
    if (integration.refreshToken) {
      try {
        await refreshOAuthToken(integration);
        // Re-fetch after refresh
        const refreshed = await db.query.integrations.findFirst({
          where: eq(integrations.id, integration.id),
        });
        if (!refreshed) return null;
        return {
          ...refreshed,
          decryptedAccessToken: decryptToken(refreshed.accessToken),
          decryptedRefreshToken: refreshed.refreshToken ? decryptToken(refreshed.refreshToken) : null,
        };
      } catch {
        // Mark as inactive on refresh failure
        await db.update(integrations).set({ isActive: false, updatedAt: new Date() }).where(eq(integrations.id, integration.id));
        return null;
      }
    }
    return null;
  }

  return {
    ...integration,
    decryptedAccessToken: decryptToken(integration.accessToken),
    decryptedRefreshToken: integration.refreshToken ? decryptToken(integration.refreshToken) : null,
  };
}

async function refreshOAuthToken(integration: Integration): Promise<void> {
  if (!integration.refreshToken) throw new Error("No refresh token available");

  const refreshToken = decryptToken(integration.refreshToken);
  let newAccessToken: string;
  let newRefreshToken: string | undefined;
  let expiresIn: number;

  if (integration.provider === "google") {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Google token refresh failed: ${res.statusText}`);
    const data = await res.json();
    newAccessToken = data.access_token;
    newRefreshToken = data.refresh_token;
    expiresIn = data.expires_in ?? 3600;
  } else if (integration.provider === "microsoft") {
    const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.MICROSOFT_CLIENT_ID!,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET!,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) throw new Error(`Microsoft token refresh failed: ${res.statusText}`);
    const data = await res.json();
    newAccessToken = data.access_token;
    newRefreshToken = data.refresh_token;
    expiresIn = data.expires_in ?? 3600;
  } else {
    throw new Error(`Token refresh not supported for provider: ${integration.provider}`);
  }

  await db
    .update(integrations)
    .set({
      accessToken: encryptToken(newAccessToken),
      refreshToken: newRefreshToken ? encryptToken(newRefreshToken) : integration.refreshToken,
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
      updatedAt: new Date(),
    })
    .where(eq(integrations.id, integration.id));
}
