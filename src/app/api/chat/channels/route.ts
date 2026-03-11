import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getChannels, getChannelsForUser, createChannel } from "@/lib/db/queries/chat";
import { createChatChannelSchema } from "@/lib/utils/validation";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { isFeatureEnabled } from "@/lib/utils/feature-flags";
import { errorResponse } from "@/lib/utils/errors";
import { logActivity } from "@/lib/db/queries/activity";
import { getProject, isProjectMember, isProjectLead } from "@/lib/db/queries/projects";

export async function GET(req: NextRequest) {
  if (!isFeatureEnabled("chat")) {
    return Response.json({ error: "Chat feature is disabled" }, { status: 404 });
  }
  try {
    const auth = await authenticateRequest(req);
    const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;

    if (projectId) {
      const project = await getProject(projectId);
      if (!project || project.orgId !== auth.orgId) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
    }

    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    const channels = isAdminLike
      ? await getChannels(auth.orgId, projectId)
      : await getChannelsForUser(auth.orgId, auth.userId, projectId);
    return Response.json({ data: channels });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  if (!isFeatureEnabled("chat")) {
    return Response.json({ error: "Chat feature is disabled" }, { status: 404 });
  }
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`channels:create:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = createChatChannelSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (!hasPermission(auth.memberRole, "chat:channel_create")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    if (parsed.data.scope === "project") {
      if (!parsed.data.projectId) {
        return Response.json(
          { error: "projectId is required for project channels" },
          { status: 400 }
        );
      }

      const project = await getProject(parsed.data.projectId);
      if (!project || project.orgId !== auth.orgId) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }

      const isMember = await isProjectMember(project.id, auth.userId);
      const isLead = await isProjectLead(project.id, auth.userId);
      const canCreate = hasPermission(auth.memberRole, "chat:channel_create", {
        isProjectMember: isMember,
        isProjectLead: isLead,
      });

      if (!canCreate) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403 });
      }
    }

    const channel = await createChannel({
      orgId: auth.orgId,
      projectId: parsed.data.projectId,
      scope: parsed.data.scope,
      name: parsed.data.name,
      topic: parsed.data.topic,
      createdBy: auth.userId,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: channel.projectId,
      userId: auth.userId,
      type: "channel_created",
      metadata: { channelId: channel.id, channelName: channel.name, scope: channel.scope },
    });

    return Response.json({ data: channel }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
