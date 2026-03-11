import { createPageItem } from "@/lib/db/queries/pages";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCreatePage(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  const title = payload.title?.trim();
  if (!title) {
    return { success: false, error: "Page title is required" };
  }

  const result = await createPageItem({
    orgId: action.orgId,
    ownerId: action.userId,
    title,
    projectId: payload.projectId ?? null,
  });

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "page_created",
    metadata: { itemId: result.item.id, pageId: result.page.id, title, createdByPa: true },
  });

  return { success: true, result: { itemId: result.item.id, pageId: result.page.id } };
}
