import { z } from "zod/v4";

// ─── Organizations ───────────────────────────────────────

export const createOrgSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
});

export const updateOrgSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  logoUrl: z.string().url().nullable().optional(),
});

// ─── Invitations ─────────────────────────────────────────

export const inviteMemberSchema = z.object({
  email: z.email(),
  role: z.enum(["admin", "member"]).default("member"),
});

// ─── Projects ────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
  startDate: z.iso.datetime().optional(),
  targetDate: z.iso.datetime().optional(),
  memberIds: z.array(z.string()).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(5000).nullable().optional(),
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
  startDate: z.iso.datetime().nullable().optional(),
  targetDate: z.iso.datetime().nullable().optional(),
});

// ─── Tasks ───────────────────────────────────────────────

export const createTaskSchema = z.object({
  projectId: z.uuid(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.string().optional(),
  dueDate: z.iso.datetime().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  parentTaskId: z.uuid().optional(),
});

export const updateTaskSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().max(10000).nullable().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.iso.datetime().nullable().optional(),
  completedAt: z.iso.datetime().nullable().optional(),
  estimatedMinutes: z.number().int().positive().nullable().optional(),
  position: z.number().int().optional(),
  isBlocked: z.boolean().optional(),
  blockedReason: z.string().nullable().optional(),
});

export const taskFiltersSchema = z.object({
  projectId: z.uuid().optional(),
  assigneeId: z.string().optional(),
  status: z.enum(["todo", "in_progress", "in_review", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  isBlocked: z
    .string()
    .transform((v) => v === "true")
    .optional(),
  search: z.string().optional(),
  sort: z.enum(["created_at", "due_date", "priority", "position"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  limit: z
    .string()
    .transform(Number)
    .pipe(z.number().int().min(1).max(500))
    .optional(),
  cursor: z.string().optional(),
});

// ─── Comments ────────────────────────────────────────────

export const createCommentSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ─── Messages ────────────────────────────────────────────

export const createMessageSchema = z.object({
  projectId: z.uuid(),
  title: z.string().max(500).optional(),
  content: z.string().min(1).max(20000),
});

export const updateMessageSchema = z.object({
  title: z.string().max(500).nullable().optional(),
  content: z.string().min(1).max(20000).optional(),
  isPinned: z.boolean().optional(),
});

// ─── PA Chat ────────────────────────────────────────────

export const paChatSchema = z.object({
  message: z.string().min(1).max(2000),
  voiceTranscriptId: z.uuid().optional(),
  sessionId: z.uuid().optional(),
});

// ─── PA Actions ─────────────────────────────────────────

// Constrained JSON value type for action payloads — prevents arbitrary objects
const jsonValue: z.ZodType<string | number | boolean | null> = z.union([
  z.string().max(10000),
  z.number(),
  z.boolean(),
  z.null(),
]);

export const actionDecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "edit"]),
  editedPayload: z.record(z.string().max(200), jsonValue).optional(),
  rejectionReason: z.string().max(500).optional(),
});

// ─── Reports ────────────────────────────────────────────

export const reportQuerySchema = z.object({
  question: z.string().min(1).max(500),
  projectId: z.uuid().optional(),
  format: z.enum(["narrative", "structured", "data_only"]).optional(),
});

// ─── PA Profile ─────────────────────────────────────────

export const updatePaProfileSchema = z.object({
  autonomyMode: z.enum(["autopilot", "copilot", "manual"]).optional(),
  verbosity: z.enum(["concise", "detailed", "bullet_points"]).optional(),
  formality: z.enum(["casual", "professional", "mixed"]).optional(),
  morningBriefingEnabled: z.boolean().optional(),
  morningBriefingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endOfDayDigestEnabled: z.boolean().optional(),
  endOfDayDigestTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  weeklyDigestDay: z.number().int().min(0).max(6).optional(),
  timezone: z.string().optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  actionOverrides: z.record(
    z.string(),
    z.enum(["auto_execute", "execute_notify", "draft_approve", "suggest_only"])
  ).optional(),
  emailBriefing: z.boolean().optional(),
  emailDigest: z.boolean().optional(),
  personalityTraits: z.string().max(2000).optional(),
});

// ─── Phase 6: Items / Pages / Chat / Notices ────────────

const itemTypeSchema = z.enum([
  "task",
  "project",
  "page",
  "note",
  "chat_channel",
  "announcement",
]);

const relationTypeSchema = z.enum([
  "references",
  "blocks",
  "derived_from",
  "parent_of",
  "related_to",
]);

export const createItemSchema = z.object({
  projectId: z.uuid().optional(),
  type: itemTypeSchema,
  title: z.string().min(1).max(500),
  status: z.string().max(100).optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const updateItemSchema = z.object({
  projectId: z.uuid().nullable().optional(),
  title: z.string().min(1).max(500).optional(),
  status: z.string().max(100).nullable().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
});

export const itemFiltersSchema = z.object({
  type: itemTypeSchema.optional(),
});

export const createItemRelationSchema = z.object({
  fromItemId: z.uuid(),
  toItemId: z.uuid(),
  relationType: relationTypeSchema,
});

export const upsertPageSchema = z.object({
  contentJson: z.record(z.string(), z.unknown()),
  plainText: z.string().default(""),
  icon: z.string().max(100).nullable().optional(),
  coverUrl: z.url().nullable().optional(),
  editorVersion: z.string().max(50).optional(),
  createRevision: z.boolean().default(true),
});

const pinboardThemeSchema = z.enum([
  "paper_classic",
  "blueprint",
  "studio",
  "minimal",
]);

const noticeStatusSchema = z.enum(["active", "scheduled", "expired", "archived"]);

const channelScopeSchema = z.enum(["team", "project", "workspace", "agent"]);
const channelMemberRoleSchema = z.enum(["owner", "moderator", "member"]);

export const createPinboardLayoutSchema = z.object({
  name: z.string().min(1).max(255),
  theme: pinboardThemeSchema.optional(),
  isDefault: z.boolean().optional(),
  layoutJson: z.record(z.string(), z.unknown()),
});

export const updatePinboardLayoutSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  theme: pinboardThemeSchema.optional(),
  isDefault: z.boolean().optional(),
  layoutJson: z.record(z.string(), z.unknown()).optional(),
});

export const createNoticeSchema = z.object({
  projectId: z.uuid().optional(),
  title: z.string().min(1).max(500),
  body: z.string().min(1).max(20000),
  status: noticeStatusSchema.optional(),
  isPinned: z.boolean().optional(),
  startsAt: z.iso.datetime().optional(),
  expiresAt: z.iso.datetime().optional(),
});

export const updateNoticeSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  body: z.string().min(1).max(20000).optional(),
  status: noticeStatusSchema.optional(),
  isPinned: z.boolean().optional(),
  startsAt: z.iso.datetime().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

export const createChatChannelSchema = z.object({
  scope: channelScopeSchema,
  projectId: z.uuid().optional(),
  name: z.string().min(1).max(255),
  topic: z.string().max(5000).optional(),
});

export const updateChatChannelSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  topic: z.string().max(5000).nullable().optional(),
  isArchived: z.boolean().optional(),
});

export const addChatChannelMemberSchema = z.object({
  userId: z.string().min(1).max(255),
  role: channelMemberRoleSchema.optional(),
});

export const createChatMessageSchema = z.object({
  content: z.string().min(1).max(20000),
  contentJson: z.record(z.string(), z.unknown()).optional(),
});

export const createThreadFromMessageSchema = z.object({
  channelId: z.uuid(),
});

export const createThreadMessageSchema = z.object({
  content: z.string().min(1).max(20000),
});

export const updateChatMessageSchema = z.object({
  content: z.string().min(1).max(20000),
  contentJson: z.record(z.string(), z.unknown()).optional(),
});

export const restorePageRevisionSchema = z.object({
  revisionId: z.uuid(),
});

// ─── Phase 7: Workspaces / Agents / Check-ins ───────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(1).max(255),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens"),
  description: z.string().max(5000).optional(),
  iconEmoji: z.string().max(50).optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  description: z.string().max(5000).nullable().optional(),
  iconEmoji: z.string().max(50).nullable().optional(),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .nullable()
    .optional(),
});

export const addWorkspaceMemberSchema = z.object({
  userId: z.string().min(1).max(255),
  role: z.enum(["owner", "admin", "member"]).optional(),
});

export const createAgentScheduleSchema = z.object({
  beeInstanceId: z.uuid(),
  scheduleType: z.enum(["daily_standup", "weekly_report", "checkin_sweep"]),
  cronExpression: z.string().min(1).max(100),
  timezone: z.string().max(100).optional(),
  config: z.record(z.string(), z.unknown()).optional(),
});

export const checkinResponseSchema = z.object({
  response: z.string().min(1).max(5000),
  status: z.enum(["on_track", "at_risk", "blocked"]).optional(),
});

export const updateCheckinPreferencesSchema = z.object({
  frequency: z.enum(["daily", "standard", "minimal", "off"]).optional(),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  maxCheckinsPerDay: z.number().int().min(0).max(20).optional(),
});
