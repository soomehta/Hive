import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { errorResponse } from "@/lib/utils/errors";
import { db } from "@/lib/db";
import { agentSchedules } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { z } from "zod/v4";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { hasPermission } from "@/lib/auth/permissions";

// ─── GET /api/agents/pm/[workspaceId]/schedules ──────────
// List agent schedules for the workspace.

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { workspaceId } = await params;

    const schedules = await db
      .select()
      .from(agentSchedules)
      .where(
        and(
          eq(agentSchedules.orgId, auth.orgId),
          eq(agentSchedules.workspaceId, workspaceId)
        )
      )
      .orderBy(desc(agentSchedules.createdAt));

    return Response.json({ data: schedules });
  } catch (error) {
    return errorResponse(error);
  }
}

// ─── POST /api/agents/pm/[workspaceId]/schedules ─────────
// Create a new agent schedule for the workspace.

const createScheduleSchema = z.object({
  beeInstanceId: z.uuid(),
  scheduleType: z.enum(["daily_standup", "weekly_report", "checkin_sweep"]),
  cronExpression: z.string().min(1).max(100),
  timezone: z.string().max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const auth = await authenticateRequest(req);
    const { workspaceId } = await params;

    const rl = await rateLimit(`agent:schedules:create:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "project:create")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createScheduleSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const [schedule] = await db
      .insert(agentSchedules)
      .values({
        orgId: auth.orgId,
        workspaceId,
        beeInstanceId: parsed.data.beeInstanceId,
        scheduleType: parsed.data.scheduleType,
        cronExpression: parsed.data.cronExpression,
        timezone: parsed.data.timezone ?? "UTC",
        config: parsed.data.config ?? {},
        isActive: true,
      })
      .returning();

    return Response.json({ data: schedule }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
