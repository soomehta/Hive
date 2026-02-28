import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { activityTypeEnum } from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { tasks } from "./tasks";

// ─── Activity Log ────────────────────────────────────────

export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    userId: varchar("user_id", { length: 255 }).notNull(),
    type: activityTypeEnum("type").notNull(),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activity_org_idx").on(table.orgId),
    index("activity_org_user_created_idx").on(
      table.orgId,
      table.userId,
      table.createdAt
    ),
    index("activity_project_idx").on(table.projectId),
    index("activity_user_idx").on(table.userId),
    index("activity_created_idx").on(table.createdAt),
  ]
);
