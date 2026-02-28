import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { notificationTypeEnum } from "./enums";
import { organizations } from "./organizations";

// ─── Notifications ───────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body"),
    metadata: jsonb("metadata"),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_user_org_idx").on(table.userId, table.orgId),
    index("notifications_is_read_idx").on(table.isRead),
    index("notifications_created_at_idx").on(table.createdAt),
  ]
);
