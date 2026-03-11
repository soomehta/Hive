import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { agentReports } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";

// ─── GET /api/agents/pm/[workspaceId]/reports ────────────
// List agent reports for a given workspace, ordered by newest first.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { workspaceId } = await params;

    const reports = await db
      .select()
      .from(agentReports)
      .where(
        and(
          eq(agentReports.orgId, auth.orgId),
          eq(agentReports.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(agentReports.createdAt))
      .limit(50);

    return Response.json({ data: reports });
  } catch (error) {
    return errorResponse(error);
  }
}
