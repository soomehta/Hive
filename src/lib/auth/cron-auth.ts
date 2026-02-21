import { timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

/**
 * Verify the CRON_SECRET from the Authorization header using
 * a timing-safe comparison to prevent timing attacks.
 */
export function verifyCronSecret(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;

  if (authHeader.length !== expected.length) return false;

  return timingSafeEqual(
    Buffer.from(authHeader, "utf8"),
    Buffer.from(expected, "utf8")
  );
}
