import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  real,
  timestamp,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import {
  autonomyModeEnum,
  verbosityEnum,
  formalityEnum,
  actionTypeEnum,
  actionTierEnum,
  actionStatusEnum,
} from "./enums";
import { organizations } from "./organizations";

// ─── PA Profiles ────────────────────────────────────────

export const paProfiles = pgTable(
  "pa_profiles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    autonomyMode: autonomyModeEnum("autonomy_mode")
      .default("copilot")
      .notNull(),
    verbosity: verbosityEnum("verbosity").default("concise").notNull(),
    formality: formalityEnum("formality").default("professional").notNull(),
    morningBriefingEnabled: boolean("morning_briefing_enabled")
      .default(true)
      .notNull(),
    morningBriefingTime: varchar("morning_briefing_time", { length: 5 }).default(
      "08:45"
    ),
    endOfDayDigestEnabled: boolean("end_of_day_digest_enabled")
      .default(false)
      .notNull(),
    endOfDayDigestTime: varchar("end_of_day_digest_time", { length: 5 }).default(
      "17:30"
    ),
    weeklyDigestEnabled: boolean("weekly_digest_enabled")
      .default(true)
      .notNull(),
    weeklyDigestDay: integer("weekly_digest_day").default(5),
    timezone: varchar("timezone", { length: 100 }).default("UTC").notNull(),
    workingHoursStart: varchar("working_hours_start", { length: 5 }).default(
      "09:00"
    ),
    workingHoursEnd: varchar("working_hours_end", { length: 5 }).default(
      "17:00"
    ),
    languagePreferences: jsonb("language_preferences").default(["en"]),
    notificationChannel: varchar("notification_channel", { length: 50 }).default(
      "in_app"
    ),
    actionOverrides: jsonb("action_overrides").default({}),
    avgTasksPerWeek: real("avg_tasks_per_week"),
    peakHours: jsonb("peak_hours"),
    commonBlockers: jsonb("common_blockers"),
    taskDurationAccuracy: real("task_duration_accuracy"),
    updateHabits: text("update_habits"),
    totalInteractions: integer("total_interactions").default(0),
    commonIntents: jsonb("common_intents"),
    assistantBeeInstanceId: uuid("assistant_bee_instance_id"),
    swarmNotificationsEnabled: boolean("swarm_notifications_enabled")
      .default(true)
      .notNull(),
    beeAutonomyOverrides: jsonb("bee_autonomy_overrides").default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("pa_profiles_user_org_idx").on(table.userId, table.orgId),
  ]
);

// ─── PA Conversations ───────────────────────────────────

export const paConversations = pgTable(
  "pa_conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    role: varchar("role", { length: 20 }).notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    beeInstanceId: uuid("bee_instance_id"),
    swarmSessionId: uuid("swarm_session_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pa_conversations_user_org_idx").on(table.userId, table.orgId),
    index("pa_conversations_created_at_idx").on(table.createdAt),
  ]
);

// ─── PA Actions ─────────────────────────────────────────

export const paActions = pgTable(
  "pa_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    conversationId: uuid("conversation_id").references(
      () => paConversations.id
    ),
    actionType: actionTypeEnum("action_type").notNull(),
    tier: actionTierEnum("tier").notNull(),
    status: actionStatusEnum("status").default("pending").notNull(),
    plannedPayload: jsonb("planned_payload").notNull(),
    executedPayload: jsonb("executed_payload"),
    executionResult: jsonb("execution_result"),
    userEditedPayload: jsonb("user_edited_payload"),
    rejectionReason: text("rejection_reason"),
    beeRunId: uuid("bee_run_id"),
    swarmSessionId: uuid("swarm_session_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pa_actions_user_idx").on(table.userId),
    index("pa_actions_user_org_idx").on(table.userId, table.orgId),
    index("pa_actions_status_idx").on(table.status),
  ]
);

// ─── PA Corrections ─────────────────────────────────────

export const paCorrections = pgTable("pa_corrections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  actionId: uuid("action_id").references(() => paActions.id),
  originalOutput: text("original_output").notNull(),
  correctedOutput: text("corrected_output").notNull(),
  correctionType: varchar("correction_type", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Phase 4: Scheduled Reports ─────────────────────────

export const scheduledReports = pgTable("scheduled_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  prompt: text("prompt").notNull(),
  schedule: varchar("schedule", { length: 50 }).notNull(),
  deliveryChannel: varchar("delivery_channel", { length: 50 }).notNull(),
  recipientUserIds: jsonb("recipient_user_ids").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// ─── Voice Transcripts ──────────────────────────────────

export const voiceTranscripts = pgTable(
  "voice_transcripts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    audioUrl: text("audio_url"),
    audioFormat: varchar("audio_format", { length: 20 }),
    durationMs: integer("duration_ms"),
    transcript: text("transcript").notNull(),
    language: varchar("language", { length: 10 }),
    confidence: real("confidence"),
    provider: varchar("provider", { length: 50 }).notNull(),
    rawResponse: jsonb("raw_response"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("voice_transcripts_user_created_idx").on(
      table.userId,
      table.createdAt
    ),
  ]
);
