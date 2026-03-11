import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse, NotFoundError, ForbiddenError } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { agentCheckins } from "@/lib/db/schema";
import { logActivity } from "@/lib/db/queries/activity";
import { and, eq } from "drizzle-orm";
import { z } from "zod/v4";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";

// ─── POST /api/checkins/[id]/respond ─────────────────────
// Respond to a pending check-in, marking it as answered.

const respondSchema = z.object({
  response: z.string().min(1).max(5000),
  status: z.enum(["on_track", "at_risk", "blocked"]).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    const rl = await rateLimit(`checkin:respond:${auth.userId}`, 30, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    // Fetch the check-in and verify ownership + org scope.
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

    if (checkin.assigneeUserId !== auth.userId) {
      throw new ForbiddenError("You are not the assignee of this check-in");
    }

    if (checkin.status !== "pending") {
      return Response.json(
        { error: "Check-in is no longer pending" },
        { status: 409 }
      );
    }

    const body = await req.json();
    const parsed = respondSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const now = new Date();
    const [updated] = await db
      .update(agentCheckins)
      .set({
        response: parsed.data.response,
        status: "answered",
        respondedAt: now,
        responseMetadata: parsed.data.status
          ? { taskStatus: parsed.data.status }
          : undefined,
      })
      .where(eq(agentCheckins.id, id))
      .returning();

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "agent_checkin_responded",
      metadata: {
        checkinId: id,
        taskId: checkin.taskId,
        taskStatus: parsed.data.status ?? null,
      },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
