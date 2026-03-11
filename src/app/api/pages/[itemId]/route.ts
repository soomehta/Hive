import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getItemById } from "@/lib/db/queries/items";
import {
  getPageByItemId,
  createPage,
  updatePageByItemId,
  createPageRevision,
} from "@/lib/db/queries/pages";
import { upsertPageSchema } from "@/lib/utils/validation";
import { isProjectMember } from "@/lib/db/queries/projects";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { sanitizeContentJson, sanitizePlainText } from "@/lib/utils/sanitize";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { itemId } = await params;

    const item = await getItemById(itemId, auth.orgId);
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    if (!hasPermission(auth.memberRole, "page:read")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Enforce project-scoped access
    if (item.projectId) {
      const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
      const isMember = await isProjectMember(item.projectId, auth.userId);
      if (!isAdminLike && !isMember) {
        return Response.json({ error: "You must be a project member to view this page" }, { status: 403 });
      }
    }

    const page = await getPageByItemId(itemId, auth.orgId);
    if (!page) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }

    return Response.json({ data: page });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);

    // Rate limit: 20 saves per 60s per user (autosave + manual)
    const rl = await rateLimit(`page:save:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const { itemId } = await params;
    const item = await getItemById(itemId, auth.orgId);

    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = upsertPageSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const isOwner = item.ownerId === auth.userId;
    const isAdminLike = auth.memberRole === "owner" || auth.memberRole === "admin";
    const canEdit = hasPermission(auth.memberRole, "page:edit");

    if (!isOwner && !isAdminLike && !canEdit) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Enforce project-scoped access
    if (item.projectId && !isAdminLike) {
      const isMember = await isProjectMember(item.projectId, auth.userId);
      if (!isMember) {
        return Response.json({ error: "You must be a project member to edit this page" }, { status: 403 });
      }
    }

    // Sanitize content to prevent XSS
    if (parsed.data.contentJson) {
      parsed.data.contentJson = sanitizeContentJson(parsed.data.contentJson as Record<string, unknown>) as any;
    }
    if (parsed.data.plainText) {
      parsed.data.plainText = sanitizePlainText(parsed.data.plainText);
    }

    const existing = await getPageByItemId(itemId, auth.orgId);
    let page;

    if (!existing) {
      page = await createPage({
        orgId: auth.orgId,
        itemId,
        lastEditedBy: auth.userId,
        contentJson: parsed.data.contentJson,
        plainText: parsed.data.plainText,
        icon: parsed.data.icon ?? undefined,
        coverUrl: parsed.data.coverUrl ?? undefined,
        editorVersion: parsed.data.editorVersion,
      });
    } else {
      page = await updatePageByItemId(itemId, auth.orgId, {
        contentJson: parsed.data.contentJson,
        plainText: parsed.data.plainText,
        icon: parsed.data.icon,
        coverUrl: parsed.data.coverUrl,
        lastEditedBy: auth.userId,
      });
    }

    if (page && parsed.data.createRevision) {
      await createPageRevision({
        orgId: auth.orgId,
        pageId: page.id,
        createdBy: auth.userId,
        contentJson: parsed.data.contentJson,
        plainText: parsed.data.plainText,
      });
    }

    await logActivity({
      orgId: auth.orgId,
      projectId: item.projectId,
      userId: auth.userId,
      type: existing ? "page_updated" : "page_created",
      metadata: { itemId, pageId: page?.id },
    });

    // Re-embed on content change
    if (parsed.data.contentJson || parsed.data.plainText) {
      const { enqueueEmbedding } = await import("@/lib/queue/jobs");
      const pageText = parsed.data.plainText ?? page?.plainText ?? "";
      enqueueEmbedding("page", itemId, `${item.title} ${pageText}`, auth.orgId).catch(() => {});
    }

    return Response.json({ data: page });
  } catch (error) {
    return errorResponse(error);
  }
}
