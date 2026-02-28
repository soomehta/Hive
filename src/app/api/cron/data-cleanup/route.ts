import { NextRequest } from "next/server";
import { createLogger } from "@/lib/logger";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { cleanupOldRecords } from "@/lib/db/queries/cron-queries";

const log = createLogger("data-cleanup");

export async function POST(req: NextRequest) {
  if (!verifyCronSecret(req)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await cleanupOldRecords();

    log.info(stats, "Data cleanup completed");

    return Response.json({ success: true, stats });
  } catch (error) {
    log.error({ err: error }, "Data cleanup failed");
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
