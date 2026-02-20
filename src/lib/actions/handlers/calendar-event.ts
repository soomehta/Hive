import { getActiveIntegration } from "@/lib/integrations/oauth";
import * as googleCalendar from "@/lib/integrations/google-calendar";
import * as microsoftCalendar from "@/lib/integrations/microsoft-calendar";
import type { PAAction } from "@/types/pa";
import type { ExecutionResult } from "../executor";

export async function handleCalendarEvent(action: PAAction): Promise<ExecutionResult> {
  const payload = (action.userEditedPayload ?? action.plannedPayload) as Record<string, any>;

  const google = await getActiveIntegration(action.userId, action.orgId, "google");
  const microsoft = !google ? await getActiveIntegration(action.userId, action.orgId, "microsoft") : null;

  if (!google && !microsoft) {
    return { success: false, error: "No calendar integration connected. Connect Google or Microsoft in Settings > Integrations." };
  }

  try {
    const event = google
      ? await googleCalendar.createEvent(action.userId, action.orgId, {
          summary: payload.title,
          description: payload.description,
          startTime: payload.startTime,
          endTime: payload.endTime,
          attendees: payload.attendees,
          location: payload.location,
        })
      : await microsoftCalendar.createEvent(action.userId, action.orgId, {
          summary: payload.title,
          description: payload.description,
          startTime: payload.startTime,
          endTime: payload.endTime,
          attendees: payload.attendees,
          location: payload.location,
        });

    return { success: true, result: { eventId: event.id, summary: event.summary } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create calendar event" };
  }
}
