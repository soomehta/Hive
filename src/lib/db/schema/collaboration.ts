import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  itemTypeEnum,
  relationTypeEnum,
  channelScopeEnum,
  channelMemberRoleEnum,
  noticeStatusEnum,
  pinboardThemeEnum,
  mentionTypeEnum,
  mentionSourceTypeEnum,
} from "./enums";
import { organizations } from "./organizations";
import { projects } from "./projects";
import { workspaces } from "./workspaces";

// ─── Phase 6: Items & Relations ───────────────────────────

export const items = pgTable(
  "items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    type: itemTypeEnum("type").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    ownerId: varchar("owner_id", { length: 255 }).notNull(),
    sourceId: varchar("source_id", { length: 255 }),
    status: varchar("status", { length: 100 }),
    attributes: jsonb("attributes").default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("items_org_type_idx").on(table.orgId, table.type),
    index("items_org_project_type_idx").on(table.orgId, table.projectId, table.type),
    uniqueIndex("items_org_source_idx").on(table.orgId, table.sourceId),
  ]
);

export const itemRelations = pgTable(
  "item_relations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    fromItemId: uuid("from_item_id")
      .references(() => items.id, { onDelete: "cascade" })
      .notNull(),
    toItemId: uuid("to_item_id")
      .references(() => items.id, { onDelete: "cascade" })
      .notNull(),
    relationType: relationTypeEnum("relation_type").notNull(),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("item_relations_org_from_idx").on(table.orgId, table.fromItemId),
    index("item_relations_org_to_idx").on(table.orgId, table.toItemId),
    uniqueIndex("item_relations_unique_idx").on(
      table.fromItemId,
      table.toItemId,
      table.relationType
    ),
  ]
);

// ─── Phase 6: Pages ───────────────────────────────────────

export const pages = pgTable(
  "pages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    itemId: uuid("item_id")
      .references(() => items.id, { onDelete: "cascade" })
      .notNull()
      .unique(),
    editorVersion: varchar("editor_version", { length: 50 }).notNull().default("v1"),
    contentJson: jsonb("content_json").notNull(),
    plainText: text("plain_text").notNull().default(""),
    icon: varchar("icon", { length: 100 }),
    coverUrl: text("cover_url"),
    lastEditedBy: varchar("last_edited_by", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("pages_org_idx").on(table.orgId)]
);

export const pageRevisions = pgTable(
  "page_revisions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    pageId: uuid("page_id")
      .references(() => pages.id, { onDelete: "cascade" })
      .notNull(),
    contentJson: jsonb("content_json").notNull(),
    plainText: text("plain_text").notNull().default(""),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("page_revisions_page_idx").on(table.pageId)]
);

// ─── Phase 6: Pinboard ────────────────────────────────────

export const pinboardLayoutsUser = pgTable(
  "pinboard_layouts_user",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    theme: pinboardThemeEnum("theme").notNull().default("paper_classic"),
    layoutJson: jsonb("layout_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("pinboard_layouts_user_unique_name_idx").on(
      table.orgId,
      table.userId,
      table.name
    ),
    index("pinboard_layouts_user_default_idx").on(table.orgId, table.userId, table.isDefault),
  ]
);

// ─── Phase 6: Notices ─────────────────────────────────────

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    authorId: varchar("author_id", { length: 255 }).notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    body: text("body").notNull(),
    status: noticeStatusEnum("status").notNull().default("active"),
    isPinned: boolean("is_pinned").notNull().default(false),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notices_org_status_pinned_idx").on(table.orgId, table.status, table.isPinned),
    index("notices_org_project_status_idx").on(table.orgId, table.projectId, table.status),
  ]
);

// ─── Phase 6: Chat ────────────────────────────────────────

export const chatChannels = pgTable(
  "chat_channels",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, {
      onDelete: "set null",
    }),
    scope: channelScopeEnum("scope").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    topic: text("topic"),
    createdBy: varchar("created_by", { length: 255 }).notNull(),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_channels_org_scope_idx").on(table.orgId, table.scope),
    index("chat_channels_project_idx").on(table.projectId),
  ]
);

export const chatChannelMembers = pgTable(
  "chat_channel_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    channelId: uuid("channel_id")
      .references(() => chatChannels.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    role: channelMemberRoleEnum("role").notNull().default("member"),
    lastReadAt: timestamp("last_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("chat_channel_members_unique_idx").on(table.channelId, table.userId),
    index("chat_channel_members_user_idx").on(table.orgId, table.userId),
  ]
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    channelId: uuid("channel_id")
      .references(() => chatChannels.id, { onDelete: "cascade" })
      .notNull(),
    authorId: varchar("author_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    contentJson: jsonb("content_json"),
    isPinned: boolean("is_pinned").default(false).notNull(),
    isAgentMessage: boolean("is_agent_message").default(false).notNull(),
    agentBeeInstanceId: uuid("agent_bee_instance_id"),
    agentMetadata: jsonb("agent_metadata"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("chat_messages_channel_created_idx").on(table.channelId, table.createdAt),
    index("chat_messages_org_author_idx").on(table.orgId, table.authorId),
  ]
);

export const chatThreads = pgTable(
  "chat_threads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    channelId: uuid("channel_id")
      .references(() => chatChannels.id, { onDelete: "cascade" })
      .notNull(),
    rootMessageId: uuid("root_message_id")
      .references(() => chatMessages.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("chat_threads_channel_idx").on(table.channelId)]
);

export const chatThreadMessages = pgTable(
  "chat_thread_messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    threadId: uuid("thread_id")
      .references(() => chatThreads.id, { onDelete: "cascade" })
      .notNull(),
    authorId: varchar("author_id", { length: 255 }).notNull(),
    content: text("content").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [index("chat_thread_messages_thread_created_idx").on(table.threadId, table.createdAt)]
);

// ─── Phase 7: Mentions ──────────────────────────────────

export const mentions = pgTable(
  "mentions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    sourceType: mentionSourceTypeEnum("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    mentionType: mentionTypeEnum("mention_type").notNull(),
    targetId: varchar("target_id", { length: 255 }).notNull(),
    displayText: varchar("display_text", { length: 500 }).notNull(),
    startOffset: integer("start_offset"),
    endOffset: integer("end_offset"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("mentions_org_source_idx").on(table.orgId, table.sourceType, table.sourceId),
    index("mentions_target_idx").on(table.targetId),
  ]
);

// ─── Phase 8: Message Reactions ──────────────────────────

export const messageReactions = pgTable(
  "message_reactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orgId: uuid("org_id")
      .references(() => organizations.id, { onDelete: "cascade" })
      .notNull(),
    messageId: uuid("message_id")
      .references(() => chatMessages.id, { onDelete: "cascade" })
      .notNull(),
    userId: varchar("user_id", { length: 255 }).notNull(),
    emoji: varchar("emoji", { length: 32 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("message_reactions_unique").on(table.messageId, table.userId, table.emoji),
    index("message_reactions_message_idx").on(table.messageId),
  ]
);
