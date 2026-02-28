import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { projects } from "./projects";

// ─── Messages ────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }),
    content: text("content").notNull(),
    isFromPa: boolean("is_from_pa").default(false).notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("messages_project_idx").on(table.projectId),
    index("messages_org_idx").on(table.orgId),
  ]
);
