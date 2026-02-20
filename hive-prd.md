# PRODUCT REQUIREMENTS DOCUMENT
# Hive — AI-Native Project Management Platform with Personal Assistants
## For Implementation by Claude Code

---

# TABLE OF CONTENTS

1. Product Overview & Technical Stack
2. Project Structure & Architecture
3. Database Schema (Complete)
4. Authentication & Authorization
5. Module 1: Organizations & Teams
6. Module 2: Projects
7. Module 3: Tasks
8. Module 4: Messages & Activity Feed
9. Module 5: Voice Input & Transcription
10. Module 6: AI Personal Assistant (PA) Engine
11. Module 7: Action System (Graduated Autonomy)
12. Module 8: Reporting Engine
13. Module 9: Integrations (Google Calendar, Gmail, Slack)
14. Module 10: Proactive PA Behaviors (Cron/Scheduled)
15. Module 11: Notifications
16. Module 12: User PA Profile & Learning
17. Frontend: Pages, Components, Layouts
18. API Reference (Complete Endpoint List)
19. Environment Variables & Configuration
20. Testing Strategy
21. Deployment Configuration
22. Build & Run Commands

---

# 1. PRODUCT OVERVIEW & TECHNICAL STACK

## Product Vision

Hive is a Basecamp-simple project management tool that is AI-native from the ground up. Every user gets a personal AI assistant (PA) that knows their role, projects, work patterns, and preferences. The PA can manage tasks, check calendars, draft emails, generate reports, and proactively surface risks — all via natural language (voice or text).

## Core Philosophy

- SIMPLICITY FIRST: 5 core modules max. No feature bloat. Opinionated defaults.
- AI-NATIVE: The PA is the primary interface. UI is secondary.
- ASYNC-FIRST: No real-time presence indicators, no typing notifications. Calm communication.
- VOICE-FIRST: Every action can be performed via voice transcription.
- REPORTS AS CONVERSATIONS: No dashboards. Ask questions, get narrative answers.

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 + shadcn/ui components
- **State Management:** Zustand for client state, React Query (TanStack Query) for server state
- **Voice Recording:** Browser MediaRecorder API
- **Real-time:** Server-Sent Events (SSE) for live updates
- **Forms:** React Hook Form + Zod validation

### Backend
- **Runtime:** Node.js 20+ with TypeScript
- **Framework:** Next.js API Routes (Route Handlers) — monorepo, no separate backend
- **ORM:** Drizzle ORM (type-safe, SQL-first)
- **Database:** PostgreSQL 16 with pgvector extension
- **Cache / Queue:** Redis (via Upstash for serverless, or self-hosted)
- **Background Jobs:** BullMQ (Redis-backed job queue)
- **Authentication:** Clerk (hosted auth, OAuth, session management)
- **File Storage:** Cloudflare R2 (S3-compatible, zero egress)
- **Email Sending:** Resend (transactional email API)

### AI & Voice
- **Transcription (STT):** Deepgram Nova-3 (primary) with Gladia Solaria fallback
- **LLM — Intent Classification:** OpenAI GPT-4o-mini (fast, cheap)
- **LLM — Complex Reasoning:** Anthropic Claude Sonnet (reports, planning, drafting)
- **Embeddings:** OpenAI text-embedding-3-small (for RAG)
- **Vector Store:** pgvector (in PostgreSQL, no separate service)

### Integrations
- **Google Calendar + Gmail:** Google OAuth2 + Google APIs
- **Microsoft Outlook + Calendar:** Microsoft OAuth2 + Graph API
- **Slack:** Slack OAuth2 + Web API

---

# 2. PROJECT STRUCTURE & ARCHITECTURE

```
hive/
├── .env.local                          # Environment variables
├── .env.example                        # Template
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── drizzle.config.ts
├── next.config.ts
│
├── drizzle/
│   └── migrations/                     # SQL migration files
│
├── src/
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # Root layout (Clerk provider, theme)
│   │   ├── page.tsx                    # Landing / redirect to dashboard
│   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   ├── sign-up/[[...sign-up]]/page.tsx
│   │   │
│   │   ├── onboarding/
│   │   │   └── page.tsx                # Org creation + profile setup
│   │   │
│   │   ├── dashboard/
│   │   │   ├── layout.tsx              # Authenticated shell (sidebar + PA chat)
│   │   │   ├── page.tsx                # Home: morning briefing + my tasks
│   │   │   │
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx            # Project list
│   │   │   │   ├── new/page.tsx        # Create project
│   │   │   │   └── [projectId]/
│   │   │   │       ├── page.tsx        # Project overview (tasks + messages + activity)
│   │   │   │       ├── tasks/page.tsx  # Task list/board view
│   │   │   │       └── messages/page.tsx # Project message board
│   │   │   │
│   │   │   ├── my-tasks/
│   │   │   │   └── page.tsx            # All tasks assigned to me across projects
│   │   │   │
│   │   │   ├── team/
│   │   │   │   └── page.tsx            # Team members, workload overview
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   └── page.tsx            # Ask-a-question reporting interface
│   │   │   │
│   │   │   ├── integrations/
│   │   │   │   └── page.tsx            # Connect Google, Slack, etc.
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.tsx            # Org settings
│   │   │       ├── profile/page.tsx    # User profile + PA preferences
│   │   │       └── pa/page.tsx         # PA autonomy settings
│   │   │
│   │   └── api/
│   │       ├── webhooks/
│   │       │   └── clerk/route.ts      # Clerk webhook (user sync)
│   │       │
│   │       ├── organizations/
│   │       │   ├── route.ts            # GET (mine), POST (create)
│   │       │   └── [orgId]/
│   │       │       ├── route.ts        # GET, PATCH, DELETE
│   │       │       └── members/route.ts # GET, POST (invite), DELETE
│   │       │
│   │       ├── projects/
│   │       │   ├── route.ts            # GET (list), POST (create)
│   │       │   └── [projectId]/
│   │       │       ├── route.ts        # GET, PATCH, DELETE
│   │       │       └── members/route.ts
│   │       │
│   │       ├── tasks/
│   │       │   ├── route.ts            # GET (list + filter), POST (create)
│   │       │   └── [taskId]/
│   │       │       ├── route.ts        # GET, PATCH, DELETE
│   │       │       └── comments/route.ts # GET, POST
│   │       │
│   │       ├── messages/
│   │       │   ├── route.ts            # GET (list), POST (create)
│   │       │   └── [messageId]/
│   │       │       └── route.ts        # GET, PATCH, DELETE
│   │       │
│   │       ├── activity/
│   │       │   └── route.ts            # GET (activity feed, filterable)
│   │       │
│   │       ├── voice/
│   │       │   ├── transcribe/route.ts # POST (upload audio → get transcript)
│   │       │   └── process/route.ts    # POST (transcript → PA intent → action)
│   │       │
│   │       ├── pa/
│   │       │   ├── chat/route.ts       # POST (text message to PA → response)
│   │       │   ├── actions/
│   │       │   │   ├── route.ts        # GET (pending approvals), POST (execute)
│   │       │   │   └── [actionId]/
│   │       │   │       └── route.ts    # PATCH (approve/reject/edit)
│   │       │   ├── briefing/route.ts   # GET (generate morning briefing)
│   │       │   └── report/route.ts     # POST (natural language → report)
│   │       │
│   │       ├── integrations/
│   │       │   ├── google/
│   │       │   │   ├── auth/route.ts   # GET (initiate OAuth)
│   │       │   │   ├── callback/route.ts # GET (OAuth callback)
│   │       │   │   ├── calendar/route.ts # GET (events), POST (create event)
│   │       │   │   └── mail/route.ts   # GET (unread), POST (send email)
│   │       │   ├── microsoft/
│   │       │   │   ├── auth/route.ts
│   │       │   │   ├── callback/route.ts
│   │       │   │   ├── calendar/route.ts
│   │       │   │   └── mail/route.ts
│   │       │   └── slack/
│   │       │       ├── auth/route.ts
│   │       │       ├── callback/route.ts
│   │       │       └── send/route.ts   # POST (send message)
│   │       │
│   │       ├── notifications/
│   │       │   ├── route.ts            # GET (list), PATCH (mark read)
│   │       │   └── sse/route.ts        # GET (SSE stream)
│   │       │
│   │       └── cron/
│   │           ├── morning-briefing/route.ts  # Triggered by cron
│   │           ├── weekly-digest/route.ts
│   │           ├── stale-tasks/route.ts
│   │           └── overdue-nudge/route.ts
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                # Drizzle client initialization
│   │   │   ├── schema.ts              # Complete database schema
│   │   │   └── queries/               # Reusable query functions
│   │   │       ├── organizations.ts
│   │   │       ├── projects.ts
│   │   │       ├── tasks.ts
│   │   │       ├── messages.ts
│   │   │       ├── activity.ts
│   │   │       ├── pa-profiles.ts
│   │   │       ├── pa-actions.ts
│   │   │       ├── integrations.ts
│   │   │       └── notifications.ts
│   │   │
│   │   ├── ai/
│   │   │   ├── intent-classifier.ts    # GPT-4o-mini: transcript → intent + entities
│   │   │   ├── action-planner.ts       # Claude: intent → action plan with tier
│   │   │   ├── report-generator.ts     # Claude: data → narrative report
│   │   │   ├── briefing-generator.ts   # Claude: user context → morning briefing
│   │   │   ├── email-drafter.ts        # Claude: intent → email draft
│   │   │   ├── message-drafter.ts      # Claude: intent → team message draft
│   │   │   ├── embeddings.ts           # OpenAI: generate embeddings
│   │   │   ├── rag.ts                  # RAG: query pgvector for context
│   │   │   └── prompts/               # System prompt templates
│   │   │       ├── intent-classification.ts
│   │   │       ├── action-planning.ts
│   │   │       ├── report-generation.ts
│   │   │       ├── briefing.ts
│   │   │       └── drafting.ts
│   │   │
│   │   ├── voice/
│   │   │   ├── deepgram.ts             # Deepgram Nova-3 client
│   │   │   └── gladia.ts              # Gladia Solaria client (fallback)
│   │   │
│   │   ├── integrations/
│   │   │   ├── google-calendar.ts      # Google Calendar API wrapper
│   │   │   ├── google-mail.ts          # Gmail API wrapper
│   │   │   ├── microsoft-calendar.ts   # Microsoft Graph Calendar
│   │   │   ├── microsoft-mail.ts       # Microsoft Graph Mail
│   │   │   ├── slack.ts               # Slack Web API wrapper
│   │   │   └── oauth.ts              # Shared OAuth2 utilities
│   │   │
│   │   ├── actions/
│   │   │   ├── executor.ts             # Action execution engine
│   │   │   ├── registry.ts             # Action type registry with tiers
│   │   │   └── handlers/              # Individual action handlers
│   │   │       ├── create-task.ts
│   │   │       ├── update-task.ts
│   │   │       ├── complete-task.ts
│   │   │       ├── create-comment.ts
│   │   │       ├── post-message.ts
│   │   │       ├── flag-blocker.ts
│   │   │       ├── calendar-block.ts
│   │   │       ├── calendar-event.ts
│   │   │       ├── send-email.ts
│   │   │       ├── send-slack.ts
│   │   │       └── generate-report.ts
│   │   │
│   │   ├── queue/
│   │   │   ├── index.ts                # BullMQ queue setup
│   │   │   ├── workers/
│   │   │   │   ├── transcription.worker.ts
│   │   │   │   ├── ai-processing.worker.ts
│   │   │   │   ├── action-execution.worker.ts
│   │   │   │   ├── embedding.worker.ts
│   │   │   │   ├── notification.worker.ts
│   │   │   │   ├── morning-briefing.worker.ts
│   │   │   │   ├── weekly-digest.worker.ts
│   │   │   │   └── profile-learning.worker.ts
│   │   │   └── jobs.ts                 # Job type definitions
│   │   │
│   │   ├── notifications/
│   │   │   ├── index.ts                # Notification dispatcher
│   │   │   ├── in-app.ts              # In-app notification creation
│   │   │   ├── email.ts              # Email notification via Resend
│   │   │   └── sse.ts                # SSE connection manager
│   │   │
│   │   ├── auth/
│   │   │   ├── middleware.ts           # Auth middleware for API routes
│   │   │   └── permissions.ts          # RBAC permission checks
│   │   │
│   │   └── utils/
│   │       ├── errors.ts               # Custom error classes
│   │       ├── validation.ts           # Shared Zod schemas
│   │       ├── dates.ts                # Date/timezone utilities
│   │       └── constants.ts            # App-wide constants
│   │
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components (auto-generated)
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── command.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── tabs.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── sidebar.tsx             # Main navigation sidebar
│   │   │   ├── header.tsx              # Top bar with org switcher + user menu
│   │   │   ├── pa-panel.tsx            # Slide-out PA chat panel (right side)
│   │   │   └── mobile-nav.tsx          # Mobile bottom navigation
│   │   │
│   │   ├── pa/
│   │   │   ├── pa-chat.tsx             # Chat interface with PA
│   │   │   ├── pa-message.tsx          # Individual message bubble
│   │   │   ├── pa-input.tsx            # Text input + mic button
│   │   │   ├── pa-voice-recorder.tsx   # Voice recording UI with waveform
│   │   │   ├── pa-action-card.tsx      # Approval card (send/edit/cancel)
│   │   │   ├── pa-report-view.tsx      # Rendered report output
│   │   │   └── pa-briefing-card.tsx    # Morning briefing card
│   │   │
│   │   ├── projects/
│   │   │   ├── project-card.tsx        # Project card for list view
│   │   │   ├── project-header.tsx      # Project title + status + members
│   │   │   ├── project-form.tsx        # Create/edit project form
│   │   │   └── project-members.tsx     # Member list + invite
│   │   │
│   │   ├── tasks/
│   │   │   ├── task-card.tsx           # Task card (for list + board)
│   │   │   ├── task-list.tsx           # List view of tasks
│   │   │   ├── task-board.tsx          # Kanban board view
│   │   │   ├── task-detail.tsx         # Task detail sheet (slide-out)
│   │   │   ├── task-form.tsx           # Create/edit task form
│   │   │   ├── task-comments.tsx       # Comments thread on a task
│   │   │   └── task-filters.tsx        # Filter bar (status, assignee, priority, due date)
│   │   │
│   │   ├── messages/
│   │   │   ├── message-thread.tsx      # Message list
│   │   │   ├── message-card.tsx        # Individual message
│   │   │   └── message-composer.tsx    # New message form
│   │   │
│   │   ├── team/
│   │   │   ├── member-card.tsx         # Team member with workload indicator
│   │   │   ├── workload-bar.tsx        # Visual workload bar
│   │   │   └── invite-form.tsx         # Invite new member
│   │   │
│   │   ├── reports/
│   │   │   ├── report-chat.tsx         # Conversational report interface
│   │   │   └── report-export.tsx       # Export options (PDF, markdown)
│   │   │
│   │   ├── integrations/
│   │   │   ├── integration-card.tsx    # Connection card per service
│   │   │   └── oauth-button.tsx        # "Connect with Google" button
│   │   │
│   │   ├── activity/
│   │   │   └── activity-feed.tsx       # Activity log with entries
│   │   │
│   │   └── shared/
│   │       ├── empty-state.tsx         # Empty state illustrations
│   │       ├── loading.tsx             # Loading states
│   │       ├── error-boundary.tsx      # Error boundary
│   │       ├── user-avatar.tsx         # User avatar with presence
│   │       ├── date-display.tsx        # Relative date display
│   │       ├── priority-badge.tsx      # Priority indicator
│   │       └── status-badge.tsx        # Status indicator
│   │
│   ├── hooks/
│   │   ├── use-pa.ts                   # PA chat state + voice recording
│   │   ├── use-voice-recorder.ts       # MediaRecorder wrapper
│   │   ├── use-notifications.ts        # SSE notification listener
│   │   ├── use-org.ts                  # Current organization context
│   │   └── use-realtime.ts             # SSE connection for live updates
│   │
│   └── types/
│       ├── index.ts                    # Shared TypeScript types
│       ├── api.ts                      # API request/response types
│       ├── pa.ts                       # PA-specific types
│       └── integrations.ts             # Integration types
│
├── scripts/
│   ├── seed.ts                         # Database seed script
│   ├── migrate.ts                      # Migration runner
│   └── worker.ts                       # BullMQ worker process entry point
│
└── public/
    ├── logo.svg
    └── icons/
```

---

# 3. DATABASE SCHEMA (COMPLETE)

All tables use UUIDs as primary keys. All timestamps are stored in UTC. The schema uses Drizzle ORM syntax.

```typescript
// src/lib/db/schema.ts

import {
  pgTable, uuid, text, timestamp, boolean, integer, jsonb,
  pgEnum, varchar, real, index, uniqueIndex, vector
} from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS
// ============================================================

export const orgRoleEnum = pgEnum('org_role', ['owner', 'admin', 'member']);
export const projectStatusEnum = pgEnum('project_status', ['active', 'paused', 'completed', 'archived']);
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'in_review', 'done', 'cancelled']);
export const taskPriorityEnum = pgEnum('task_priority', ['low', 'medium', 'high', 'urgent']);
export const actionTierEnum = pgEnum('action_tier', ['auto_execute', 'execute_notify', 'draft_approve', 'suggest_only']);
export const actionStatusEnum = pgEnum('action_status', ['pending', 'approved', 'rejected', 'executed', 'failed', 'expired']);
export const actionTypeEnum = pgEnum('action_type', [
  'create_task', 'update_task', 'complete_task', 'delete_task',
  'create_comment', 'post_message', 'flag_blocker',
  'calendar_block', 'calendar_event', 'calendar_reschedule',
  'send_email', 'send_slack',
  'generate_report', 'generate_briefing',
  'check_tasks', 'check_calendar', 'check_email', 'check_project_status',
  'check_workload'
]);
export const notificationTypeEnum = pgEnum('notification_type', [
  'task_assigned', 'task_completed', 'task_overdue', 'task_commented',
  'message_posted', 'blocker_flagged', 'pa_action_pending',
  'pa_briefing', 'pa_nudge', 'pa_report_ready',
  'member_invited', 'project_created'
]);
export const integrationProviderEnum = pgEnum('integration_provider', ['google', 'microsoft', 'slack']);
export const autonomyModeEnum = pgEnum('autonomy_mode', ['autopilot', 'copilot', 'manual']);
export const verbosityEnum = pgEnum('verbosity', ['concise', 'detailed', 'bullet_points']);
export const formalityEnum = pgEnum('formality', ['casual', 'professional', 'mixed']);
export const activityTypeEnum = pgEnum('activity_type', [
  'task_created', 'task_updated', 'task_completed', 'task_deleted',
  'task_assigned', 'task_commented', 'blocker_flagged', 'blocker_resolved',
  'message_posted', 'project_created', 'project_updated',
  'member_joined', 'member_left',
  'pa_action_executed', 'pa_report_generated'
]);

// ============================================================
// ORGANIZATIONS
// ============================================================

export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: text('logo_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const organizationMembers = pgTable('organization_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  role: orgRoleEnum('role').notNull().default('member'),
  jobTitle: varchar('job_title', { length: 255 }),
  department: varchar('department', { length: 255 }),
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgUserIdx: uniqueIndex('org_user_idx').on(table.orgId, table.userId),
  userIdx: index('org_members_user_idx').on(table.userId),
}));

export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull(),
  role: orgRoleEnum('role').notNull().default('member'),
  invitedBy: varchar('invited_by', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// PROJECTS
// ============================================================

export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: projectStatusEnum('status').notNull().default('active'),
  color: varchar('color', { length: 7 }), // hex color like #3B82F6
  startDate: timestamp('start_date', { withTimezone: true }),
  targetDate: timestamp('target_date', { withTimezone: true }),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('projects_org_idx').on(table.orgId),
}));

export const projectMembers = pgTable('project_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('member'), // 'lead', 'member'
  joinedAt: timestamp('joined_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectUserIdx: uniqueIndex('project_user_idx').on(table.projectId, table.userId),
}));

// ============================================================
// TASKS
// ============================================================

export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: taskStatusEnum('status').notNull().default('todo'),
  priority: taskPriorityEnum('priority').notNull().default('medium'),
  assigneeId: varchar('assignee_id', { length: 255 }), // Clerk user ID
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  dueDate: timestamp('due_date', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  estimatedMinutes: integer('estimated_minutes'),
  position: integer('position').notNull().default(0), // for ordering within status column
  isBlocked: boolean('is_blocked').notNull().default(false),
  blockedReason: text('blocked_reason'),
  parentTaskId: uuid('parent_task_id').references(() => tasks.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('tasks_project_idx').on(table.projectId),
  assigneeIdx: index('tasks_assignee_idx').on(table.assigneeId),
  orgIdx: index('tasks_org_idx').on(table.orgId),
  statusIdx: index('tasks_status_idx').on(table.status),
  dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
}));

export const taskComments = pgTable('task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isFromPa: boolean('is_from_pa').notNull().default(false), // comment posted by PA on behalf of user
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  taskIdx: index('comments_task_idx').on(table.taskId),
}));

// ============================================================
// MESSAGES (Project message board — like Basecamp)
// ============================================================

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }),
  content: text('content').notNull(),
  isFromPa: boolean('is_from_pa').notNull().default(false),
  isPinned: boolean('is_pinned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  projectIdx: index('messages_project_idx').on(table.projectId),
}));

// ============================================================
// ACTIVITY LOG
// ============================================================

export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  projectId: uuid('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),
  userId: varchar('user_id', { length: 255 }).notNull(), // who performed the action
  type: activityTypeEnum('type').notNull(),
  metadata: jsonb('metadata'), // flexible payload: { oldStatus, newStatus, assigneeId, etc. }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('activity_org_idx').on(table.orgId),
  projectIdx: index('activity_project_idx').on(table.projectId),
  userIdx: index('activity_user_idx').on(table.userId),
  createdAtIdx: index('activity_created_at_idx').on(table.createdAt),
}));

// ============================================================
// PA (Personal Assistant) — PROFILE & MEMORY
// ============================================================

export const paProfiles = pgTable('pa_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),

  // Preferences (user-configured)
  autonomyMode: autonomyModeEnum('autonomy_mode').notNull().default('copilot'),
  verbosity: verbosityEnum('verbosity').notNull().default('concise'),
  formality: formalityEnum('formality').notNull().default('professional'),
  morningBriefingEnabled: boolean('morning_briefing_enabled').notNull().default(true),
  morningBriefingTime: varchar('morning_briefing_time', { length: 5 }).default('08:45'), // HH:MM
  endOfDayDigestEnabled: boolean('end_of_day_digest_enabled').notNull().default(false),
  endOfDayDigestTime: varchar('end_of_day_digest_time', { length: 5 }).default('17:30'),
  weeklyDigestEnabled: boolean('weekly_digest_enabled').notNull().default(true),
  weeklyDigestDay: integer('weekly_digest_day').default(5), // 0=Sun, 5=Fri
  timezone: varchar('timezone', { length: 100 }).notNull().default('UTC'),
  workingHoursStart: varchar('working_hours_start', { length: 5 }).default('09:00'),
  workingHoursEnd: varchar('working_hours_end', { length: 5 }).default('17:00'),
  languagePreferences: jsonb('language_preferences').default(['en']), // ['en', 'es', 'fr']
  notificationChannel: varchar('notification_channel', { length: 50 }).default('in_app'), // in_app, email, slack

  // Per-action-type autonomy overrides (user-configured)
  // e.g., { "send_email": "draft_approve", "calendar_block": "execute_notify" }
  actionOverrides: jsonb('action_overrides').default({}),

  // Learned patterns (PA updates these automatically)
  avgTasksPerWeek: real('avg_tasks_per_week'),
  peakHours: jsonb('peak_hours'), // ["09:00-11:30", "14:00-16:00"]
  commonBlockers: jsonb('common_blockers'), // ["waiting on design", "unclear reqs"]
  taskDurationAccuracy: real('task_duration_accuracy'), // 0.0-1.0
  updateHabits: text('update_habits'),
  totalInteractions: integer('total_interactions').default(0),
  commonIntents: jsonb('common_intents'), // { "create_task": 45, "check_schedule": 30 }

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex('pa_profiles_user_org_idx').on(table.userId, table.orgId),
}));

// ============================================================
// PA — CONVERSATION HISTORY
// ============================================================

export const paConversations = pgTable('pa_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text('content').notNull(),
  metadata: jsonb('metadata'), // { voiceInput: true, audioUrl: "...", intent: "create_task" }
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: index('pa_conversations_user_org_idx').on(table.userId, table.orgId),
  createdAtIdx: index('pa_conversations_created_at_idx').on(table.createdAt),
}));

// ============================================================
// PA — ACTIONS (pending, approved, executed)
// ============================================================

export const paActions = pgTable('pa_actions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').references(() => paConversations.id),
  actionType: actionTypeEnum('action_type').notNull(),
  tier: actionTierEnum('tier').notNull(),
  status: actionStatusEnum('status').notNull().default('pending'),

  // What the PA plans to do
  plannedPayload: jsonb('planned_payload').notNull(),
  // Example for send_email: { to: "sarah@co.com", subject: "...", body: "..." }
  // Example for create_task: { title: "...", projectId: "...", assigneeId: "..." }

  // What was actually executed (may differ if user edited)
  executedPayload: jsonb('executed_payload'),
  executionResult: jsonb('execution_result'), // { success: true, taskId: "..." }

  // User feedback
  userEditedPayload: jsonb('user_edited_payload'), // if user edited before approving
  rejectionReason: text('rejection_reason'),

  expiresAt: timestamp('expires_at', { withTimezone: true }), // auto-expire unactioned approvals
  approvedAt: timestamp('approved_at', { withTimezone: true }),
  executedAt: timestamp('executed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('pa_actions_user_idx').on(table.userId),
  statusIdx: index('pa_actions_status_idx').on(table.status),
}));

// ============================================================
// PA — CORRECTIONS (for learning)
// ============================================================

export const paCorrections = pgTable('pa_corrections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  actionId: uuid('action_id').references(() => paActions.id),
  originalOutput: text('original_output').notNull(),
  correctedOutput: text('corrected_output').notNull(),
  correctionType: varchar('correction_type', { length: 50 }), // 'email_tone', 'wrong_person', 'wrong_task', etc.
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// INTEGRATIONS (OAuth tokens)
// ============================================================

export const integrations = pgTable('integrations', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  provider: integrationProviderEnum('provider').notNull(),
  accessToken: text('access_token').notNull(), // encrypted at rest
  refreshToken: text('refresh_token'), // encrypted at rest
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scopes: jsonb('scopes'), // granted OAuth scopes
  providerAccountId: varchar('provider_account_id', { length: 255 }), // e.g., Google email
  providerAccountEmail: varchar('provider_account_email', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: uniqueIndex('integrations_user_provider_idx').on(table.userId, table.orgId, table.provider),
}));

// ============================================================
// NOTIFICATIONS
// ============================================================

export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  type: notificationTypeEnum('type').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  body: text('body'),
  metadata: jsonb('metadata'), // { taskId, projectId, actionId, etc. }
  isRead: boolean('is_read').notNull().default(false),
  readAt: timestamp('read_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  isReadIdx: index('notifications_is_read_idx').on(table.isRead),
}));

// ============================================================
// VOICE TRANSCRIPTS
// ============================================================

export const voiceTranscripts = pgTable('voice_transcripts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  audioUrl: text('audio_url'), // R2 storage URL
  audioFormat: varchar('audio_format', { length: 20 }), // 'webm', 'wav', 'mp3'
  durationMs: integer('duration_ms'),
  transcript: text('transcript').notNull(),
  language: varchar('language', { length: 10 }), // detected language code
  confidence: real('confidence'), // 0.0-1.0
  provider: varchar('provider', { length: 50 }).notNull(), // 'deepgram' | 'gladia'
  rawResponse: jsonb('raw_response'), // full provider response for debugging
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================
// EMBEDDINGS (for RAG — stored in pgvector)
// ============================================================

export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  sourceType: varchar('source_type', { length: 50 }).notNull(), // 'task', 'message', 'comment', 'project'
  sourceId: uuid('source_id').notNull(),
  content: text('content').notNull(), // the text that was embedded
  embedding: vector('embedding', { dimensions: 1536 }).notNull(), // text-embedding-3-small
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('embeddings_org_idx').on(table.orgId),
  sourceIdx: index('embeddings_source_idx').on(table.sourceType, table.sourceId),
  // Create HNSW index for vector similarity search:
  // CREATE INDEX embeddings_vector_idx ON embeddings USING hnsw (embedding vector_cosine_ops);
}));

// ============================================================
// SCHEDULED REPORTS
// ============================================================

export const scheduledReports = pgTable('scheduled_reports', {
  id: uuid('id').primaryKey().defaultRandom(),
  orgId: uuid('org_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  prompt: text('prompt').notNull(), // the natural language report prompt
  schedule: varchar('schedule', { length: 50 }).notNull(), // 'daily', 'weekly', 'monthly'
  deliveryChannel: varchar('delivery_channel', { length: 50 }).notNull(), // 'in_app', 'email', 'slack'
  recipientUserIds: jsonb('recipient_user_ids').notNull(), // array of Clerk user IDs
  lastRunAt: timestamp('last_run_at', { withTimezone: true }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

## Required SQL Migrations (run after Drizzle migration)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS embeddings_vector_idx
  ON embeddings USING hnsw (embedding vector_cosine_ops);

-- Updated_at auto-update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_pa_profiles_updated_at BEFORE UPDATE ON pa_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

# 4. AUTHENTICATION & AUTHORIZATION

## Authentication: Clerk

- Use Clerk for all authentication (sign-up, sign-in, OAuth, session management)
- Clerk webhook syncs user creation/update events to our database
- All API routes use `auth()` from `@clerk/nextjs/server` to get the current user
- User ID from Clerk is the `userId` foreign key throughout the schema

## Authorization: Role-Based Access Control

```typescript
// src/lib/auth/permissions.ts

type Permission =
  | 'org:manage'          // owner, admin
  | 'org:invite'          // owner, admin
  | 'project:create'      // owner, admin, member
  | 'project:manage'      // owner, admin, project lead
  | 'project:view'        // any org member who is a project member
  | 'task:create'         // any project member
  | 'task:assign_others'  // owner, admin, project lead
  | 'task:delete'         // task creator, project lead, admin, owner
  | 'task:edit_any'       // project lead, admin, owner
  | 'message:post'        // any project member
  | 'report:generate'     // any org member (scoped to their visible projects)
  | 'report:org_wide'     // owner, admin
  | 'integration:manage'  // each user manages their own integrations

// Permission check function
export function hasPermission(
  userRole: OrgRole,
  permission: Permission,
  context?: { isProjectLead?: boolean; isTaskCreator?: boolean; isAssignee?: boolean }
): boolean
```

## API Route Pattern

Every API route follows this pattern:

```typescript
// Standard API route template
import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify org membership
  const orgId = req.headers.get('x-org-id');
  if (!orgId) return NextResponse.json({ error: 'Missing organization' }, { status: 400 });

  const member = await getOrgMember(orgId, userId);
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  // ... route logic
}
```

---

# 5–8. CORE PM MODULES

## Module 5: Organizations & Teams

### Create Organization (POST /api/organizations)
```typescript
Request: { name: string, slug: string }
Response: { id, name, slug, createdAt }
Side effects:
  - Creates org
  - Adds current user as 'owner' member
  - Creates default PA profile for user in this org
```

### Invite Member (POST /api/organizations/[orgId]/members)
```typescript
Request: { email: string, role: 'admin' | 'member', jobTitle?: string, department?: string }
Response: { invitation: { id, email, token, expiresAt } }
Side effects:
  - Creates invitation record with 7-day expiry
  - Sends invitation email via Resend
  - On accept: creates org member + PA profile
```

### Member list, role updates, removal — standard CRUD

## Module 6: Projects

### Create Project (POST /api/projects)
```typescript
Request: {
  name: string,
  description?: string,
  color?: string,       // hex
  startDate?: string,   // ISO date
  targetDate?: string,  // ISO date
  memberUserIds?: string[] // initial members
}
Response: { project }
Side effects:
  - Creates project
  - Adds creator as project lead
  - Adds specified members
  - Logs activity: project_created
  - Generates embedding for project name + description
```

### Project list, detail, update, archive — standard CRUD
### Project members: add, remove, change role

## Module 7: Tasks

### Create Task (POST /api/tasks)
```typescript
Request: {
  projectId: string,
  title: string,
  description?: string,
  status?: TaskStatus,
  priority?: TaskPriority,
  assigneeId?: string,
  dueDate?: string,
  estimatedMinutes?: number,
  parentTaskId?: string
}
Response: { task }
Side effects:
  - Creates task
  - Logs activity: task_created
  - If assignee != creator: logs task_assigned + sends notification
  - Generates embedding for task title + description
  - Updates assignee's PA profile (task count metrics)
```

### Update Task (PATCH /api/tasks/[taskId])
```typescript
Request: Partial<Task> // any field can be updated
Side effects:
  - Logs appropriate activity (task_updated, task_completed, task_assigned)
  - If status changed to 'done': sets completedAt, logs task_completed
  - If assignee changed: notifies new assignee, logs task_assigned
  - If isBlocked changed to true: logs blocker_flagged, notifies project lead
  - Re-generates embedding if title or description changed
```

### Task Comments (POST /api/tasks/[taskId]/comments)
```typescript
Request: { content: string }
Side effects:
  - Creates comment
  - Logs activity: task_commented
  - Notifies task assignee and creator (if different from commenter)
  - Generates embedding for comment content
```

### Task Filters (GET /api/tasks)
```typescript
Query params:
  - projectId?: string
  - assigneeId?: string
  - status?: TaskStatus | TaskStatus[]
  - priority?: TaskPriority | TaskPriority[]
  - dueDate_before?: string
  - dueDate_after?: string
  - isBlocked?: boolean
  - search?: string     // full-text search on title + description
  - sort?: 'dueDate' | 'priority' | 'createdAt' | 'position'
  - limit?: number (default 50)
  - cursor?: string     // cursor-based pagination
```

## Module 8: Messages & Activity Feed

### Post Message (POST /api/messages)
```typescript
Request: {
  projectId: string,
  title?: string,
  content: string
}
Side effects:
  - Creates message
  - Logs activity: message_posted
  - Notifies all project members (except author)
  - Generates embedding
```

### Activity Feed (GET /api/activity)
```typescript
Query params:
  - orgId: string (required)
  - projectId?: string
  - userId?: string
  - type?: ActivityType | ActivityType[]
  - after?: string      // ISO datetime
  - before?: string     // ISO datetime
  - limit?: number (default 30)
  - cursor?: string

Response: {
  items: ActivityLogEntry[],
  nextCursor: string | null
}
```

Each activity entry includes the actor's name, avatar, and a human-readable description generated from the type + metadata.

---

# 9. MODULE: VOICE INPUT & TRANSCRIPTION

## Voice Recording (Frontend)

```typescript
// src/hooks/use-voice-recorder.ts

// Uses browser MediaRecorder API
// Records audio as webm/opus (Chrome/Firefox) or mp4/aac (Safari)
// Provides: startRecording(), stopRecording(), isRecording, audioBlob, duration
// Visual feedback: animated waveform during recording
// Auto-stops after 2 minutes of recording (configurable)
// Silence detection: auto-stops after 3 seconds of silence (configurable)
```

### Voice Recording UI Component
```
┌──────────────────────────────────┐
│  [🎤]  Tap to speak to your PA  │  ← idle state
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  [⏹️]  ▓▓▓░░░░░░░  0:04        │  ← recording state with waveform
└──────────────────────────────────┘

┌──────────────────────────────────┐
│  [⏳]  Transcribing...           │  ← processing state
└──────────────────────────────────┘
```

## Transcription API (POST /api/voice/transcribe)

```typescript
Request: FormData with 'audio' file (webm, mp4, wav, mp3)
Headers: { x-org-id: string }

Processing:
  1. Upload audio to R2 for storage/debugging
  2. Send to Deepgram Nova-3 API:
     - model: 'nova-3'
     - language: auto-detect (or user's language_preferences from PA profile)
     - smart_format: true (punctuation, capitalization)
     - diarize: false (single speaker for voice commands)
     - filler_words: false
     - keywords: [project names, team member names from org] // custom vocabulary
  3. If Deepgram fails or confidence < 0.7: retry with Gladia Solaria
  4. Store transcript in voice_transcripts table

Response: {
  id: string,
  transcript: string,
  language: string,
  confidence: number,
  durationMs: number
}
```

### Deepgram Client Implementation
```typescript
// src/lib/voice/deepgram.ts

import { createClient } from '@deepgram/sdk';

export async function transcribeAudio(
  audioBuffer: Buffer,
  options: {
    mimeType: string,
    languageHints?: string[],
    keywords?: string[],
  }
): Promise<{
  transcript: string,
  confidence: number,
  language: string,
  words: Array<{ word: string, start: number, end: number, confidence: number }>,
}>

// Custom vocabulary: before transcribing, fetch org-specific terms
// (project names, member names, common jargon) and pass as keywords
// This dramatically improves accuracy for domain-specific terms
```

## Voice Processing Pipeline (POST /api/voice/process)

```typescript
Request: { transcriptId: string } OR { text: string }  // text for typed PA messages

Processing:
  1. Get transcript text
  2. Get user's PA profile (for context)
  3. Get user's current projects, recent tasks, team members (for entity resolution)
  4. Call Intent Classifier (GPT-4o-mini)
  5. Route based on intent:
     - Simple query → Answer directly
     - Action required → Go to Action System (Module 11)
     - Report request → Go to Report Engine (Module 12)
  6. Store PA conversation entry
  7. Return response

Response: {
  message: string,           // PA's text response
  action?: PAAction,         // if an action was created (pending or executed)
  report?: ReportOutput,     // if a report was generated
  intent: string,            // classified intent
  entities: Record<string, string>  // extracted entities
}
```

---

# 10. MODULE: AI PERSONAL ASSISTANT (PA) ENGINE

## Intent Classification

```typescript
// src/lib/ai/intent-classifier.ts

// Uses GPT-4o-mini for speed and cost
// Input: transcript + user context
// Output: intent + entities + confidence

export async function classifyIntent(
  transcript: string,
  context: {
    userName: string,
    projects: Array<{ id: string, name: string }>,
    teamMembers: Array<{ id: string, name: string }>,
    recentTasks: Array<{ id: string, title: string, status: string }>,
  }
): Promise<{
  intent: ActionType,
  entities: {
    taskTitle?: string,
    taskDescription?: string,
    projectName?: string,
    projectId?: string,
    assigneeName?: string,
    assigneeId?: string,
    dueDate?: string,
    priority?: string,
    status?: string,
    emailTo?: string,
    emailSubject?: string,
    emailBody?: string,
    slackChannel?: string,
    slackMessage?: string,
    calendarTitle?: string,
    calendarDate?: string,
    calendarDuration?: number,
    calendarAttendees?: string[],
    reportScope?: string,        // 'project' | 'team' | 'org' | 'personal'
    reportTimeframe?: string,    // 'today' | 'this_week' | 'last_week' | 'this_sprint'
    reportQuestion?: string,     // the natural language question
    blockerDescription?: string,
  },
  confidence: number,
}>
```

### System Prompt for Intent Classification

```typescript
// src/lib/ai/prompts/intent-classification.ts

export const INTENT_CLASSIFICATION_PROMPT = `
You are an intent classifier for a project management AI assistant.

Given a user's voice transcript and their workspace context, classify the intent
and extract entities. Respond ONLY with valid JSON.

## Intents:

### Read/Query Intents (Tier 1 — no action needed, just answer):
- check_tasks: User asks about their tasks, what's due, what's next
- check_calendar: User asks about their schedule, meetings, availability
- check_email: User asks about their emails, inbox
- check_project_status: User asks how a project is going
- check_workload: User asks about team workload, who's busy

### Mutation Intents:
- create_task: User wants to create a new task
- update_task: User wants to change a task's status, priority, due date, etc.
- complete_task: User wants to mark a task as done
- create_comment: User wants to add a comment/note to a task
- post_message: User wants to post a message to a project board
- flag_blocker: User is blocked on something

### External Intents:
- calendar_block: User wants to block time on their calendar
- calendar_event: User wants to schedule a meeting with others
- calendar_reschedule: User wants to move/cancel a meeting
- send_email: User wants to send an email
- send_slack: User wants to send a Slack message

### Report Intents:
- generate_report: User wants a summary, status update, or analysis
- generate_briefing: User asks for their daily briefing / what to focus on

## Entity Resolution Rules:
- Match project names fuzzy (e.g., "Phoenix" matches "Project Phoenix")
- Match team member names fuzzy (e.g., "Sarah" matches "Sarah Chen")
- Parse relative dates (e.g., "tomorrow", "next Tuesday", "end of week")
- Parse durations (e.g., "30 minutes", "2 hours", "half an hour")
- Default priority to "medium" if not specified
- Default status to "todo" for new tasks

## Context:
User: {userName}
Projects: {projects}
Team Members: {teamMembers}
Recent Tasks: {recentTasks}
Current Date/Time: {now}
User Timezone: {timezone}

## Transcript:
"{transcript}"

Respond with JSON:
{
  "intent": "<intent>",
  "entities": { ... },
  "confidence": <0.0-1.0>
}
`;
```

## PA Chat (POST /api/pa/chat)

The main PA interaction endpoint. Handles both text and voice-processed input.

```typescript
Request: {
  message: string,        // user's text message (or transcript from voice)
  voiceTranscriptId?: string,  // if from voice
}

Processing:
  1. Load user's PA profile
  2. Load last 10 PA conversation messages (for continuity)
  3. Classify intent
  4. Based on intent:

     a) READ INTENTS (Tier 1):
        - Query the database for requested info
        - Use Claude to format a natural, concise response
        - Return immediately

     b) MUTATION INTENTS (Tier 2-3):
        - Determine action tier from registry (adjusted by user's autonomy settings)
        - If auto_execute or execute_notify:
          → Execute action immediately
          → Return confirmation message
        - If draft_approve:
          → Create PA action with status 'pending'
          → Return draft for approval

     c) REPORT INTENTS:
        - Route to Report Engine
        - Return narrative report

  5. Store conversation entries (user message + assistant response)
  6. Increment user's interaction count
  7. Update common_intents in PA profile

Response: {
  message: string,                // PA's natural language response
  action?: {
    id: string,
    type: ActionType,
    tier: ActionTier,
    status: ActionStatus,
    plannedPayload: object,       // what the PA plans to do
  },
  report?: {
    narrative: string,
    data?: object,                // structured data if applicable
  },
}
```

## Action Planning (Claude Sonnet)

For complex actions (Tier 3+), use Claude Sonnet to plan the action:

```typescript
// src/lib/ai/action-planner.ts

// Used when the intent classifier identifies a mutation/external intent
// Claude receives full context and generates the action payload

export async function planAction(
  intent: ActionType,
  entities: Record<string, any>,
  context: {
    user: UserProfile,
    paProfile: PAProfile,
    project?: Project,
    recentActivity?: ActivityLogEntry[],
  }
): Promise<{
  tier: ActionTier,
  payload: Record<string, any>,
  confirmationMessage: string,
  draftPreview?: string,  // for Tier 3: human-readable preview
}>
```

---

# 11. MODULE: ACTION SYSTEM (GRADUATED AUTONOMY)

## Action Registry

```typescript
// src/lib/actions/registry.ts

// Default tiers for each action type
// Users can override via PA profile actionOverrides

export const ACTION_REGISTRY: Record<ActionType, {
  defaultTier: ActionTier,
  handler: string,
  requiresIntegration?: IntegrationProvider,
  description: string,
}> = {
  // Tier 1: Auto-execute
  check_tasks:          { defaultTier: 'auto_execute', handler: 'query', description: 'Check task list' },
  check_calendar:       { defaultTier: 'auto_execute', handler: 'query', description: 'Check calendar', requiresIntegration: 'google' },
  check_email:          { defaultTier: 'auto_execute', handler: 'query', description: 'Check emails', requiresIntegration: 'google' },
  check_project_status: { defaultTier: 'auto_execute', handler: 'query', description: 'Check project status' },
  check_workload:       { defaultTier: 'auto_execute', handler: 'query', description: 'Check team workload' },

  // Tier 2: Execute + Notify
  create_task:      { defaultTier: 'execute_notify', handler: 'create-task', description: 'Create a task for yourself' },
  update_task:      { defaultTier: 'execute_notify', handler: 'update-task', description: 'Update task status/details' },
  complete_task:    { defaultTier: 'execute_notify', handler: 'complete-task', description: 'Mark task as done' },
  create_comment:   { defaultTier: 'execute_notify', handler: 'create-comment', description: 'Add comment to task' },
  flag_blocker:     { defaultTier: 'execute_notify', handler: 'flag-blocker', description: 'Flag a blocker' },
  calendar_block:   { defaultTier: 'execute_notify', handler: 'calendar-block', description: 'Block focus time', requiresIntegration: 'google' },
  generate_report:  { defaultTier: 'execute_notify', handler: 'generate-report', description: 'Generate a report' },
  generate_briefing:{ defaultTier: 'execute_notify', handler: 'generate-report', description: 'Generate briefing' },

  // Tier 3: Draft + Approve
  post_message:         { defaultTier: 'draft_approve', handler: 'post-message', description: 'Post message to project' },
  calendar_event:       { defaultTier: 'draft_approve', handler: 'calendar-event', description: 'Schedule meeting', requiresIntegration: 'google' },
  calendar_reschedule:  { defaultTier: 'draft_approve', handler: 'calendar-event', description: 'Reschedule meeting', requiresIntegration: 'google' },
  send_email:           { defaultTier: 'draft_approve', handler: 'send-email', description: 'Send email', requiresIntegration: 'google' },
  send_slack:           { defaultTier: 'draft_approve', handler: 'send-slack', description: 'Send Slack message', requiresIntegration: 'slack' },
};

// Tier resolution: check user overrides first, then default
export function resolveActionTier(
  actionType: ActionType,
  paProfile: PAProfile,
  context?: { isAssignedToSelf?: boolean, isExternalRecipient?: boolean }
): ActionTier {
  // 1. Check per-action override
  if (paProfile.actionOverrides[actionType]) {
    return paProfile.actionOverrides[actionType];
  }
  // 2. Check autonomy mode
  if (paProfile.autonomyMode === 'manual') return 'draft_approve';
  if (paProfile.autonomyMode === 'autopilot') {
    const defaultTier = ACTION_REGISTRY[actionType].defaultTier;
    // In autopilot, Tier 2 actions auto-execute. Tier 3 still needs approval.
    return defaultTier;
  }
  // 3. Default (copilot mode)
  // Special rule: creating task for someone else → bump to Tier 3
  if (actionType === 'create_task' && !context?.isAssignedToSelf) {
    return 'draft_approve';
  }
  return ACTION_REGISTRY[actionType].defaultTier;
}
```

## Action Executor

```typescript
// src/lib/actions/executor.ts

export async function executeAction(action: PAAction): Promise<{
  success: boolean,
  result?: any,
  error?: string,
}> {
  const handler = ACTION_REGISTRY[action.actionType].handler;

  // Check if integration is required and connected
  const requiredIntegration = ACTION_REGISTRY[action.actionType].requiresIntegration;
  if (requiredIntegration) {
    const integration = await getIntegration(action.userId, action.orgId, requiredIntegration);
    if (!integration) {
      return { success: false, error: `${requiredIntegration} is not connected. Please connect it in Settings > Integrations.` };
    }
    // Refresh token if expired
    if (integration.tokenExpiresAt && integration.tokenExpiresAt < new Date()) {
      await refreshOAuthToken(integration);
    }
  }

  // Execute the appropriate handler
  switch (handler) {
    case 'create-task': return handlers.createTask(action);
    case 'update-task': return handlers.updateTask(action);
    case 'complete-task': return handlers.completeTask(action);
    case 'create-comment': return handlers.createComment(action);
    case 'post-message': return handlers.postMessage(action);
    case 'flag-blocker': return handlers.flagBlocker(action);
    case 'calendar-block': return handlers.calendarBlock(action);
    case 'calendar-event': return handlers.calendarEvent(action);
    case 'send-email': return handlers.sendEmail(action);
    case 'send-slack': return handlers.sendSlack(action);
    case 'generate-report': return handlers.generateReport(action);
    default: return { success: false, error: `Unknown handler: ${handler}` };
  }
}
```

## Action Approval Flow (PATCH /api/pa/actions/[actionId])

```typescript
Request: {
  decision: 'approve' | 'reject' | 'edit',
  editedPayload?: object,    // if decision is 'edit', the modified payload
  rejectionReason?: string,  // if decision is 'reject'
}

Processing:
  - approve: Execute action with planned_payload, set status to 'executed'
  - edit: Execute action with edited_payload, set status to 'executed', store userEditedPayload
  - reject: Set status to 'rejected', store rejectionReason, log correction

Side effects:
  - If edited: create PA correction record (for learning)
  - If rejected: create PA correction record
  - Update PA profile correction_log
  - Send SSE event to update UI
```

## Action Expiry

Pending actions expire after 24 hours. A cron job runs hourly to expire stale actions:
```
UPDATE pa_actions SET status = 'expired'
WHERE status = 'pending' AND expires_at < NOW();
```

---

# 12. MODULE: REPORTING ENGINE

## Natural Language Report (POST /api/pa/report)

```typescript
Request: {
  question: string,     // "How's the team doing this sprint?"
  projectId?: string,   // scope to specific project
  format?: 'narrative' | 'structured' | 'data_only'
}

Processing:
  1. Classify the report type from the question:
     - Status summary (how's X going?)
     - Prediction (will we hit the deadline?)
     - Comparison (this week vs last week)
     - Workload (who's overloaded?)
     - Accomplishment (what did we do?)
     - Risk (what's at risk?)
     - Executive summary (what should I tell the board?)

  2. Build database queries based on report type:
     - Task counts by status, assignee, priority
     - Task completion rate (completed / total in timeframe)
     - Overdue tasks count and details
     - Blockers (blocked tasks)
     - Activity log entries for timeframe
     - Velocity (tasks completed per week, trailing 4 weeks)
     - Upcoming deadlines

  3. Add context based on the asker's role:
     - IC: focus on their tasks and immediate team
     - Team lead: focus on team metrics, blockers
     - Admin/Owner: focus on org-wide, business impact

  4. Send data + question + role context to Claude Sonnet
     with the report generation prompt

  5. Claude generates a narrative report

Response: {
  narrative: string,           // the human-readable report
  data: {                      // structured data backing the narrative
    totalTasks: number,
    completedTasks: number,
    completionRate: number,
    overdueTasks: number,
    blockedTasks: number,
    velocityTrend: number[],   // last 4 weeks
    topRisks: string[],
    topAccomplishments: string[],
    workloadByPerson: Record<string, number>,
  },
  generatedAt: string,
}
```

### Report Generation Prompt

```typescript
// src/lib/ai/prompts/report-generation.ts

export const REPORT_GENERATION_PROMPT = `
You are a project management reporting assistant. Generate clear, concise,
opinionated reports that tell a story — not just list data.

## Rules:
- Lead with the most important insight
- Be specific: name people, tasks, dates
- Give probabilities for predictions ("70% likely to hit deadline")
- Always mention blockers and risks
- End with a recommended action or focus
- Match the audience level:
  - IC: tactical, specific to their work
  - Team lead: team health, blockers, velocity
  - Executive: timeline risk, milestones, business impact
- Keep it under 300 words unless asked for detail
- Use natural, conversational tone — not formal report language
- Do NOT use bullet points unless the user asks for structured format

## Asker's Role: {role}
## Asker's Name: {name}
## Question: "{question}"
## Current Date: {date}

## Data:
{jsonData}

## Recent Activity (last 7 days):
{recentActivity}

Generate the report:
`;
```

## Morning Briefing (GET /api/pa/briefing)

```typescript
Processing:
  1. Get user's tasks due today and this week
  2. Get user's calendar events for today (via Google/Microsoft integration)
  3. Get user's unread notifications
  4. Get blockers on user's projects
  5. Get recent activity on user's projects (since last briefing)
  6. Get any overdue tasks
  7. Send all context to Claude with briefing prompt

Response: {
  briefing: string,           // narrative briefing
  todaysTasks: Task[],
  todaysMeetings: CalendarEvent[],
  blockers: Task[],
  unreadCount: number,
}
```

### Briefing Prompt
```typescript
export const BRIEFING_PROMPT = `
You are {userName}'s personal assistant. Generate their morning briefing.

Rules:
- Be warm but efficient. Start with "Good morning, {firstName}."
- Prioritize: what's most important TODAY
- Mention upcoming deadlines this week
- Flag any blockers or risks
- If calendar is packed, suggest what could be moved
- Keep under 200 words
- Conversational tone, not formal

Today: {date} ({dayOfWeek})
Timezone: {timezone}

Tasks due today: {todayTasks}
Tasks due this week: {weekTasks}
Overdue tasks: {overdueTasks}
Today's meetings: {meetings}
Recent team activity: {recentActivity}
Current blockers on your projects: {blockers}
`;
```

## Weekly Digest (Cron: /api/cron/weekly-digest)

Runs every Friday (or user-configured day) at end of working hours.

```typescript
Processing:
  For each user with weeklyDigestEnabled:
    1. Get all projects the user is a member of
    2. For each project: task completion rate, new blockers, completed milestones
    3. User's personal: tasks completed, tasks carried over
    4. Team highlights: who shipped what, any standout contributions
    5. Next week preview: upcoming deadlines, meetings
    6. Generate narrative with Claude
    7. Deliver via user's preferred channel (in_app, email, slack)
```

---

# 13. MODULE: INTEGRATIONS

## Google OAuth2 Flow

```typescript
// GET /api/integrations/google/auth
// Initiates OAuth2 flow with Google

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
];

// Redirects to Google consent screen
// On callback: stores tokens in integrations table (encrypted)
```

### Google Calendar Operations
```typescript
// src/lib/integrations/google-calendar.ts

export async function getEvents(userId: string, orgId: string, params: {
  timeMin: string, // ISO date
  timeMax: string,
  maxResults?: number,
}): Promise<CalendarEvent[]>

export async function createEvent(userId: string, orgId: string, event: {
  summary: string,
  description?: string,
  startTime: string,
  endTime: string,
  attendees?: string[], // email addresses
  location?: string,
}): Promise<CalendarEvent>

export async function updateEvent(userId: string, orgId: string, eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>

export async function deleteEvent(userId: string, orgId: string, eventId: string): Promise<void>
```

### Gmail Operations
```typescript
// src/lib/integrations/google-mail.ts

export async function getUnreadEmails(userId: string, orgId: string, params: {
  maxResults?: number,
  query?: string, // Gmail search query
}): Promise<Array<{
  id: string,
  from: string,
  subject: string,
  snippet: string,
  date: string,
}>>

export async function sendEmail(userId: string, orgId: string, email: {
  to: string,
  cc?: string,
  subject: string,
  body: string,       // plain text
  htmlBody?: string,  // HTML version
}): Promise<{ messageId: string }>
```

### Slack Operations
```typescript
// src/lib/integrations/slack.ts

export async function sendMessage(userId: string, orgId: string, params: {
  channel?: string,     // channel name or ID
  userId?: string,      // for DMs — Slack user ID
  text: string,
}): Promise<{ ts: string, channel: string }>
```

### Microsoft Graph Operations
```typescript
// Same pattern as Google, using Microsoft Graph API
// Calendar: /me/events, /me/calendarview
// Mail: /me/messages, /me/sendMail
```

## Token Refresh

All OAuth tokens are automatically refreshed when:
1. An API call returns 401
2. The token is within 5 minutes of expiry

```typescript
// src/lib/integrations/oauth.ts

export async function refreshOAuthToken(integration: Integration): Promise<void> {
  // Call provider's token refresh endpoint
  // Update access_token and token_expires_at in database
  // If refresh fails: mark integration as inactive, notify user
}
```

---

# 14. MODULE: PROACTIVE PA BEHAVIORS

All proactive behaviors run as cron jobs or BullMQ scheduled jobs.

## Morning Briefing (/api/cron/morning-briefing)
- **Schedule:** Runs every 15 minutes, checks for users whose briefing time has arrived
- **Logic:** For each user with morningBriefingEnabled where current time (in user's timezone) matches morningBriefingTime (±15 min window):
  1. Generate briefing (see Module 12)
  2. Create notification with type 'pa_briefing'
  3. Send via user's preferred channel

## Overdue Task Nudge (/api/cron/overdue-nudge)
- **Schedule:** Every hour
- **Logic:** Find tasks where dueDate < now AND status NOT IN ('done', 'cancelled') AND last nudge was > 24 hours ago:
  1. Create notification: "The {task title} was due {relative time}. Want me to update the deadline or mark it done?"
  2. Store nudge timestamp to prevent spam

## Stale Task Detection (/api/cron/stale-tasks)
- **Schedule:** Daily at 10:00 UTC
- **Logic:** Find tasks where status = 'in_progress' AND updatedAt < 7 days ago:
  1. Create notification: "The {task title} hasn't been updated in {N} days. Is it still in progress?"

## Weekly Digest (/api/cron/weekly-digest)
- **Schedule:** Configurable per user (default Friday 17:00 user timezone)
- **Logic:** See Module 12

## Profile Learning (BullMQ Worker)
- **Trigger:** After every PA interaction
- **Logic:**
  1. Update totalInteractions count
  2. Update commonIntents frequency map
  3. Every 50 interactions: recalculate avgTasksPerWeek, taskDurationAccuracy
  4. Every 100 interactions: analyze communication patterns, update verbosity/formality observations

---

# 15. MODULE: NOTIFICATIONS

## In-App Notifications

```typescript
// src/lib/notifications/in-app.ts

export async function createNotification(params: {
  userId: string,
  orgId: string,
  type: NotificationType,
  title: string,
  body?: string,
  metadata?: Record<string, any>,
}): Promise<void> {
  // 1. Insert into notifications table
  // 2. Push via SSE to connected clients
}
```

## Server-Sent Events (GET /api/notifications/sse)

```typescript
// SSE endpoint for real-time notification delivery

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Register this connection in SSE manager
      sseManager.addClient(userId, (data) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      });
    },
    cancel() {
      sseManager.removeClient(userId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
}

// SSE events:
// - notification: new notification
// - action_update: PA action status changed
// - task_update: task modified (for live UI updates)
```

## Email Notifications

Sent via Resend for:
- Invitation emails
- Morning briefing (if user prefers email)
- Weekly digest (if user prefers email)
- Overdue nudge (if user prefers email)
- PA action results (optional)

---

# 16. MODULE: USER PA PROFILE & LEARNING

## PA Settings Page (Frontend: /dashboard/settings/pa)

```
┌─────────────────────────────────────────┐
│  Your PA Settings                       │
│                                         │
│  ▸ Autonomy Mode                        │
│    ○ Auto-pilot (PA acts freely)        │
│    ● Co-pilot (PA asks for approvals)   │
│    ○ Manual (confirm everything)        │
│                                         │
│  ▸ Per-Action Overrides                 │
│    Send emails ......... [Draft+Approve]│
│    Create tasks ........ [Execute+Notify]│
│    Block calendar ...... [Auto-execute] │
│    Post messages ....... [Draft+Approve]│
│    Send Slack msgs ..... [Draft+Approve]│
│                                         │
│  ▸ Briefings                            │
│    Morning briefing .... [✓] at [08:45] │
│    End-of-day digest ... [ ] at [17:30] │
│    Weekly digest ....... [✓] on [Friday]│
│                                         │
│  ▸ Communication Style                  │
│    Response length: [Concise ▾]         │
│    Tone: [Professional ▾]              │
│                                         │
│  ▸ Working Hours                        │
│    Start: [09:00]  End: [17:00]        │
│    Timezone: [Europe/London ▾]          │
│                                         │
│  ▸ Languages                            │
│    Primary: [English ▾]                 │
│    Also speaks: [+ Add language]        │
│                                         │
│  ▸ Connected Accounts                   │
│    Google .... [Connected ✓] [Disconnect]│
│    Slack ..... [Connect →]              │
│    Microsoft . [Connect →]              │
│                                         │
└─────────────────────────────────────────┘
```

---

# 17. FRONTEND: PAGES, COMPONENTS, LAYOUTS

## Dashboard Layout (src/app/dashboard/layout.tsx)

```
┌──────┬──────────────────────────┬────────────┐
│      │                          │            │
│  S   │    MAIN CONTENT          │   PA CHAT  │
│  I   │                          │   PANEL    │
│  D   │    (page content         │            │
│  E   │     renders here)        │  [Messages]│
│  B   │                          │            │
│  A   │                          │  [Input]   │
│  R   │                          │  [🎤 Mic]  │
│      │                          │            │
└──────┴──────────────────────────┴────────────┘
```

- **Sidebar** (260px, collapsible): Logo, nav links (Home, Projects, My Tasks, Team, Reports, Integrations, Settings). Active state highlighted.
- **Main Content**: Renders the page content. Max-width 1200px, centered.
- **PA Panel** (400px, slide-out from right): Always accessible via floating button. Contains PA chat interface. Persists across page navigation.

## Key Page Specifications

### Home / Dashboard (src/app/dashboard/page.tsx)
- Morning briefing card at top (if briefing available and unread)
- "My Tasks" section: tasks due today, grouped by project
- "Upcoming" section: tasks due this week
- "Recent Activity" feed: last 20 activity items across user's projects

### Project Overview (src/app/dashboard/projects/[projectId]/page.tsx)
- Project header: name, description, status badge, target date, members
- Tab navigation: Overview | Tasks | Messages
- Overview tab: task status breakdown (mini chart), recent activity, blockers
- Tasks tab: Kanban board (columns: Todo, In Progress, In Review, Done) with drag-and-drop OR list view toggle
- Messages tab: threaded message board

### My Tasks (src/app/dashboard/my-tasks/page.tsx)
- All tasks assigned to current user across all projects
- Grouped by: Today, This Week, Later, No Date
- Filter bar: status, priority, project
- Click task → slide-out detail panel

### Team (src/app/dashboard/team/page.tsx)
- Grid of team member cards
- Each card: name, avatar, role, department, task count, workload bar
- Workload bar: visual indicator (green/yellow/red) based on task count vs avg

### Reports (src/app/dashboard/reports/page.tsx)
- Chat-style interface (like PA chat, but full-width)
- User types or speaks a question
- PA responds with narrative report
- Suggested questions shown as chips: "How's the team doing?", "What's at risk?", "Weekly summary"
- Option to export report as markdown or PDF

## Component Design Guidelines

- **Color palette:** Neutral base (slate-50 to slate-900), one accent color (blue-600), status colors: green (done), yellow (in progress), red (overdue/blocked), gray (todo)
- **Typography:** Inter or System font stack. 14px base. Headings: 16px, 20px, 24px.
- **Spacing:** Consistent 4px grid (p-1 = 4px, p-2 = 8px, etc.)
- **Cards:** White background, subtle border (slate-200), rounded-lg, p-4
- **No visual clutter:** Minimal borders, generous whitespace, no unnecessary icons
- **Status badges:** Colored dots or pills, not icons: 🟢 Done, 🟡 In Progress, 🔴 Overdue, ⚪ Todo
- **Animations:** Subtle only: slide-in for PA panel, fade for notifications. No bouncing or heavy transitions.

---

# 18. API REFERENCE (COMPLETE ENDPOINT LIST)

All endpoints require authentication (Clerk) and org context (x-org-id header) unless noted.

```
AUTH (handled by Clerk):
  /sign-in          → Clerk hosted sign-in
  /sign-up          → Clerk hosted sign-up

WEBHOOKS:
  POST /api/webhooks/clerk         → Sync user events

ORGANIZATIONS:
  GET    /api/organizations                → List user's orgs
  POST   /api/organizations                → Create org
  GET    /api/organizations/:id            → Get org detail
  PATCH  /api/organizations/:id            → Update org
  DELETE /api/organizations/:id            → Delete org
  GET    /api/organizations/:id/members    → List members
  POST   /api/organizations/:id/members    → Invite member
  PATCH  /api/organizations/:id/members/:userId → Update member role
  DELETE /api/organizations/:id/members/:userId → Remove member

PROJECTS:
  GET    /api/projects                     → List projects (in org)
  POST   /api/projects                     → Create project
  GET    /api/projects/:id                 → Get project detail
  PATCH  /api/projects/:id                 → Update project
  DELETE /api/projects/:id                 → Archive/delete project
  GET    /api/projects/:id/members         → List project members
  POST   /api/projects/:id/members         → Add member to project
  DELETE /api/projects/:id/members/:userId → Remove from project

TASKS:
  GET    /api/tasks                        → List tasks (filterable)
  POST   /api/tasks                        → Create task
  GET    /api/tasks/:id                    → Get task detail
  PATCH  /api/tasks/:id                    → Update task
  DELETE /api/tasks/:id                    → Delete task
  GET    /api/tasks/:id/comments           → List comments
  POST   /api/tasks/:id/comments           → Add comment

MESSAGES:
  GET    /api/messages                     → List messages (by projectId)
  POST   /api/messages                     → Post message
  GET    /api/messages/:id                 → Get message
  PATCH  /api/messages/:id                 → Edit message
  DELETE /api/messages/:id                 → Delete message

ACTIVITY:
  GET    /api/activity                     → Activity feed (filterable)

VOICE:
  POST   /api/voice/transcribe             → Upload audio → transcript
  POST   /api/voice/process                → Transcript → PA action

PA (Personal Assistant):
  POST   /api/pa/chat                      → Send message to PA
  GET    /api/pa/actions                   → List pending actions
  POST   /api/pa/actions                   → Manually create action
  PATCH  /api/pa/actions/:id               → Approve/reject/edit action
  GET    /api/pa/briefing                  → Get/generate morning briefing
  POST   /api/pa/report                    → Generate report from question

INTEGRATIONS:
  GET    /api/integrations/google/auth      → Start Google OAuth
  GET    /api/integrations/google/callback  → Google OAuth callback
  GET    /api/integrations/google/calendar  → Get calendar events
  POST   /api/integrations/google/calendar  → Create calendar event
  GET    /api/integrations/google/mail      → Get unread emails
  POST   /api/integrations/google/mail      → Send email
  GET    /api/integrations/microsoft/auth   → Start Microsoft OAuth
  GET    /api/integrations/microsoft/callback
  GET    /api/integrations/microsoft/calendar
  POST   /api/integrations/microsoft/calendar
  GET    /api/integrations/microsoft/mail
  POST   /api/integrations/microsoft/mail
  GET    /api/integrations/slack/auth       → Start Slack OAuth
  GET    /api/integrations/slack/callback
  POST   /api/integrations/slack/send       → Send Slack message

NOTIFICATIONS:
  GET    /api/notifications                → List notifications
  PATCH  /api/notifications                → Mark as read (bulk)
  GET    /api/notifications/sse            → SSE stream

CRON (protected by cron secret):
  POST   /api/cron/morning-briefing
  POST   /api/cron/weekly-digest
  POST   /api/cron/stale-tasks
  POST   /api/cron/overdue-nudge
```

---

# 19. ENVIRONMENT VARIABLES

```bash
# .env.local

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/hive

# Redis
REDIS_URL=redis://localhost:6379

# Cloudflare R2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET_NAME=hive-uploads
R2_PUBLIC_URL=https://...

# AI - Transcription
DEEPGRAM_API_KEY=...
GLADIA_API_KEY=...

# AI - LLMs
OPENAI_API_KEY=...          # GPT-4o-mini (intent classification) + embeddings
ANTHROPIC_API_KEY=...       # Claude Sonnet (action planning, reports, drafting)

# Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL=noreply@hive.app

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/integrations/microsoft/callback

# Slack OAuth
SLACK_CLIENT_ID=...
SLACK_CLIENT_SECRET=...
SLACK_REDIRECT_URI=http://localhost:3000/api/integrations/slack/callback

# Cron Secret (verify cron requests)
CRON_SECRET=...

# Encryption key for OAuth tokens at rest
ENCRYPTION_KEY=...
```

---

# 20. TESTING STRATEGY

## Unit Tests (Vitest)
- All action handlers: test each handler with mock data
- Intent classifier: test with sample transcripts → expected intents
- Action tier resolution: test all autonomy modes and overrides
- Permission checks: test RBAC for all roles
- Date/timezone utilities

## Integration Tests (Vitest + test database)
- Full PA chat flow: message → intent → action → execution → response
- Voice flow: audio upload → transcription → processing
- Approval flow: create action → approve → execute
- Report generation: question → data queries → narrative
- OAuth flow: mock OAuth responses

## E2E Tests (Playwright)
- Sign up → create org → create project → create task
- Voice recording → transcription → task creation
- PA chat: ask question → get response
- PA action: request email → approve → verify sent
- Report: ask question → receive narrative

---

# 21. DEPLOYMENT CONFIGURATION

## Recommended: Vercel + Neon + Upstash

- **Frontend + API:** Vercel (automatic from Next.js)
- **Database:** Neon (serverless Postgres with pgvector)
- **Redis:** Upstash (serverless Redis)
- **File Storage:** Cloudflare R2
- **Background Workers:** Vercel Cron (for scheduled jobs) + Inngest or Trigger.dev (for async workers — alternative to BullMQ for serverless)
- **Email:** Resend

## Alternative: Railway / Fly.io (if you need persistent workers)

If using BullMQ workers (not serverless):
- **App:** Railway / Fly.io
- **Database:** Railway Postgres or Neon
- **Redis:** Railway Redis or Upstash
- **Workers:** Separate Railway service running `scripts/worker.ts`

## Cron Jobs Configuration (Vercel)

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/morning-briefing",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/overdue-nudge",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/stale-tasks",
      "schedule": "0 10 * * *"
    },
    {
      "path": "/api/cron/weekly-digest",
      "schedule": "0 * * * 5"
    }
  ]
}
```

---

# 22. BUILD & RUN COMMANDS

```bash
# Install dependencies
npm install

# Setup database
npx drizzle-kit generate    # generate migrations from schema
npx drizzle-kit migrate     # run migrations
npx tsx scripts/seed.ts     # seed sample data

# Development
npm run dev                 # Next.js dev server (port 3000)
npx tsx scripts/worker.ts   # BullMQ worker (separate terminal)

# Production build
npm run build
npm start

# Type checking
npx tsc --noEmit

# Tests
npm run test               # unit + integration (vitest)
npm run test:e2e           # Playwright
```

## Package Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "typescript": "^5.5.0",
    "@clerk/nextjs": "^5.0.0",
    "drizzle-orm": "^0.33.0",
    "postgres": "^3.4.0",
    "@neondatabase/serverless": "^0.9.0",
    "zod": "^3.23.0",
    "zustand": "^4.5.0",
    "@tanstack/react-query": "^5.50.0",
    "react-hook-form": "^7.52.0",
    "@hookform/resolvers": "^3.9.0",
    "tailwindcss": "^4.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.0",
    "@radix-ui/react-select": "^2.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.4.0",
    "lucide-react": "^0.400.0",
    "@deepgram/sdk": "^3.5.0",
    "openai": "^4.55.0",
    "@anthropic-ai/sdk": "^0.27.0",
    "@aws-sdk/client-s3": "^3.600.0",
    "googleapis": "^140.0.0",
    "@microsoft/microsoft-graph-client": "^3.0.0",
    "@slack/web-api": "^7.3.0",
    "bullmq": "^5.10.0",
    "ioredis": "^5.4.0",
    "resend": "^3.5.0",
    "nanoid": "^5.0.0",
    "date-fns": "^3.6.0",
    "date-fns-tz": "^3.1.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.24.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.45.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "eslint": "^8.57.0",
    "eslint-config-next": "^14.2.0",
    "prettier": "^3.3.0",
    "tsx": "^4.16.0"
  }
}
```

---

# IMPLEMENTATION ORDER

Build in this exact sequence. Each phase should be fully functional before moving to the next.

## Phase 1: Foundation (complete and test before Phase 2)
1. Initialize Next.js project with TypeScript, Tailwind, shadcn/ui
2. Setup Clerk authentication (sign-in, sign-up, middleware)
3. Setup Drizzle ORM + PostgreSQL schema + migrations
4. Build Organizations CRUD + members
5. Build Projects CRUD + members
6. Build Tasks CRUD + comments + filters
7. Build Messages CRUD
8. Build Activity Log (auto-logged on all mutations)
9. Build Notifications (in-app + SSE)
10. Build all frontend pages + components with working CRUD
11. Test everything works end-to-end via UI

## Phase 2: Voice + PA Core
12. Build voice recording component (MediaRecorder)
13. Integrate Deepgram Nova-3 transcription API
14. Build Intent Classifier (GPT-4o-mini)
15. Build PA Chat endpoint (text-based first)
16. Build PA Chat UI panel
17. Connect voice → transcribe → PA chat pipeline
18. Build Action Registry with tier system
19. Build Action Executor for internal actions (create_task, update_task, complete_task, etc.)
20. Build Action Approval UI (approve/edit/reject cards)
21. Test full voice → action → execution flow

## Phase 3: Integrations + External Actions
22. Build Google OAuth2 flow
23. Build Google Calendar integration (read + write)
24. Build Gmail integration (read + send)
25. Build action handlers for calendar_block, calendar_event, send_email
26. Build Microsoft OAuth2 + Graph API (calendar + mail)
27. Build Slack OAuth2 + message sending
28. Test all external actions through PA

## Phase 4: Reporting + Proactive
29. Build Report Generation Engine (Claude)
30. Build Reports page (conversational interface)
31. Build Morning Briefing generator
32. Build Weekly Digest generator
33. Build Cron jobs for proactive behaviors
34. Build PA Profile learning worker
35. Build embeddings pipeline (pgvector RAG)
36. Test proactive features

---

END OF PRD
