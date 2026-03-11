import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";

// ─── Phase 7: Workspace Role Enum ───────────────────────
// NOTE: workspace_role enum is created in migration SQL,
// referenced here as a plain varchar to avoid enum sync issues.

// ─── Phase 7: Workspaces ────────────────────────────────

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    description: text("description"),
    iconEmoji: varchar("icon_emoji", { length: 50 }),
    color: varchar("color", { length: 7 }),
    isDefault: boolean("is_default").notNull().default(false),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("workspaces_org_idx").on(table.orgId),
    uniqueIndex("workspaces_org_slug_idx").on(table.orgId, table.slug),
  ]
);

// ─── Phase 7: Workspace Members ─────────────────────────

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    workspaceId: uuid("workspace_id")
      .references(() => workspaces.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull().default("member"),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("workspace_members_ws_user_idx").on(
      table.workspaceId,
      table.userId
    ),
    index("workspace_members_user_idx").on(table.userId),
  ]
);
