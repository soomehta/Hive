import { google } from "googleapis";
import { Client } from "@microsoft/microsoft-graph-client";
import { db } from "@/lib/db";
import { calendarSubscriptions, integrations } from "@/lib/db/schema";
import { eq, and, lt, lte } from "drizzle-orm";
import { getActiveIntegration, decryptToken } from "./oauth";
import { createLogger } from "@/lib/logger";
import { randomUUID } from "crypto";
import type { CalendarEvent } from "@/types/integrations";

const log = createLogger("calendar-sync");

// ─── Webhook URL helpers ────────────────────────────────

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL or VERCEL_URL is required for calendar webhooks");
  return url.startsWith("http") ? url : `https://${url}`;
}

function getGoogleWebhookUrl(): string {
  return `${getBaseUrl()}/api/integrations/google/calendar/webhook`;
}

function getMicrosoftWebhookUrl(): string {
  return `${getBaseUrl()}/api/integrations/microsoft/calendar/webhook`;
}

// ─── Google Calendar Watch ──────────────────────────────

export async function createGoogleWatch(
  userId: string,
  orgId: string,
  integrationId: string
): Promise<{ subscriptionId: string; expiresAt: Date } | null> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) return null;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: integration.decryptedAccessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const channelId = randomUUID();
  // Google watch channels expire in max 7 days; request 6 days
  const expiration = Date.now() + 6 * 24 * 60 * 60 * 1000;

  try {
    const res = await calendar.events.watch({
      calendarId: "primary",
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: getGoogleWebhookUrl(),
        expiration: String(expiration),
      },
    });

    // Do an initial full sync to get the sync token
    let syncToken: string | undefined;
    let pageToken: string | undefined;
    do {
      const listRes = await calendar.events.list({
        calendarId: "primary",
        maxResults: 250,
        singleEvents: true,
        pageToken,
      });
      pageToken = listRes.data.nextPageToken ?? undefined;
      if (!pageToken) {
        syncToken = listRes.data.nextSyncToken ?? undefined;
      }
    } while (pageToken);

    const expiresAt = new Date(Number(res.data.expiration));

    const [sub] = await db
      .insert(calendarSubscriptions)
      .values({
        integrationId,
        userId,
        orgId,
        provider: "google",
        subscriptionId: channelId,
        resourceId: res.data.resourceId ?? null,
        expiresAt,
        syncToken: syncToken ?? null,
        isActive: true,
      })
      .returning();

    log.info({ userId, channelId }, "Google calendar watch created");
    return { subscriptionId: sub.id, expiresAt };
  } catch (err) {
    log.error({ err, userId }, "Failed to create Google calendar watch");
    return null;
  }
}

export async function stopGoogleWatch(subscriptionRow: {
  subscriptionId: string;
  resourceId: string | null;
  userId: string;
  orgId: string;
}): Promise<void> {
  try {
    const integration = await getActiveIntegration(
      subscriptionRow.userId,
      subscriptionRow.orgId,
      "google"
    );
    if (integration) {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: integration.decryptedAccessToken });
      const calendar = google.calendar({ version: "v3", auth });
      await calendar.channels.stop({
        requestBody: {
          id: subscriptionRow.subscriptionId,
          resourceId: subscriptionRow.resourceId ?? undefined,
        },
      });
    }
  } catch (err) {
    log.warn({ err, subscriptionId: subscriptionRow.subscriptionId }, "Failed to stop Google watch (may be expired)");
  }

  await db
    .update(calendarSubscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(calendarSubscriptions.subscriptionId, subscriptionRow.subscriptionId));
}

// ─── Microsoft Graph Subscription ───────────────────────

export async function createMicrosoftSubscription(
  userId: string,
  orgId: string,
  integrationId: string
): Promise<{ subscriptionId: string; expiresAt: Date } | null> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) return null;

  const client = Client.init({
    authProvider: (done) => done(null, integration.decryptedAccessToken),
  });

  // Microsoft calendar subscriptions max 3 days
  const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

  try {
    const subscription = await client.api("/subscriptions").post({
      changeType: "created,updated,deleted",
      notificationUrl: getMicrosoftWebhookUrl(),
      resource: "/me/events",
      expirationDateTime: expiresAt.toISOString(),
      clientState: process.env.MICROSOFT_WEBHOOK_SECRET ?? "hive-calendar-sync",
    });

    // Fetch initial delta link
    let deltaLink: string | undefined;
    let nextLink: string | undefined = "/me/calendarView/delta?startDateTime=" +
      new Date().toISOString() +
      "&endDateTime=" +
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

    do {
      const deltaRes = await client.api(nextLink).get();
      nextLink = deltaRes["@odata.nextLink"];
      if (!nextLink) {
        deltaLink = deltaRes["@odata.deltaLink"];
      }
    } while (nextLink);

    const [sub] = await db
      .insert(calendarSubscriptions)
      .values({
        integrationId,
        userId,
        orgId,
        provider: "microsoft",
        subscriptionId: subscription.id,
        expiresAt,
        syncToken: deltaLink ?? null,
        isActive: true,
      })
      .returning();

    log.info({ userId, subscriptionId: subscription.id }, "Microsoft calendar subscription created");
    return { subscriptionId: sub.id, expiresAt };
  } catch (err) {
    log.error({ err, userId }, "Failed to create Microsoft calendar subscription");
    return null;
  }
}

export async function stopMicrosoftSubscription(subscriptionRow: {
  subscriptionId: string;
  userId: string;
  orgId: string;
}): Promise<void> {
  try {
    const integration = await getActiveIntegration(
      subscriptionRow.userId,
      subscriptionRow.orgId,
      "microsoft"
    );
    if (integration) {
      const client = Client.init({
        authProvider: (done) => done(null, integration.decryptedAccessToken),
      });
      await client.api(`/subscriptions/${subscriptionRow.subscriptionId}`).delete();
    }
  } catch (err) {
    log.warn({ err, subscriptionId: subscriptionRow.subscriptionId }, "Failed to delete Microsoft subscription (may be expired)");
  }

  await db
    .update(calendarSubscriptions)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(calendarSubscriptions.subscriptionId, subscriptionRow.subscriptionId));
}

// ─── Incremental Sync (Google) ──────────────────────────

export interface SyncResult {
  created: CalendarEvent[];
  updated: CalendarEvent[];
  deleted: string[];
  newSyncToken: string | null;
}

export async function googleIncrementalSync(
  userId: string,
  orgId: string,
  syncToken: string
): Promise<SyncResult> {
  const integration = await getActiveIntegration(userId, orgId, "google");
  if (!integration) throw new Error("Google integration not connected");

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: integration.decryptedAccessToken });
  const calendar = google.calendar({ version: "v3", auth });

  const created: CalendarEvent[] = [];
  const updated: CalendarEvent[] = [];
  const deleted: string[] = [];
  let newSyncToken: string | null = null;
  let pageToken: string | undefined;

  try {
    do {
      const res = await calendar.events.list({
        calendarId: "primary",
        syncToken,
        pageToken,
        singleEvents: true,
        maxResults: 250,
      });

      for (const event of res.data.items ?? []) {
        if (event.status === "cancelled") {
          deleted.push(event.id!);
        } else {
          const mapped: CalendarEvent = {
            id: event.id!,
            summary: event.summary ?? "",
            description: event.description ?? undefined,
            startTime: event.start?.dateTime ?? event.start?.date ?? "",
            endTime: event.end?.dateTime ?? event.end?.date ?? "",
            attendees: event.attendees?.map((a) => a.email ?? "").filter(Boolean),
            location: event.location ?? undefined,
          };
          // Google doesn't distinguish created vs updated in sync — treat all as updated
          updated.push(mapped);
        }
      }

      pageToken = res.data.nextPageToken ?? undefined;
      if (!pageToken) {
        newSyncToken = res.data.nextSyncToken ?? null;
      }
    } while (pageToken);
  } catch (err: any) {
    // 410 Gone means syncToken is invalid — need full resync
    if (err?.code === 410) {
      log.warn({ userId }, "Google sync token expired, full resync needed");
      // Do a full sync to get a fresh token
      let freshToken: string | undefined;
      let pt: string | undefined;
      do {
        const listRes = await calendar.events.list({
          calendarId: "primary",
          maxResults: 250,
          singleEvents: true,
          pageToken: pt,
        });
        pt = listRes.data.nextPageToken ?? undefined;
        if (!pt) {
          freshToken = listRes.data.nextSyncToken ?? undefined;
        }
      } while (pt);

      return { created: [], updated: [], deleted: [], newSyncToken: freshToken ?? null };
    }
    throw err;
  }

  return { created, updated, deleted, newSyncToken };
}

// ─── Incremental Sync (Microsoft) ───────────────────────

export async function microsoftDeltaSync(
  userId: string,
  orgId: string,
  deltaLink: string
): Promise<SyncResult> {
  const integration = await getActiveIntegration(userId, orgId, "microsoft");
  if (!integration) throw new Error("Microsoft integration not connected");

  const client = Client.init({
    authProvider: (done) => done(null, integration.decryptedAccessToken),
  });

  const updated: CalendarEvent[] = [];
  const deleted: string[] = [];
  let newDeltaLink: string | null = null;
  let nextLink: string | undefined = deltaLink;

  do {
    const res = await client.api(nextLink).get();

    for (const event of res.value ?? []) {
      if (event["@removed"]) {
        deleted.push(event.id);
      } else {
        updated.push({
          id: event.id,
          summary: event.subject ?? "",
          description: event.bodyPreview ?? undefined,
          startTime: event.start?.dateTime ?? "",
          endTime: event.end?.dateTime ?? "",
          attendees: event.attendees?.map((a: any) => a.emailAddress?.address).filter(Boolean),
          location: event.location?.displayName ?? undefined,
        });
      }
    }

    nextLink = res["@odata.nextLink"];
    if (!nextLink) {
      newDeltaLink = res["@odata.deltaLink"] ?? null;
    }
  } while (nextLink);

  return { created: [], updated, deleted, newSyncToken: newDeltaLink };
}

// ─── Subscription Renewal ───────────────────────────────

export async function renewExpiringSubscriptions(): Promise<number> {
  // Find subscriptions expiring within the next 12 hours
  const cutoff = new Date(Date.now() + 12 * 60 * 60 * 1000);

  const expiring = await db.query.calendarSubscriptions.findMany({
    where: and(
      eq(calendarSubscriptions.isActive, true),
      lte(calendarSubscriptions.expiresAt, cutoff)
    ),
  });

  let renewed = 0;

  for (const sub of expiring) {
    try {
      // Stop old subscription
      if (sub.provider === "google") {
        await stopGoogleWatch(sub);
        const result = await createGoogleWatch(sub.userId, sub.orgId, sub.integrationId);
        if (result) renewed++;
      } else if (sub.provider === "microsoft") {
        // Microsoft subscriptions can be PATCHed to extend
        const integration = await getActiveIntegration(sub.userId, sub.orgId, "microsoft");
        if (integration) {
          const client = Client.init({
            authProvider: (done) => done(null, integration.decryptedAccessToken),
          });
          const newExpiration = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
          try {
            await client.api(`/subscriptions/${sub.subscriptionId}`).patch({
              expirationDateTime: newExpiration.toISOString(),
            });
            await db
              .update(calendarSubscriptions)
              .set({ expiresAt: newExpiration, updatedAt: new Date() })
              .where(eq(calendarSubscriptions.id, sub.id));
            renewed++;
          } catch {
            // If patch fails, recreate
            await stopMicrosoftSubscription(sub);
            const result = await createMicrosoftSubscription(sub.userId, sub.orgId, sub.integrationId);
            if (result) renewed++;
          }
        }
      }
    } catch (err) {
      log.error({ err, subscriptionId: sub.id }, "Failed to renew subscription");
    }
  }

  log.info({ total: expiring.length, renewed }, "Subscription renewal complete");
  return renewed;
}

// ─── Cleanup helper ─────────────────────────────────────

export async function stopAllSubscriptionsForIntegration(integrationId: string): Promise<void> {
  const subs = await db.query.calendarSubscriptions.findMany({
    where: and(
      eq(calendarSubscriptions.integrationId, integrationId),
      eq(calendarSubscriptions.isActive, true)
    ),
  });

  for (const sub of subs) {
    if (sub.provider === "google") {
      await stopGoogleWatch(sub);
    } else if (sub.provider === "microsoft") {
      await stopMicrosoftSubscription(sub);
    }
  }
}

// ─── Lookup helpers ─────────────────────────────────────

export async function findSubscriptionByChannelId(channelId: string) {
  return db.query.calendarSubscriptions.findFirst({
    where: and(
      eq(calendarSubscriptions.subscriptionId, channelId),
      eq(calendarSubscriptions.isActive, true)
    ),
  });
}

export async function findSubscriptionByMicrosoftId(subscriptionId: string) {
  return db.query.calendarSubscriptions.findFirst({
    where: and(
      eq(calendarSubscriptions.subscriptionId, subscriptionId),
      eq(calendarSubscriptions.isActive, true)
    ),
  });
}

export async function updateSyncToken(id: string, syncToken: string): Promise<void> {
  await db
    .update(calendarSubscriptions)
    .set({ syncToken, updatedAt: new Date() })
    .where(eq(calendarSubscriptions.id, id));
}
