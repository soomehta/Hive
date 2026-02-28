import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { tasks } from "./tasks";

// ─── Files ──────────────────────────────────────────────

export const files = pgTable(
  "files",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    taskId: uuid("task_id").references(() => tasks.id, {
      onDelete: "set null",
    }),
    uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
    fileName: varchar("file_name", { length: 500 }).notNull(),
    fileSize: integer("file_size").notNull(),
    mimeType: varchar("mime_type", { length: 255 }).notNull(),
    r2Key: varchar("r2_key", { length: 1000 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("files_project_idx").on(table.projectId),
    index("files_org_idx").on(table.orgId),
    index("files_task_idx").on(table.taskId),
  ]
);
