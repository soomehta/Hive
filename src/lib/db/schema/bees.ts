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
import {
  beeTypeEnum,
  beeSubtypeEnum,
  beeRunStatusEnum,
  swarmStatusEnum,
  handoverTypeEnum,
  signalTypeEnum,
  actionTierEnum,
} from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";

// ─── Phase 5: Bee Templates ─────────────────────────────

export const beeTemplates = pgTable(
  "bee_templates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    type: beeTypeEnum("type").notNull(),
    subtype: beeSubtypeEnum("subtype").default("none").notNull(),
    systemPrompt: text("system_prompt").notNull(),
    toolAccess: jsonb("tool_access").default([]).notNull(),
    defaultAutonomyTier: actionTierEnum("default_autonomy_tier")
      .default("draft_approve")
      .notNull(),
    triggerConditions: jsonb("trigger_conditions").default({}).notNull(),
    isSystem: boolean("is_system").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bee_templates_org_idx").on(table.orgId),
    index("bee_templates_type_idx").on(table.type),
  ]
);

// ─── Phase 5: Bee Instances ─────────────────────────────

export const beeInstances = pgTable(
  "bee_instances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    templateId: uuid("template_id")
      .references(() => beeTemplates.id, { onDelete: "cascade" })
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    name: varchar("name", { length: 255 }).notNull(),
    contextOverrides: jsonb("context_overrides").default({}).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bee_instances_org_idx").on(table.orgId),
    index("bee_instances_project_idx").on(table.projectId),
    index("bee_instances_template_idx").on(table.templateId),
  ]
);

// ─── Phase 5: Swarm Sessions ────────────────────────────

export const swarmSessions = pgTable(
  "swarm_sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    conversationId: uuid("conversation_id"),
    triggerMessage: text("trigger_message").notNull(),
    dispatchPlan: jsonb("dispatch_plan").notNull(),
    status: swarmStatusEnum("status").default("planning").notNull(),
    result: jsonb("result"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("swarm_sessions_org_idx").on(table.orgId),
    index("swarm_sessions_user_idx").on(table.userId),
    index("swarm_sessions_status_idx").on(table.status),
  ]
);

// ─── Phase 5: Bee Runs ──────────────────────────────────

export const beeRuns = pgTable(
  "bee_runs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    swarmSessionId: uuid("swarm_session_id")
      .references(() => swarmSessions.id, { onDelete: "cascade" })
      .notNull(),
    beeInstanceId: uuid("bee_instance_id")
      .references(() => beeInstances.id, { onDelete: "cascade" })
      .notNull(),
    status: beeRunStatusEnum("status").default("queued").notNull(),
    order: integer("order").default(0).notNull(),
    input: jsonb("input"),
    output: jsonb("output"),
    statusText: text("status_text"),
    tokensUsed: integer("tokens_used"),
    durationMs: integer("duration_ms"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bee_runs_swarm_idx").on(table.swarmSessionId),
    index("bee_runs_instance_idx").on(table.beeInstanceId),
    index("bee_runs_status_idx").on(table.status),
  ]
);

// ─── Phase 5: Hive Context ─────────────────────────────

export const hiveContext = pgTable(
  "hive_context",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    swarmSessionId: uuid("swarm_session_id")
      .references(() => swarmSessions.id, { onDelete: "cascade" })
      .notNull(),
    beeRunId: uuid("bee_run_id")
      .references(() => beeRuns.id, { onDelete: "cascade" })
      .notNull(),
    key: varchar("key", { length: 255 }).notNull(),
    value: jsonb("value").notNull(),
    contextType: varchar("context_type", { length: 50 }).notNull(),
    isVisible: boolean("is_visible").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("hive_context_swarm_idx").on(table.swarmSessionId),
    index("hive_context_bee_run_idx").on(table.beeRunId),
    index("hive_context_key_idx").on(table.key),
  ]
);

// ─── Phase 5: Bee Handovers ─────────────────────────────

export const beeHandovers = pgTable(
  "bee_handovers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    swarmSessionId: uuid("swarm_session_id")
      .references(() => swarmSessions.id, { onDelete: "cascade" })
      .notNull(),
    fromBeeRunId: uuid("from_bee_run_id")
      .references(() => beeRuns.id, { onDelete: "cascade" })
      .notNull(),
    toBeeRunId: uuid("to_bee_run_id")
      .references(() => beeRuns.id, { onDelete: "cascade" })
      .notNull(),
    handoverType: handoverTypeEnum("handover_type").notNull(),
    summary: text("summary").notNull(),
    data: jsonb("data"),
    request: text("request"),
    constraints: jsonb("constraints"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bee_handovers_swarm_idx").on(table.swarmSessionId),
  ]
);

// ─── Phase 5: Bee Signals ───────────────────────────────

export const beeSignals = pgTable(
  "bee_signals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    swarmSessionId: uuid("swarm_session_id")
      .references(() => swarmSessions.id, { onDelete: "cascade" })
      .notNull(),
    fromBeeRunId: uuid("from_bee_run_id")
      .references(() => beeRuns.id, { onDelete: "cascade" })
      .notNull(),
    targetBeeRunId: uuid("target_bee_run_id").references(() => beeRuns.id, {
      onDelete: "set null",
    }),
    signalType: signalTypeEnum("signal_type").notNull(),
    message: text("message").notNull(),
    data: jsonb("data"),
    isResolved: boolean("is_resolved").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bee_signals_swarm_idx").on(table.swarmSessionId),
    index("bee_signals_resolved_idx").on(table.isResolved),
  ]
);
