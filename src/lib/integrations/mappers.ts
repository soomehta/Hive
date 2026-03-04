import type { CalendarEvent, EmailMessage } from "@/types/integrations";

export function mapGoogleEvent(e: any): CalendarEvent {
  return {
    id: e.id!,
    summary: e.summary ?? "",
    description: e.description ?? undefined,
    startTime: e.start?.dateTime ?? e.start?.date ?? "",
    endTime: e.end?.dateTime ?? e.end?.date ?? "",
    attendees: e.attendees?.map((a: any) => a.email ?? "").filter(Boolean),
    location: e.location ?? undefined,
  };
}

export function mapMicrosoftEvent(e: any): CalendarEvent {
  return {
    id: e.id,
    summary: e.subject ?? "",
    description: e.bodyPreview ?? undefined,
    startTime: e.start?.dateTime ?? "",
    endTime: e.end?.dateTime ?? "",
    attendees: e.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean),
    location: e.location?.displayName ?? undefined,
  };
}

export function mapGoogleEmail(
  msgId: string,
  headers: Array<{ name?: string | null; value?: string | null }>,
  snippet: string
): EmailMessage {
  return {
    id: msgId,
    from: headers.find((h) => h.name === "From")?.value ?? "",
    subject: headers.find((h) => h.name === "Subject")?.value ?? "",
    snippet,
    date: headers.find((h) => h.name === "Date")?.value ?? "",
  };
}

export function mapMicrosoftEmail(m: any): EmailMessage {
  return {
    id: m.id,
    from: m.from?.emailAddress?.address ?? "",
    subject: m.subject ?? "",
    snippet: m.bodyPreview ?? "",
    date: m.receivedDateTime ?? "",
  };
}
