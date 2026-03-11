import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { errorResponse } from "@/lib/utils/errors";
import { logActivity } from "@/lib/db/queries/activity";
import {
  getWorkspace,
  removeWorkspaceMember,
} from "@/lib/db/queries/workspaces";

type RouteParams = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { id, userId } = await params;

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

    const removed = await removeWorkspaceMember(id, userId);

    if (!removed) {
      return Response.json({ error: "Member not found" }, { status: 404 });
    }

    await logActivity({
      orgId: auth.orgId,
      userId: auth.userId,
      type: "workspace_member_removed",
      metadata: {
        workspaceId: id,
        workspaceName: workspace.name,
        memberId: userId,
      },
    });

    return Response.json({ data: removed });
  } catch (error) {
    return errorResponse(error);
  }
}
