import type { InferSelectModel } from "drizzle-orm";
import type { integrations } from "@/lib/db/schema";

export type Integration = InferSelectModel<typeof integrations>;
export type IntegrationProvider = "google" | "microsoft" | "slack";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}
