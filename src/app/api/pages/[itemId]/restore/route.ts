import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import { getItemById } from "@/lib/db/queries/items";
import {
  getPageByItemId,
  getPageRevisionById,
  updatePageByItemId,
  createPageRevision,
} from "@/lib/db/queries/pages";
import { restorePageRevisionSchema } from "@/lib/utils/validation";
import { logActivity } from "@/lib/db/queries/activity";
import { errorResponse } from "@/lib/utils/errors";

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { itemId } = await params;

    if (!hasPermission(auth.memberRole, "page:restore_revision")) {
      return Response.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const item = await getItemById(itemId, auth.orgId);
    if (!item) {
      return Response.json({ error: "Item not found" }, { status: 404 });
    }

    const page = await getPageByItemId(itemId, auth.orgId);
    if (!page) {
      return Response.json({ error: "Page not found" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = restorePageRevisionSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const revision = await getPageRevisionById(parsed.data.revisionId, auth.orgId);
    if (!revision || revision.pageId !== page.id) {
      return Response.json({ error: "Revision not found" }, { status: 404 });
    }

    // Save current state as a revision before restoring
    await createPageRevision({
      orgId: auth.orgId,
      pageId: page.id,
      createdBy: auth.userId,
      contentJson: page.contentJson as Record<string, unknown>,
      plainText: page.plainText ?? "",
    });

    // Restore content from the selected revision
    const updated = await updatePageByItemId(itemId, auth.orgId, {
      contentJson: revision.contentJson as Record<string, unknown>,
      plainText: revision.plainText ?? undefined,
      lastEditedBy: auth.userId,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId: item.projectId,
      userId: auth.userId,
      type: "page_restored",
      metadata: { itemId, pageId: page.id, revisionId: revision.id },
    });

    return Response.json({ data: updated });
  } catch (error) {
    return errorResponse(error);
  }
}
