import { createItemRelation, getItemById } from "@/lib/db/queries/items";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleLinkItems(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.fromItemId || !payload.toItemId) {
    return { success: false, error: "Both fromItemId and toItemId are required" };
  }

  const fromItem = await getItemById(payload.fromItemId, action.orgId);
  const toItem = await getItemById(payload.toItemId, action.orgId);
  if (!fromItem || !toItem) {
    return { success: false, error: "One or both items not found" };
  }

  const relation = await createItemRelation({
    orgId: action.orgId,
    fromItemId: payload.fromItemId,
    toItemId: payload.toItemId,
    relationType: payload.relationType || "references",
    createdBy: action.userId,
  });

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "item_linked",
    metadata: {
      relationId: relation.id,
      fromItemId: payload.fromItemId,
      toItemId: payload.toItemId,
      relationType: payload.relationType || "references",
      createdByPa: true,
    },
  });

  return { success: true, result: { relationId: relation.id } };
}
