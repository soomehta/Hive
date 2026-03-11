import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { NotFoundError } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { agentReports } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

// ─── GET /api/agents/pm/[workspaceId]/reports/[id] ───────
// Get a single agent report by id, scoped to the org.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string; id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const [report] = await db
      .select()
      .from(agentReports)
      .where(
        and(
          eq(agentReports.orgId, auth.orgId),
          eq(agentReports.id, id)
        )
      )
      .limit(1);

    if (!report) {
      throw new NotFoundError("Agent report");
    }

    return Response.json({ data: report });
  } catch (error) {
    return errorResponse(error);
  }
}
