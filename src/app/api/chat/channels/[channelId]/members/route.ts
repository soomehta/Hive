import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  addChannelMember,
  getChannelById,
  getChannelMembers,
} from "@/lib/db/queries/chat";
import { addChatChannelMemberSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";
import { getCachedUserNames, setCachedUserNames } from "@/lib/cache/user-names";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

function canManageMembers(
  role: "owner" | "admin" | "member",
  actorMembershipRole?: "owner" | "moderator" | "member"
) {
  if (hasPermission(role, "chat:member_add")) return true;
  return actorMembershipRole === "owner" || actorMembershipRole === "moderator";
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const members = await getChannelMembers(auth.orgId, channelId);

    // Enrich with display names
    let userNameMap = getCachedUserNames(auth.orgId);

    if (!userNameMap) {
      const memberRows = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.orgId, auth.orgId));

      const memberUserIds = memberRows.map((m) => m.userId);
      const userMetaResults = await Promise.all(
        memberUserIds.map((uid) =>
          supabaseAdmin.auth.admin.getUserById(uid).then((r) => r.data?.user ?? null)
        )
      );

      userNameMap = new Map<string, string>();
      for (const u of userMetaResults) {
        if (!u) continue;
        const name =
          u.user_metadata?.full_name ||
          u.user_metadata?.display_name ||
          u.email?.split("@")[0] ||
          u.id.slice(0, 8);
        userNameMap.set(u.id, name);
      }
      setCachedUserNames(auth.orgId, userNameMap);
    }

    const enrichedMembers = members.map((m) => ({
      ...m,
      displayName: userNameMap!.get(m.userId) ?? m.userId.slice(0, 8),
    }));

    return Response.json({ data: enrichedMembers });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const members = await getChannelMembers(auth.orgId, channelId);
    const actorMembership = members.find((member) => member.userId === auth.userId);
    if (!canManageMembers(auth.memberRole, actorMembership?.role)) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = addChatChannelMemberSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const created = await addChannelMember({
      orgId: auth.orgId,
      channelId,
      userId: parsed.data.userId,
      role: parsed.data.role,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: channel.projectId,
      userId: auth.userId,
      type: "member_added_to_channel",
      metadata: { channelId, memberId: parsed.data.userId, role: created.role },
    });

    return Response.json({ data: created }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
