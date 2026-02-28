import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { projectStatusEnum } from "./enums";
import { organizations } from "./organizations";

// ─── Projects ────────────────────────────────────────────

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    status: projectStatusEnum("status").default("active").notNull(),
    color: varchar("color", { length: 7 }),
    startDate: timestamp("start_date", { withTimezone: true }),
    targetDate: timestamp("target_date", { withTimezone: true }),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("projects_org_idx").on(table.orgId)]
);

// ─── Project Members ─────────────────────────────────────

export const projectMembers = pgTable(
  "project_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("project_members_project_user_idx").on(
      table.projectId,
      table.userId
    ),
  ]
);
