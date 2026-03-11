import { NextRequest } from "next/server";
import { z } from "zod/v4";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import {
  getWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
} from "@/lib/db/queries/workspaces";

type RouteParams = { params: Promise<{ id: string }> };

const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(["owner", "admin", "member"]).optional(),
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

    const members = await getWorkspaceMembers(id);

    return Response.json({ data: members });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { id } = await params;
    const rl = await rateLimit(`workspaces:invite:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    if (!hasPermission(auth.memberRole, "workspace:invite")) {
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
    const parsed = addMemberSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const member = await addWorkspaceMember({
      workspaceId: id,
      userId: parsed.data.userId,
      role: parsed.data.role,
    });

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "workspace_member_added",
      metadata: {
        workspaceId: id,
        workspaceName: workspace.name,
        memberId: parsed.data.userId,
        memberRole: parsed.data.role ?? "member",
      },
    });

    if (parsed.data.userId !== auth.userId) {
      await createNotification({
        userId: parsed.data.userId,
        orgId: auth.orgId,
        type: "workspace_invite",
        title: `You were added to workspace "${workspace.name}"`,
        metadata: {
          workspaceId: id,
          workspaceName: workspace.name,
          invitedBy: auth.userId,
        },
      });
    }

    return Response.json({ data: member }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
