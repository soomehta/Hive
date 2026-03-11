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
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  beeTypeEnum,
  beeSubtypeEnum,
  beeRunStatusEnum,
  swarmStatusEnum,
  handoverTypeEnum,
  signalTypeEnum,
  actionTierEnum,
  scheduleTypeEnum,
  checkinStatusEnum,
  checkinFrequencyEnum,
} from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { workspaces } from "./workspaces";

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
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
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

// ─── Phase 7: Agent Schedules ──────────────────────────

export const agentSchedules = pgTable(
  "agent_schedules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    beeInstanceId: uuid("bee_instance_id")
      .references(() => beeInstances.id, { onDelete: "cascade" })
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    scheduleType: scheduleTypeEnum("schedule_type").notNull(),
    cronExpression: varchar("cron_expression", { length: 100 }).notNull(),
    timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
    config: jsonb("config").default({}).notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_schedules_bee_idx").on(table.beeInstanceId),
    index("agent_schedules_org_ws_idx").on(table.orgId, table.workspaceId),
    index("agent_schedules_active_idx").on(table.isActive, table.lastRunAt),
  ]
);

// ─── Phase 7: Agent Reports ────────────────────────────

export const agentReports = pgTable(
  "agent_reports",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    beeInstanceId: uuid("bee_instance_id")
      .references(() => beeInstances.id, { onDelete: "cascade" })
      .notNull(),
    reportType: varchar("report_type", { length: 50 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    content: text("content").notNull(),
    contentJson: jsonb("content_json"),
    projectIds: jsonb("project_ids").default([]),
    period: jsonb("period"),
    channelId: uuid("channel_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_reports_org_ws_idx").on(table.orgId, table.workspaceId),
    index("agent_reports_type_idx").on(table.reportType),
  ]
);

// ─── Phase 7: Agent Check-ins ──────────────────────────

export const agentCheckins = pgTable(
  "agent_checkins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    taskId: uuid("task_id").notNull(),
    assigneeUserId: varchar("assignee_user_id", { length: 255 }).notNull(),
    beeInstanceId: uuid("bee_instance_id")
      .references(() => beeInstances.id, { onDelete: "cascade" })
      .notNull(),
    question: text("question").notNull(),
    questionContext: jsonb("question_context"),
    response: text("response"),
    responseMetadata: jsonb("response_metadata"),
    channelId: uuid("channel_id"),
    messageId: uuid("message_id"),
    status: checkinStatusEnum("status").notNull().default("pending"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .notNull(),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("agent_checkins_org_ws_idx").on(table.orgId, table.workspaceId),
    index("agent_checkins_task_idx").on(table.taskId),
    index("agent_checkins_user_status_idx").on(table.assigneeUserId, table.status),
    index("agent_checkins_scheduled_idx").on(table.scheduledAt),
  ]
);

// ─── Phase 7: Check-in Preferences ─────────────────────

export const checkinPreferences = pgTable(
  "checkin_preferences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    frequency: checkinFrequencyEnum("frequency").notNull().default("standard"),
    preferredTime: varchar("preferred_time", { length: 5 }).default("10:00"),
    quietHoursStart: varchar("quiet_hours_start", { length: 5 }).default("18:00"),
    quietHoursEnd: varchar("quiet_hours_end", { length: 5 }).default("08:00"),
    maxCheckinsPerDay: integer("max_checkins_per_day").notNull().default(5),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("checkin_prefs_user_org_idx").on(table.userId, table.orgId),
  ]
);
