import { createHmac, timingSafeEqual } from "crypto";

const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function getStateSecret(): string {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) throw new Error("ENCRYPTION_KEY environment variable is required");
  return secret;
}

export function createOAuthState(userId: string, orgId: string): string {
  const payload = JSON.stringify({ userId, orgId, ts: Date.now() });
  const signature = createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("hex");
  // base64url encode: payload.signature
  return Buffer.from(`${payload}.${signature}`).toString("base64url");
}

export function verifyOAuthState(state: string): { userId: string; orgId: string } {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid OAuth state encoding");
  }

  const lastDot = decoded.lastIndexOf(".");
  if (lastDot === -1) throw new Error("Invalid OAuth state format");

  const payload = decoded.slice(0, lastDot);
  const signature = decoded.slice(lastDot + 1);

  const expected = createHmac("sha256", getStateSecret())
    .update(payload)
    .digest("hex");

  // Timing-safe comparison
  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
    throw new Error("Invalid OAuth state signature");
  }

  const data = JSON.parse(payload) as { userId: string; orgId: string; ts: number };

  // Check expiry
  if (Date.now() - data.ts > STATE_TTL_MS) {
    throw new Error("OAuth state expired");
  }

  return { userId: data.userId, orgId: data.orgId };
}
