import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { agentCheckins } from "@/lib/db/schema";
import { and, eq, asc } from "drizzle-orm";

// ─── GET /api/checkins ───────────────────────────────────
// List pending check-ins assigned to the current user in their org,
// ordered by scheduled time ascending.

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const checkins = await db
      .select()
      .from(agentCheckins)
      .where(
        and(
          eq(agentCheckins.orgId, auth.orgId),
          eq(agentCheckins.assigneeUserId, auth.userId),
          eq(agentCheckins.status, "pending")
        )
      )
      .orderBy(asc(agentCheckins.scheduledAt));

    return Response.json({ data: checkins });
  } catch (error) {
    return errorResponse(error);
  }
}
