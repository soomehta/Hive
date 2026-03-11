import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  getChannelById,
  isChannelMember,
  listChannelMessages,
  postChannelMessage,
  getReactionsForMessages,
} from "@/lib/db/queries/chat";
import { createChatMessageSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { sanitizePlainText, sanitizeContentJson } from "@/lib/utils/sanitize";
import { broadcastToOrg } from "@/lib/notifications/sse";
import { getCachedUserNames, setCachedUserNames } from "@/lib/cache/user-names";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { organizationMembers } from "@/lib/db/schema";
import { chatThreads, chatThreadMessages } from "@/lib/db/schema";
import { eq, inArray, sql, and } from "drizzle-orm";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ channelId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { channelId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    const isMember = await isChannelMember(auth.orgId, channelId, auth.userId);
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    if (!isMember && !isAdminLike) {
      return Response.json({ error: "Join this channel first" }, { status: 403 });
    }

    // Parse pagination params
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit")) || 50, 100);
    const before = url.searchParams.get("before") || undefined;

    const messages = await listChannelMessages(auth.orgId, channelId, limit, before);

    // Batch-resolve author display names
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

    const messageIds = messages.map((m) => m.id);

    // Item 8: Batch-fetch reactions for all messages
    const reactionsMap = await getReactionsForMessages(auth.orgId, messageIds);

    // Item 9: Batch-fetch thread reply counts
    let threadReplyCounts: Record<string, number> = {};
    if (messageIds.length > 0) {
      const threadRows = await db
        .select({
          rootMessageId: chatThreads.rootMessageId,
          replyCount: sql<number>`count(${chatThreadMessages.id})::int`,
        })
        .from(chatThreads)
        .leftJoin(chatThreadMessages, eq(chatThreadMessages.threadId, chatThreads.id))
        .where(
          and(
            eq(chatThreads.orgId, auth.orgId),
            inArray(chatThreads.rootMessageId, messageIds),
          )
        )
        .groupBy(chatThreads.rootMessageId);

      for (const row of threadRows) {
        if (row.replyCount > 0) {
          threadReplyCounts[row.rootMessageId] = row.replyCount;
        }
      }
    }

    const enrichedMessages = messages.map((m) => {
      const rawReactions = reactionsMap[m.id] ?? [];
      return {
        ...m,
        authorName: userNameMap!.get(m.authorId) ?? m.authorId.slice(0, 8),
        reactions: rawReactions.map((r) => ({
          emoji: r.emoji,
          count: r.count,
          hasReacted: r.userIds.includes(auth.userId),
        })),
        threadReplyCount: threadReplyCounts[m.id] ?? 0,
      };
    });

    return Response.json({ data: enrichedMessages });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);

    // Rate limit: 30 messages per 60s per user
    const rl = await rateLimit(`chat:post:${auth.userId}`, 30, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const { channelId } = await params;
    const channel = await getChannelById(auth.orgId, channelId);
    if (!channel) {
      return Response.json({ error: "Channel not found" }, { status: 404 });
    }

    if (!hasPermission(auth.memberRole, "chat:message_post")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const isMember = await isChannelMember(auth.orgId, channelId, auth.userId);
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    if (!isMember && !isAdminLike) {
      return Response.json({ error: "Join this channel first" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = createChatMessageSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const message = await postChannelMessage({
      orgId: auth.orgId,
      channelId,
      authorId: auth.userId,
      content: sanitizePlainText(parsed.data.content),
      contentJson: parsed.data.contentJson ? sanitizeContentJson(parsed.data.contentJson) : undefined,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: channel.projectId,
      userId: auth.userId,
      type: "channel_message_posted",
      metadata: { channelId, messageId: message.id },
    });

    // Broadcast for real-time updates
    broadcastToOrg(auth.orgId, "chat:message_posted", {
      channelId,
      messageId: message.id,
    }).catch(() => {});

    return Response.json({ data: message }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
