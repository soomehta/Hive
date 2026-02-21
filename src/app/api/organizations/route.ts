import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createLogger } from "@/lib/logger";
import { createOrgSchema } from "@/lib/utils/validation";
import {
  getUserOrganizations,
  createOrganization,
} from "@/lib/db/queries/organizations";
import { AuthError } from "@/lib/auth/api-auth";
import { logActivity } from "@/lib/db/queries/activity";

const log = createLogger("organizations");

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgs = await getUserOrganizations(user.id);

    return Response.json({ data: orgs });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/organizations error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createOrgSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const org = await createOrganization({
      name: parsed.data.name,
      slug: parsed.data.slug,
      userId: user.id,
    });

    await logActivity({
      orgId: org.id,
      userId: user.id,
      type: "member_joined",
      metadata: { orgName: org.name },
    });

    return Response.json({ data: org }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "POST /api/organizations error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
