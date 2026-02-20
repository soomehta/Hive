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
  pgEnum,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";
import { vector } from "drizzle-orm/pg-core/columns/vector_extension/vector";
import { relations } from "drizzle-orm";

// ─── Enums ───────────────────────────────────────────────

export const orgRoleEnum = pgEnum("org_role", ["owner", "admin", "member"]);

export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "paused",
  "completed",
  "archived",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "in_review",
  "done",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_completed",
  "task_overdue",
  "task_commented",
  "message_posted",
  "blocker_flagged",
  "pa_action_pending",
  "pa_briefing",
  "pa_nudge",
  "pa_report_ready",
  "member_invited",
  "project_created",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "task_created",
  "task_updated",
  "task_completed",
  "task_deleted",
  "task_assigned",
  "task_commented",
  "blocker_flagged",
  "blocker_resolved",
  "message_posted",
  "project_created",
  "project_updated",
  "member_joined",
  "member_left",
  "pa_action_executed",
  "pa_report_generated",
]);

// ─── Phase 2 Enums ─────────────────────────────────────

export const actionTierEnum = pgEnum("action_tier", [
  "auto_execute",
  "execute_notify",
  "draft_approve",
  "suggest_only",
]);

export const actionStatusEnum = pgEnum("action_status", [
  "pending",
  "approved",
  "rejected",
  "executed",
  "failed",
  "expired",
]);

export const actionTypeEnum = pgEnum("action_type", [
  "create_task",
  "update_task",
  "complete_task",
  "delete_task",
  "create_comment",
  "post_message",
  "flag_blocker",
  "calendar_block",
  "calendar_event",
  "calendar_reschedule",
  "send_email",
  "send_slack",
  "generate_report",
  "generate_briefing",
  "check_tasks",
  "check_calendar",
  "check_email",
  "check_project_status",
  "check_workload",
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "google",
  "microsoft",
  "slack",
]);

export const autonomyModeEnum = pgEnum("autonomy_mode", [
  "autopilot",
  "copilot",
  "manual",
]);

export const verbosityEnum = pgEnum("verbosity", [
  "concise",
  "detailed",
  "bullet_points",
]);

export const formalityEnum = pgEnum("formality", [
  "casual",
  "professional",
  "mixed",
]);

// ─── Organizations ───────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invitations: many(invitations),
  projects: many(projects),
}));

// ─── Organization Members ────────────────────────────────

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: orgRoleEnum("role").default("member").notNull(),
    jobTitle: varchar("job_title", { length: 255 }),
    department: varchar("department", { length: 255 }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("org_members_org_user_idx").on(table.orgId, table.userId),
    index("org_members_user_idx").on(table.userId),
  ]
);

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.orgId],
      references: [organizations.id],
    }),
  })
);

// ─── Invitations ─────────────────────────────────────────

export const invitations = pgTable("invitations", {
  id: uuid("id").defaultRandom().primaryKey(),
  orgId: uuid("org_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  role: orgRoleEnum("role").default("member").notNull(),
  invitedBy: varchar("invited_by", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.orgId],
    references: [organizations.id],
  }),
}));

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

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  members: many(projectMembers),
  tasks: many(tasks),
  messages: many(messages),
}));

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

export const projectMembersRelations = relations(
  projectMembers,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectMembers.projectId],
      references: [projects.id],
    }),
  })
);

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
    parentTaskId: uuid("parent_task_id").references((): AnyPgColumn => tasks.id, {
      onDelete: "set null",
    }),
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
  ]
);

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, {
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [tasks.orgId],
    references: [organizations.id],
  }),
  parentTask: one(tasks, {
    fields: [tasks.parentTaskId],
    references: [tasks.id],
    relationName: "subtasks",
  }),
  subtasks: many(tasks, { relationName: "subtasks" }),
  comments: many(taskComments),
}));

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

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
}));

// ─── Messages ────────────────────────────────────────────

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }),
    content: text("content").notNull(),
    isFromPa: boolean("is_from_pa").default(false).notNull(),
    isPinned: boolean("is_pinned").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("messages_project_idx").on(table.projectId)]
);

export const messagesRelations = relations(messages, ({ one }) => ({
  project: one(projects, {
    fields: [messages.projectId],
    references: [projects.id],
  }),
  organization: one(organizations, {
    fields: [messages.orgId],
    references: [organizations.id],
  }),
}));

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
    index("activity_project_idx").on(table.projectId),
    index("activity_user_idx").on(table.userId),
    index("activity_created_idx").on(table.createdAt),
  ]
);

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  organization: one(organizations, {
    fields: [activityLog.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [activityLog.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [activityLog.taskId],
    references: [tasks.id],
  }),
}));

// ─── Notifications ───────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    type: notificationTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body"),
    metadata: jsonb("metadata"),
    isRead: boolean("is_read").default(false).notNull(),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_idx").on(table.userId),
    index("notifications_is_read_idx").on(table.isRead),
  ]
);

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.orgId],
    references: [organizations.id],
  }),
}));

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

export const paProfilesRelations = relations(paProfiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [paProfiles.orgId],
    references: [organizations.id],
  }),
}));

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
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pa_conversations_user_org_idx").on(table.userId, table.orgId),
    index("pa_conversations_created_at_idx").on(table.createdAt),
  ]
);

export const paConversationsRelations = relations(
  paConversations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [paConversations.orgId],
      references: [organizations.id],
    }),
  })
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
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("pa_actions_user_idx").on(table.userId),
    index("pa_actions_status_idx").on(table.status),
  ]
);

export const paActionsRelations = relations(paActions, ({ one }) => ({
  organization: one(organizations, {
    fields: [paActions.orgId],
    references: [organizations.id],
  }),
  conversation: one(paConversations, {
    fields: [paActions.conversationId],
    references: [paConversations.id],
  }),
}));

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

export const paCorrectionsRelations = relations(paCorrections, ({ one }) => ({
  organization: one(organizations, {
    fields: [paCorrections.orgId],
    references: [organizations.id],
  }),
  action: one(paActions, {
    fields: [paCorrections.actionId],
    references: [paActions.id],
  }),
}));

// ─── Voice Transcripts ──────────────────────────────────

export const voiceTranscripts = pgTable("voice_transcripts", {
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
});

// ─── Integrations (OAuth Tokens) ───────────────────────

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    provider: integrationProviderEnum("provider").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    scopes: jsonb("scopes"),
    providerAccountId: varchar("provider_account_id", { length: 255 }),
    providerAccountEmail: varchar("provider_account_email", { length: 255 }),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("integrations_user_provider_idx").on(
      table.userId,
      table.orgId,
      table.provider
    ),
  ]
);

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.orgId],
    references: [organizations.id],
  }),
}));

// ─── Phase 4: Embeddings (pgvector) ─────────────────────

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    sourceType: varchar("source_type", { length: 50 }).notNull(),
    sourceId: uuid("source_id").notNull(),
    content: text("content").notNull(),
    embedding: vector("embedding", { dimensions: 1536 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("embeddings_org_idx").on(table.orgId),
    index("embeddings_source_idx").on(table.sourceType, table.sourceId),
  ]
);

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  organization: one(organizations, {
    fields: [embeddings.orgId],
    references: [organizations.id],
  }),
}));

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

export const scheduledReportsRelations = relations(
  scheduledReports,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [scheduledReports.orgId],
      references: [organizations.id],
    }),
  })
);
