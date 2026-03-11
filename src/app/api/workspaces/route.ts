import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { logActivity } from "@/lib/db/queries/activity";
import { getWorkspaces, createWorkspace } from "@/lib/db/queries/workspaces";

const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(5000).optional(),
  iconEmoji: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const workspaceList = await getWorkspaces(auth.orgId);

    return Response.json({ data: workspaceList });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`workspaces:create:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "workspace:create")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = createWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const workspace = await createWorkspace({
      orgId: auth.orgId,
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: parsed.data.description,
      iconEmoji: parsed.data.iconEmoji,
      color: parsed.data.color,
      createdBy: auth.userId,
    });

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "workspace_created",
      metadata: { workspaceName: workspace.name, workspaceId: workspace.id },
    });

    return Response.json({ data: workspace }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
