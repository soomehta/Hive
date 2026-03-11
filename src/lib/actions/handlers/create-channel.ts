import { createChannel } from "@/lib/db/queries/chat";
import { logActivity } from "@/lib/db/queries/activity";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCreateChannel(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  const name = payload.name?.trim();
  if (!name) {
    return { success: false, error: "Channel name is required" };
  }

  const channel = await createChannel({
    orgId: action.orgId,
    name,
    topic: payload.description?.trim() || undefined,
    createdBy: action.userId,
    projectId: payload.projectId ?? undefined,
    scope: payload.projectId ? "project" : "team",
  });

  // Creator is already added as owner inside createChannel() transaction

  await logActivity({
    orgId: action.orgId,
    userId: action.userId,
    type: "channel_created",
    metadata: { channelId: channel.id, channelName: name, createdByPa: true },
  });

  return { success: true, result: { channelId: channel.id } };
}
