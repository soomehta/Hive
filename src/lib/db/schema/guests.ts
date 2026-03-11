import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { projects } from "./projects";
import { organizations } from "./organizations";

export const projectGuests = pgTable(
  "project_guests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    token: uuid("token").defaultRandom().notNull().unique(),
    email: varchar("email", { length: 255 }),
    role: varchar("role", { length: 20 }).default("viewer").notNull(),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_project_guests_project").on(table.projectId),
    index("idx_project_guests_token").on(table.token),
  ]
);
