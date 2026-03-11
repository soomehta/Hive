import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { logActivity } from "@/lib/db/queries/activity";
import {
  getWorkspace,
  updateWorkspace,
  deleteWorkspace,
} from "@/lib/db/queries/workspaces";

type RouteParams = { params: Promise<{ id: string }> };

const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(5000).optional(),
  iconEmoji: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    if (!hasPermission(auth.memberRole, "workspace:view")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const workspace = await getWorkspace(auth.orgId, id);

    if (!workspace) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    return Response.json({ data: workspace });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const rl = await rateLimit(`workspaces:update:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "workspace:manage")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const workspace = await getWorkspace(auth.orgId, id);

    if (!workspace) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = updateWorkspaceSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updated = await updateWorkspace(auth.orgId, id, parsed.data);

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "workspace_updated",
      metadata: {
        workspaceName: workspace.name,
        workspaceId: id,
        fields: Object.keys(parsed.data),
      },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;

    if (!hasPermission(auth.memberRole, "workspace:delete")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const workspace = await getWorkspace(auth.orgId, id);

    if (!workspace) {
      return Response.json({ error: "Workspace not found" }, { status: 404 });
    }

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "workspace_updated",
      metadata: {
        action: "deleted",
        workspaceName: workspace.name,
        workspaceId: id,
      },
    });

    await deleteWorkspace(auth.orgId, id);

    return Response.json({ data: { success: true } });
  } catch (error) {
    return errorResponse(error);
  }
}
