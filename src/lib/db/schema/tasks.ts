import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { taskStatusEnum, taskPriorityEnum } from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";

// ─── Tasks ───────────────────────────────────────────────

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: taskStatusEnum("status").default("todo").notNull(),
    priority: taskPriorityEnum("priority").default("medium").notNull(),
    assigneeId: varchar("assignee_id", { length: 255 }),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    estimatedMinutes: integer("estimated_minutes"),
    position: integer("position").default(0).notNull(),
    isBlocked: boolean("is_blocked").default(false).notNull(),
    blockedReason: text("blocked_reason"),
    parentTaskId: uuid("parent_task_id").references(
      (): AnyPgColumn => tasks.id,
      { onDelete: "set null" }
    ),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("tasks_project_idx").on(table.projectId),
    index("tasks_assignee_idx").on(table.assigneeId),
    index("tasks_org_idx").on(table.orgId),
    index("tasks_status_idx").on(table.status),
    index("tasks_due_date_idx").on(table.dueDate),
    index("tasks_completed_at_idx").on(table.completedAt),
  ]
);

// ─── Task Comments ───────────────────────────────────────

export const taskComments = pgTable(
  "task_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    taskId: uuid("task_id")
      .references(() => tasks.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    isFromPa: boolean("is_from_pa").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("task_comments_task_idx").on(table.taskId)]
);
