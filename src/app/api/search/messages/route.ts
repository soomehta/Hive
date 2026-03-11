import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { searchChannelMessages } from "@/lib/db/queries/chat";
import { errorResponse } from "@/lib/utils/errors";
import { getCachedUserNames, setCachedUserNames } from "@/lib/cache/user-names";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { organizationMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";

/**
 * GET /api/search/messages?channelId=<id>&q=<query>
 * Search messages within a specific channel.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const url = new URL(req.url);
    const channelId = url.searchParams.get("channelId");
    const query = url.searchParams.get("q")?.trim();

    if (!channelId || !query || query.length < 2) {
      return Response.json(
        { error: "channelId and q (min 2 chars) are required" },
        { status: 400 }
      );
    }

    const messages = await searchChannelMessages(auth.orgId, [channelId], query, 20);

    // Resolve display names
    let userNameMap = getCachedUserNames(auth.orgId);
    if (!userNameMap) {
      const memberRows = await db
        .select({ userId: organizationMembers.userId })
        .from(organizationMembers)
        .where(eq(organizationMembers.orgId, auth.orgId));

      const userMetaResults = await Promise.all(
        memberRows.map((m) =>
          supabaseAdmin.auth.admin.getUserById(m.userId).then((r) => r.data?.user ?? null)
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

    const enriched = messages.map((m) => ({
      ...m,
      authorName: userNameMap!.get(m.authorId) ?? m.authorId.slice(0, 8),
    }));

    return Response.json({ data: enriched });
  } catch (error) {
    return errorResponse(error);
  }
}
