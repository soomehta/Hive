import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { z } from "zod/v4";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { hasPermission } from "@/lib/auth/permissions";

// ─── POST /api/agents/pm/[workspaceId]/trigger ───────────
// Manually trigger an agent schedule type for the workspace.
// Worker integration is deferred to a later phase.

const triggerSchema = z.object({
  scheduleType: z.enum(["daily_standup", "weekly_report"]),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { workspaceId } = await params;

    const rl = await rateLimit(`agent:trigger:${auth.userId}:${workspaceId}`, 5, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "project:create")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = triggerSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Worker integration comes later. Return trigger acknowledgement.
    return Response.json({
      data: {
        triggered: true,
        scheduleType: parsed.data.scheduleType,
        workspaceId,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
