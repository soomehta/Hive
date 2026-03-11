import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse, NotFoundError } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { agentCheckins } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// ─── GET /api/checkins/[id] ──────────────────────────────
// Get a single check-in by id, scoped to the current org.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const [checkin] = await db
      .select()
      .from(agentCheckins)
      .where(
        and(
          eq(agentCheckins.orgId, auth.orgId),
          eq(agentCheckins.id, id)
        )
      )
      .limit(1);

    if (!checkin) {
      throw new NotFoundError("Check-in");
    }

    return Response.json({ data: checkin });
  } catch (error) {
    return errorResponse(error);
  }
}
