import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

interface AuthResult {
  userId: string;
  orgId: string;
  memberRole: "owner" | "admin" | "member";
}

export async function authenticateRequest(
  req: NextRequest
): Promise<AuthResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }

  const orgId = req.headers.get("x-org-id");
  if (!orgId) {
    throw new AuthError("Missing organization", 400);
  }

  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.orgId, orgId),
      eq(organizationMembers.userId, user.id)
    ),
  });

  if (!member) {
    throw new AuthError("Not a member of this organization", 403);
  }

  return {
    userId: user.id,
    orgId,
    memberRole: member.role,
  };
}

export class AuthError extends Error {
  constructor(
    message: string,
    public statusCode: number
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json(
      { error: error.message },
      { status: error.statusCode }
    );
  }
  throw error;
}
