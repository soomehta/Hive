import { google } from "googleapis";
import { getActiveIntegration } from "./oauth";
import type { CalendarEvent } from "@/types/integrations";
import { withRetry } from "@/lib/utils/retry";

function getCalendarClient(accessToken: string) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: "v3", auth });
}

export async function getEvents(
  userId: string,
  orgId: string,
  params: { timeMin: string; timeMax: string; maxResults?: number }
): Promise<CalendarEvent[]> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) throw new Error("Google integration not connected");

  const calendar = getCalendarClient(integration.decryptedAccessToken);
  const res = await withRetry(
    () => calendar.events.list({
      calendarId: "primary",
      timeMin: params.timeMin,
      timeMax: params.timeMax,
      maxResults: params.maxResults ?? 20,
      singleEvents: true,
      orderBy: "startTime",
    }),
    { label: "google-calendar:getEvents" }
  );

  return (res.data.items ?? []).map((e) => ({
    id: e.id!,
    summary: e.summary ?? "",
    description: e.description ?? undefined,
    startTime: e.start?.dateTime ?? e.start?.date ?? "",
    endTime: e.end?.dateTime ?? e.end?.date ?? "",
    attendees: e.attendees?.map((a) => a.email ?? "").filter(Boolean),
    location: e.location ?? undefined,
  }));
}

export async function createEvent(
  userId: string,
  orgId: string,
  event: { summary: string; description?: string; startTime: string; endTime: string; attendees?: string[]; location?: string }
): Promise<CalendarEvent> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) throw new Error("Google integration not connected");

  const calendar = getCalendarClient(integration.decryptedAccessToken);
  const res = await withRetry(
    () => calendar.events.insert({
      calendarId: "primary",
      requestBody: {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: { dateTime: event.startTime },
      end: { dateTime: event.endTime },
      attendees: event.attendees?.map((email) => ({ email })),
    },
  }),
    { label: "google-calendar:createEvent" }
  );

  return {
    id: res.data.id!,
    summary: res.data.summary ?? "",
    description: res.data.description ?? undefined,
    startTime: res.data.start?.dateTime ?? "",
    endTime: res.data.end?.dateTime ?? "",
    attendees: res.data.attendees?.map((a) => a.email ?? "").filter(Boolean),
    location: res.data.location ?? undefined,
  };
}

export async function updateEvent(
  userId: string,
  orgId: string,
  eventId: string,
  updates: Partial<{ summary: string; description: string; startTime: string; endTime: string; attendees: string[]; location: string }>
): Promise<CalendarEvent> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) throw new Error("Google integration not connected");

  const calendar = getCalendarClient(integration.decryptedAccessToken);
  const res = await withRetry(
    () => calendar.events.patch({
      calendarId: "primary",
      eventId,
      requestBody: {
        summary: updates.summary,
        description: updates.description,
        location: updates.location,
        start: updates.startTime ? { dateTime: updates.startTime } : undefined,
        end: updates.endTime ? { dateTime: updates.endTime } : undefined,
        attendees: updates.attendees?.map((email) => ({ email })),
      },
    }),
    { label: "google-calendar:updateEvent" }
  );

  return {
    id: res.data.id!,
    summary: res.data.summary ?? "",
    description: res.data.description ?? undefined,
    startTime: res.data.start?.dateTime ?? "",
    endTime: res.data.end?.dateTime ?? "",
    attendees: res.data.attendees?.map((a) => a.email ?? "").filter(Boolean),
    location: res.data.location ?? undefined,
  };
}

export async function deleteEvent(userId: string, orgId: string, eventId: string): Promise<void> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) throw new Error("Google integration not connected");

  const calendar = getCalendarClient(integration.decryptedAccessToken);
  await withRetry(
    () => calendar.events.delete({ calendarId: "primary", eventId }),
    { label: "google-calendar:deleteEvent" }
  );
}
