import { getActiveIntegration } from "@/lib/integrations/oauth";
import * as googleCalendar from "@/lib/integrations/google-calendar";
import * as microsoftCalendar from "@/lib/integrations/microsoft-calendar";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCalendarReschedule(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  if (!payload.eventId) {
    return { success: false, error: "Event ID is required to reschedule" };
  }

  const google = await getActiveIntegration(action.userId, action.orgId, "google");
  const microsoft = !google ? await getActiveIntegration(action.userId, action.orgId, "microsoft") : null;

  if (!google && !microsoft) {
    return { success: false, error: "No calendar integration connected. Connect Google or Microsoft in Settings > Integrations." };
  }

  try {
    const updates: Partial<{ summary: string; description: string; startTime: string; endTime: string; attendees: string[] }> = {};
    if (payload.newDate || payload.newTime) {
      if (payload.startTime) updates.startTime = payload.startTime;
      if (payload.endTime) updates.endTime = payload.endTime;
    }
    if (payload.title) updates.summary = payload.title;

    const event = google
      ? await googleCalendar.updateEvent(action.userId, action.orgId, payload.eventId, updates)
      : await microsoftCalendar.updateEvent(action.userId, action.orgId, payload.eventId, updates);

    return { success: true, result: { eventId: event.id, summary: event.summary, newStart: event.startTime, newEnd: event.endTime } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to reschedule event" };
  }
}
