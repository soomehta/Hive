import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { pathwayEnum, dashboardComponentTypeEnum } from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";

// ─── Phase 5: Dashboard Layouts ─────────────────────────

export const dashboardLayouts = pgTable(
  "dashboard_layouts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    userId: varchar("user_id", { length: 255 }),
    pathway: pathwayEnum("pathway").notNull(),
    layoutPresetIndex: integer("layout_preset_index").default(0).notNull(),
    slots: jsonb("slots").notNull(),
    isDefault: boolean("is_default").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("dashboard_layouts_org_idx").on(table.orgId),
    index("dashboard_layouts_user_idx").on(table.userId),
    index("dashboard_layouts_project_idx").on(table.projectId),
  ]
);

// ─── Phase 5: Component Registry ────────────────────────

export const componentRegistry = pgTable(
  "component_registry",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: dashboardComponentTypeEnum("type").notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    defaultConfig: jsonb("default_config").default({}).notNull(),
    supportedPathways: jsonb("supported_pathways").notNull(),
    minWidth: integer("min_width").default(1).notNull(),
    maxWidth: integer("max_width").default(4).notNull(),
    minHeight: integer("min_height").default(1).notNull(),
    maxHeight: integer("max_height").default(4).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);
