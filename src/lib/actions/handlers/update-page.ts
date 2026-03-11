import { getPageByItemId, updatePageByItemId } from "@/lib/db/queries/pages";
import { getItemById } from "@/lib/db/queries/items";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleUpdatePage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.itemId) {
    return { success: false, error: "itemId is required to update a page" };
  }

  const item = await getItemById(payload.itemId, action.orgId);
  if (!item || item.type !== "page") {
    return { success: false, error: "Page not found" };
  }

  const page = await getPageByItemId(payload.itemId, action.orgId);
  if (!page) {
    return { success: false, error: "Page content not found" };
  }

  const contentJson = payload.contentJson ?? page.contentJson;
  const plainText = payload.plainText ?? page.plainText;

  await updatePageByItemId(payload.itemId, action.orgId, {
    contentJson,
    plainText,
    lastEditedBy: action.userId,
  });

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "page_updated",
    metadata: { itemId: payload.itemId, title: item.title, createdByPa: true },
  });

  return { success: true, result: { itemId: payload.itemId } };
}
