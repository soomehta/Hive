import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { integrationProviderEnum } from "./enums";
import { organizations } from "./organizations";

// ─── Integrations (OAuth Tokens) ───────────────────────

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    provider: integrationProviderEnum("provider").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: jsonb("scopes"),
    providerAccountId: varchar("provider_account_id", { length: 255 }),
    providerAccountEmail: varchar("provider_account_email", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("integrations_user_provider_idx").on(
      table.userId,
      table.orgId,
      table.provider
    ),
  ]
);

// ─── Calendar Subscriptions (Two-Way Sync) ──────────────

export const calendarSubscriptions = pgTable(
  "calendar_subscriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    integrationId: uuid("integration_id")
      .references(() => integrations.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    provider: integrationProviderEnum("provider").notNull(),
    /** Google: channel ID from events.watch; Microsoft: subscription ID from /subscriptions */
    subscriptionId: varchar("subscription_id", { length: 500 }).notNull(),
    /** Google: resourceId returned by watch; Microsoft: not used */
    resourceId: varchar("resource_id", { length: 500 }),
    /** When the subscription expires and needs renewal */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    /** Google: syncToken for incremental sync; Microsoft: deltaLink */
    syncToken: text("sync_token"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("cal_sub_subscription_id_idx").on(table.subscriptionId),
    index("cal_sub_integration_idx").on(table.integrationId),
    index("cal_sub_user_org_idx").on(table.userId, table.orgId),
    index("cal_sub_expires_idx").on(table.expiresAt),
  ]
);
