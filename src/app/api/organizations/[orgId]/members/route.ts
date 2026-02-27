import { NextRequest } from "next/server";
import { nanoid } from "nanoid";
import { createLogger } from "@/lib/logger";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { inviteMemberSchema } from "@/lib/utils/validation";
import {
  getOrgMembers,
  createInvitation,
} from "@/lib/db/queries/organizations";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";
import { supabaseAdmin } from "@/lib/supabase/admin";

const log = createLogger("org-members");

interface RouteParams {
  params: Promise<{ orgId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { orgId } = await params;

    if (auth.orgId !== orgId) {
      return Response.json(
        { error: "Organization mismatch" },
        { status: 403 }
      );
    }

    const members = await getOrgMembers(orgId);

    const membersWithNames = await Promise.all(
      members.map(async (member) => {
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(member.userId);
          return {
            ...member,
            displayName:
              data.user?.user_metadata?.full_name ||
              data.user?.email?.split("@")[0] ||
              member.userId.slice(0, 8),
            email: data.user?.email ?? null,
            avatarUrl: data.user?.user_metadata?.avatar_url ?? null,
          };
        } catch {
          return {
            ...member,
            displayName: member.userId.slice(0, 8),
            email: null,
            avatarUrl: null,
          };
        }
      })
    );

    return Response.json({ data: membersWithNames });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/organizations/[orgId]/members error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { orgId } = await params;

    if (auth.orgId !== orgId) {
      return Response.json(
        { error: "Organization mismatch" },
        { status: 403 }
      );
    }

    if (!hasPermission(auth.memberRole, "org:invite")) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = inviteMemberSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const token = nanoid(32);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const invitation = await createInvitation({
      orgId,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedBy: auth.userId,
      token,
      expiresAt,
    });

    await logActivity({
      orgId,
      userId: auth.userId,
      type: "member_joined",
      metadata: { email: parsed.data.email, role: parsed.data.role, action: "invited" },
    });

    // Strip token from response to prevent leaking invitation secrets
    const { token: _token, ...safeInvitation } = invitation;
    return Response.json({ data: safeInvitation }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "POST /api/organizations/[orgId]/members error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
