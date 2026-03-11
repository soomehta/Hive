// ─── Barrel re-export — zero breaking change ─────────────
// All imports from "@/lib/db/schema" continue to work unchanged.

export * from "./enums";
export * from "./organizations";
export * from "./projects";
export * from "./tasks";
export * from "./messages";
export * from "./activity";
export * from "./notifications";
export * from "./files";
export * from "./pa";
export * from "./integrations";
export * from "./embeddings";
export * from "./bees";
export * from "./dashboard";
export * from "./collaboration";
export * from "./workspaces";
export * from "./guests";

// ─── Cross-file Relations ────────────────────────────────
// Drizzle relations that span multiple table files are defined here
// after all tables are available, avoiding circular import issues.

import { relations } from "drizzle-orm";

import { organizations, organizationMembers, invitations } from "./organizations";
import { projects, projectMembers } from "./projects";
import { tasks, taskComments } from "./tasks";
import { messages } from "./messages";
import { activityLog } from "./activity";
import { notifications } from "./notifications";
import { files } from "./files";
import {
  paProfiles,
  paChatSessions,
  paConversations,
  paActions,
  paCorrections,
  scheduledReports,
} from "./pa";
import { integrations, calendarSubscriptions } from "./integrations";
import { embeddings } from "./embeddings";
import {
  beeTemplates,
  beeInstances,
  swarmSessions,
  beeRuns,
  hiveContext,
  beeHandovers,
  beeSignals,
  agentSchedules,
  agentReports,
  agentCheckins,
  checkinPreferences,
} from "./bees";
import { dashboardLayouts } from "./dashboard";
import { workspaces, workspaceMembers } from "./workspaces";
import {
  items,
  itemRelations,
  pages,
  pageRevisions,
  pinboardLayoutsUser,
  notices,
  chatChannels,
  chatChannelMembers,
  chatMessages,
  chatThreads,
  chatThreadMessages,
  mentions,
  messageReactions,
} from "./collaboration";

// ─── Organization Relations ──────────────────────────────

export const organizationsRelations = relations(organizations, ({ many }) => ({
  members: many(organizationMembers),
  invitations: many(invitations),
  projects: many(projects),
}));

export const organizationMembersRelations = relations(
  organizationMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [organizationMembers.orgId],
      references: [organizations.id],
    }),
  })
);

export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.orgId],
    references: [organizations.id],
  }),
}));

// ─── Project Relations ───────────────────────────────────

export const projectsRelations = relations(projects, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [projects.orgId],
    references: [organizations.id],
  }),
  members: many(projectMembers),
  tasks: many(tasks),
  messages: many(messages),
}));

export const projectMembersRelations = relations(
  projectMembers,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectMembers.projectId],
      references: [projects.id],
    }),
  })
);

// ─── Task Relations ──────────────────────────────────────

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

export const taskCommentsRelations = relations(taskComments, ({ one }) => ({
  task: one(tasks, {
    fields: [taskComments.taskId],
    references: [tasks.id],
  }),
}));

// ─── Message Relations ───────────────────────────────────

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

// ─── Activity Log Relations ──────────────────────────────

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

// ─── Notification Relations ──────────────────────────────

export const notificationsRelations = relations(notifications, ({ one }) => ({
  organization: one(organizations, {
    fields: [notifications.orgId],
    references: [organizations.id],
  }),
}));

// ─── File Relations ──────────────────────────────────────

export const filesRelations = relations(files, ({ one }) => ({
  organization: one(organizations, {
    fields: [files.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [files.projectId],
    references: [projects.id],
  }),
  task: one(tasks, {
    fields: [files.taskId],
    references: [tasks.id],
  }),
}));

// ─── PA Relations ────────────────────────────────────────

export const paProfilesRelations = relations(paProfiles, ({ one }) => ({
  organization: one(organizations, {
    fields: [paProfiles.orgId],
    references: [organizations.id],
  }),
}));

export const paChatSessionsRelations = relations(
  paChatSessions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [paChatSessions.orgId],
      references: [organizations.id],
    }),
    messages: many(paConversations),
  })
);

export const paConversationsRelations = relations(
  paConversations,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [paConversations.orgId],
      references: [organizations.id],
    }),
    session: one(paChatSessions, {
      fields: [paConversations.sessionId],
      references: [paChatSessions.id],
    }),
  })
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

export const scheduledReportsRelations = relations(
  scheduledReports,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [scheduledReports.orgId],
      references: [organizations.id],
    }),
  })
);

// ─── Integration Relations ───────────────────────────────

export const integrationsRelations = relations(integrations, ({ one }) => ({
  organization: one(organizations, {
    fields: [integrations.orgId],
    references: [organizations.id],
  }),
}));

export const calendarSubscriptionsRelations = relations(
  calendarSubscriptions,
  ({ one }) => ({
    integration: one(integrations, {
      fields: [calendarSubscriptions.integrationId],
      references: [integrations.id],
    }),
    organization: one(organizations, {
      fields: [calendarSubscriptions.orgId],
      references: [organizations.id],
    }),
  })
);

// ─── Embedding Relations ─────────────────────────────────

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  organization: one(organizations, {
    fields: [embeddings.orgId],
    references: [organizations.id],
  }),
}));

// ─── Bee Relations ───────────────────────────────────────

export const beeTemplatesRelations = relations(
  beeTemplates,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [beeTemplates.orgId],
      references: [organizations.id],
    }),
    instances: many(beeInstances),
  })
);

export const beeInstancesRelations = relations(
  beeInstances,
  ({ one }) => ({
    template: one(beeTemplates, {
      fields: [beeInstances.templateId],
      references: [beeTemplates.id],
    }),
    organization: one(organizations, {
      fields: [beeInstances.orgId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [beeInstances.projectId],
      references: [projects.id],
    }),
  })
);

export const swarmSessionsRelations = relations(
  swarmSessions,
  ({ one, many }) => ({
    organization: one(organizations, {
      fields: [swarmSessions.orgId],
      references: [organizations.id],
    }),
    beeRuns: many(beeRuns),
    hiveContextEntries: many(hiveContext),
    handovers: many(beeHandovers),
    signals: many(beeSignals),
  })
);

export const beeRunsRelations = relations(beeRuns, ({ one }) => ({
  swarmSession: one(swarmSessions, {
    fields: [beeRuns.swarmSessionId],
    references: [swarmSessions.id],
  }),
  beeInstance: one(beeInstances, {
    fields: [beeRuns.beeInstanceId],
    references: [beeInstances.id],
  }),
}));

export const hiveContextRelations = relations(hiveContext, ({ one }) => ({
  swarmSession: one(swarmSessions, {
    fields: [hiveContext.swarmSessionId],
    references: [swarmSessions.id],
  }),
  beeRun: one(beeRuns, {
    fields: [hiveContext.beeRunId],
    references: [beeRuns.id],
  }),
}));

export const beeHandoversRelations = relations(
  beeHandovers,
  ({ one }) => ({
    swarmSession: one(swarmSessions, {
      fields: [beeHandovers.swarmSessionId],
      references: [swarmSessions.id],
    }),
    fromBeeRun: one(beeRuns, {
      fields: [beeHandovers.fromBeeRunId],
      references: [beeRuns.id],
    }),
    toBeeRun: one(beeRuns, {
      fields: [beeHandovers.toBeeRunId],
      references: [beeRuns.id],
    }),
  })
);

export const beeSignalsRelations = relations(beeSignals, ({ one }) => ({
  swarmSession: one(swarmSessions, {
    fields: [beeSignals.swarmSessionId],
    references: [swarmSessions.id],
  }),
  fromBeeRun: one(beeRuns, {
    fields: [beeSignals.fromBeeRunId],
    references: [beeRuns.id],
  }),
  targetBeeRun: one(beeRuns, {
    fields: [beeSignals.targetBeeRunId],
    references: [beeRuns.id],
  }),
}));

// ─── Dashboard Relations ─────────────────────────────────

export const dashboardLayoutsRelations = relations(
  dashboardLayouts,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [dashboardLayouts.orgId],
      references: [organizations.id],
    }),
    project: one(projects, {
      fields: [dashboardLayouts.projectId],
      references: [projects.id],
    }),
  })
);

// ─── Collaboration Relations ──────────────────────────────

export const itemsRelations = relations(items, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [items.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [items.projectId],
    references: [projects.id],
  }),
  page: one(pages, {
    fields: [items.id],
    references: [pages.itemId],
  }),
  outgoingRelations: many(itemRelations, { relationName: "fromItem" }),
  incomingRelations: many(itemRelations, { relationName: "toItem" }),
}));

export const itemRelationsRelations = relations(itemRelations, ({ one }) => ({
  organization: one(organizations, {
    fields: [itemRelations.orgId],
    references: [organizations.id],
  }),
  fromItem: one(items, {
    fields: [itemRelations.fromItemId],
    references: [items.id],
    relationName: "fromItem",
  }),
  toItem: one(items, {
    fields: [itemRelations.toItemId],
    references: [items.id],
    relationName: "toItem",
  }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [pages.orgId],
    references: [organizations.id],
  }),
  item: one(items, {
    fields: [pages.itemId],
    references: [items.id],
  }),
  revisions: many(pageRevisions),
}));

export const pageRevisionsRelations = relations(pageRevisions, ({ one }) => ({
  organization: one(organizations, {
    fields: [pageRevisions.orgId],
    references: [organizations.id],
  }),
  page: one(pages, {
    fields: [pageRevisions.pageId],
    references: [pages.id],
  }),
}));

export const pinboardLayoutsUserRelations = relations(
  pinboardLayoutsUser,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [pinboardLayoutsUser.orgId],
      references: [organizations.id],
    }),
  })
);

export const noticesRelations = relations(notices, ({ one }) => ({
  organization: one(organizations, {
    fields: [notices.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [notices.projectId],
    references: [projects.id],
  }),
}));

export const chatChannelsRelations = relations(chatChannels, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chatChannels.orgId],
    references: [organizations.id],
  }),
  project: one(projects, {
    fields: [chatChannels.projectId],
    references: [projects.id],
  }),
  members: many(chatChannelMembers),
  messages: many(chatMessages),
  threads: many(chatThreads),
}));

export const chatChannelMembersRelations = relations(
  chatChannelMembers,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [chatChannelMembers.orgId],
      references: [organizations.id],
    }),
    channel: one(chatChannels, {
      fields: [chatChannelMembers.channelId],
      references: [chatChannels.id],
    }),
  })
);

export const chatMessagesRelations = relations(chatMessages, ({ one }) => ({
  organization: one(organizations, {
    fields: [chatMessages.orgId],
    references: [organizations.id],
  }),
  channel: one(chatChannels, {
    fields: [chatMessages.channelId],
    references: [chatChannels.id],
  }),
}));

export const chatThreadsRelations = relations(chatThreads, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [chatThreads.orgId],
    references: [organizations.id],
  }),
  channel: one(chatChannels, {
    fields: [chatThreads.channelId],
    references: [chatChannels.id],
  }),
  rootMessage: one(chatMessages, {
    fields: [chatThreads.rootMessageId],
    references: [chatMessages.id],
  }),
  messages: many(chatThreadMessages),
}));

export const chatThreadMessagesRelations = relations(
  chatThreadMessages,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [chatThreadMessages.orgId],
      references: [organizations.id],
    }),
    thread: one(chatThreads, {
      fields: [chatThreadMessages.threadId],
      references: [chatThreads.id],
    }),
  })
);

// ─── Workspace Relations ─────────────────────────────────

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [workspaces.orgId],
    references: [organizations.id],
  }),
  members: many(workspaceMembers),
}));

export const workspaceMembersRelations = relations(
  workspaceMembers,
  ({ one }) => ({
    workspace: one(workspaces, {
      fields: [workspaceMembers.workspaceId],
      references: [workspaces.id],
    }),
  })
);

// ─── Phase 7 Bee Relations ───────────────────────────────

export const agentSchedulesRelations = relations(
  agentSchedules,
  ({ one }) => ({
    beeInstance: one(beeInstances, {
      fields: [agentSchedules.beeInstanceId],
      references: [beeInstances.id],
    }),
    organization: one(organizations, {
      fields: [agentSchedules.orgId],
      references: [organizations.id],
    }),
    workspace: one(workspaces, {
      fields: [agentSchedules.workspaceId],
      references: [workspaces.id],
    }),
  })
);

export const agentReportsRelations = relations(agentReports, ({ one }) => ({
  organization: one(organizations, {
    fields: [agentReports.orgId],
    references: [organizations.id],
  }),
  workspace: one(workspaces, {
    fields: [agentReports.workspaceId],
    references: [workspaces.id],
  }),
  beeInstance: one(beeInstances, {
    fields: [agentReports.beeInstanceId],
    references: [beeInstances.id],
  }),
}));

export const agentCheckinsRelations = relations(agentCheckins, ({ one }) => ({
  organization: one(organizations, {
    fields: [agentCheckins.orgId],
    references: [organizations.id],
  }),
  workspace: one(workspaces, {
    fields: [agentCheckins.workspaceId],
    references: [workspaces.id],
  }),
  beeInstance: one(beeInstances, {
    fields: [agentCheckins.beeInstanceId],
    references: [beeInstances.id],
  }),
}));

export const checkinPreferencesRelations = relations(
  checkinPreferences,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [checkinPreferences.orgId],
      references: [organizations.id],
    }),
  })
);

export const mentionsRelations = relations(mentions, ({ one }) => ({
  organization: one(organizations, {
    fields: [mentions.orgId],
    references: [organizations.id],
  }),
}));

export const messageReactionsRelations = relations(messageReactions, ({ one }) => ({
  organization: one(organizations, {
    fields: [messageReactions.orgId],
    references: [organizations.id],
  }),
  message: one(chatMessages, {
    fields: [messageReactions.messageId],
    references: [chatMessages.id],
  }),
}));
