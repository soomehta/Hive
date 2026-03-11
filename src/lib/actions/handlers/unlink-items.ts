import { deleteItemRelation } from "@/lib/db/queries/items";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleUnlinkItems(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.relationId) {
    return { success: false, error: "relationId is required to unlink items" };
  }

  await deleteItemRelation(payload.relationId, action.orgId);

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "item_unlinked",
    metadata: { relationId: payload.relationId, createdByPa: true },
  });

  return { success: true, result: { relationId: payload.relationId } };
}
