import { getActiveIntegration } from "./oauth";
import type { CalendarEvent } from "@/types/integrations";
import { withRetry } from "@/lib/utils/retry";
import { getGraphClient } from "./microsoft-client";

export async function getEvents(
  userId: string,
  orgId: string,
  params: { timeMin: string; timeMax: string; maxResults?: number }
): Promise<CalendarEvent[]> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) throw new Error("Microsoft integration not connected");

  const client = getGraphClient(integration.decryptedAccessToken);
  const res = await withRetry(
    () => client
      .api("/me/calendarview")
      .query({ startDateTime: params.timeMin, endDateTime: params.timeMax })
      .top(params.maxResults ?? 20)
      .orderby("start/dateTime")
      .get(),
    { label: "ms-calendar:getEvents" }
  );

  return (res.value ?? []).map((e: any) => ({
    id: e.id,
    summary: e.subject ?? "",
    description: e.bodyPreview ?? undefined,
    startTime: e.start?.dateTime ?? "",
    endTime: e.end?.dateTime ?? "",
    attendees: e.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean),
    location: e.location?.displayName ?? undefined,
  }));
}

export async function createEvent(
  userId: string,
  orgId: string,
  event: { summary: string; description?: string; startTime: string; endTime: string; attendees?: string[]; location?: string }
): Promise<CalendarEvent> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) throw new Error("Microsoft integration not connected");

  const client = getGraphClient(integration.decryptedAccessToken);
  const res = await withRetry(
    () => client.api("/me/events").post({
    subject: event.summary,
    body: event.description ? { contentType: "Text", content: event.description } : undefined,
    start: { dateTime: event.startTime, timeZone: "UTC" },
    end: { dateTime: event.endTime, timeZone: "UTC" },
    location: event.location ? { displayName: event.location } : undefined,
    attendees: event.attendees?.map((email) => ({
      emailAddress: { address: email },
      type: "required",
    })),
  }),
    { label: "ms-calendar:createEvent" }
  );

  return {
    id: res.id,
    summary: res.subject ?? "",
    description: res.bodyPreview ?? undefined,
    startTime: res.start?.dateTime ?? "",
    endTime: res.end?.dateTime ?? "",
    attendees: res.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean),
    location: res.location?.displayName ?? undefined,
  };
}

export async function updateEvent(
  userId: string,
  orgId: string,
  eventId: string,
  updates: Partial<{ summary: string; description: string; startTime: string; endTime: string; attendees: string[]; location: string }>
): Promise<CalendarEvent> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) throw new Error("Microsoft integration not connected");

  const client = getGraphClient(integration.decryptedAccessToken);
  const body: any = {};
  if (updates.summary) body.subject = updates.summary;
  if (updates.description) body.body = { contentType: "Text", content: updates.description };
  if (updates.startTime) body.start = { dateTime: updates.startTime, timeZone: "UTC" };
  if (updates.endTime) body.end = { dateTime: updates.endTime, timeZone: "UTC" };
  if (updates.location) body.location = { displayName: updates.location };
  if (updates.attendees) body.attendees = updates.attendees.map((email) => ({ emailAddress: { address: email }, type: "required" }));

  const res = await withRetry(
    () => client.api(`/me/events/${eventId}`).patch(body),
    { label: "ms-calendar:updateEvent" }
  );

  return {
    id: res.id,
    summary: res.subject ?? "",
    description: res.bodyPreview ?? undefined,
    startTime: res.start?.dateTime ?? "",
    endTime: res.end?.dateTime ?? "",
    attendees: res.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean),
    location: res.location?.displayName ?? undefined,
  };
}

export async function deleteEvent(userId: string, orgId: string, eventId: string): Promise<void> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) throw new Error("Microsoft integration not connected");

  const client = getGraphClient(integration.decryptedAccessToken);
  await withRetry(
    () => client.api(`/me/events/${eventId}`).delete(),
    { label: "ms-calendar:deleteEvent" }
  );
}
