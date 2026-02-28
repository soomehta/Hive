import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { createLogger } from "@/lib/logger";

const log = createLogger("health-route");

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, "ok" | "error"> = {};

  // Database check
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = "ok";
  } catch (err) {
    log.error({ err }, "Health check: database error");
    checks.database = "error";
  }

  const allOk = Object.values(checks).every((v) => v === "ok");

  return Response.json(
    { status: allOk ? "healthy" : "degraded", checks, timestamp: new Date().toISOString() },
    { status: allOk ? 200 : 503 }
  );
}
