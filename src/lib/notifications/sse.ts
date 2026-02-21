import { supabaseAdmin } from "@/lib/supabase/admin";

export async function broadcastToUser(
  userId: string,
  orgId: string,
  event: string,
  data: unknown
) {
  const channel = supabaseAdmin.channel(`notifications:${orgId}:${userId}`);
  await channel.send({
    type: "broadcast",
    event,
    payload: data as Record<string, unknown>,
  });
  await supabaseAdmin.removeChannel(channel);
}

export async function broadcastToOrg(
  orgId: string,
  event: string,
  data: unknown
) {
  const channel = supabaseAdmin.channel(`notifications:${orgId}`);
  await channel.send({
    type: "broadcast",
    event,
    payload: data as Record<string, unknown>,
  });
  await supabaseAdmin.removeChannel(channel);
}

// Backward-compat shim for callers that still import sseManager
export const sseManager = {
  sendToUser: (userId: string, orgId: string, event: string, data: unknown) => {
    broadcastToUser(userId, orgId, event, data).catch(() => {});
  },
  sendToOrg: (orgId: string, event: string, data: unknown) => {
    broadcastToOrg(orgId, event, data).catch(() => {});
  },
};
