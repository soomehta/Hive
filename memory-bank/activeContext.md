# Active Context: Hive

## Current Focus

- **DEPLOYED TO PRODUCTION.** Live at https://hive-app-beryl.vercel.app
- **All 7 phases + QoL + prod hardening + database + deployment + test coverage + frontend refactoring + PA pipeline refinement: COMPLETE.** 80+ routes, 0 TypeScript errors in src/, 366 unit tests pass.
- **Phase 7 (Workspaces, Agent Channels, @Mentions, Autonomous PM, Smart Check-ins): COMPLETE.**

## Recent Changes (Phase 6 PRD Authoring)

- Created new full PRD: `docs/prd-phase-6-pinboard-canvas-chat.md`.
- Captured explicit boundaries for "what it is" and "what it is not."
- Finalized editor stack decision: **Tiptap (ProseMirror)** with JSON storage and markdown interoperability.
- Confirmed chat scope: channel creation + member management for both **team** and **project** channels.
- Confirmed no presence indicators in this phase.
- Confirmed pinboard style direction: dynamic illustrated board UX.
- Confirmed tasks/projects are **optional** "open as page" with lazy page creation.

## Recent Changes (Phase 6A Foundations Started)

- Added Phase 6 enums to `src/lib/db/schema/enums.ts`: item, relation, channel scope/member role, notice status, pinboard theme.
- Added new schema module `src/lib/db/schema/collaboration.ts` with tables for:
  - items, item_relations
  - pages, page_revisions
  - pinboard_layouts_user
  - notices
  - chat_channels, chat_channel_members, chat_messages, chat_threads, chat_thread_messages
- Wired new schema module into `src/lib/db/schema/index.ts` exports and relations.
- Added foundational query modules:
  - `src/lib/db/queries/items.ts`
  - `src/lib/db/queries/pages.ts`
  - `src/lib/db/queries/pinboard.ts`
  - `src/lib/db/queries/notices.ts`
  - `src/lib/db/queries/chat.ts`
- Added first Phase 6 API routes:
  - `src/app/api/items/route.ts`
  - `src/app/api/items/[itemId]/route.ts`
  - `src/app/api/pages/[itemId]/route.ts`
  - `src/app/api/item-relations/route.ts`
  - `src/app/api/item-relations/[relationId]/route.ts`
- Added second Phase 6 API slice for pinboard/notices/chat:
  - Pinboard: `src/app/api/pinboard/layouts/*`, `src/app/api/pinboard/home-data/route.ts`
  - Notices: `src/app/api/notices/*` including pin/archive routes
  - Chat: `src/app/api/chat/channels/*`, `src/app/api/chat/messages/[messageId]/thread/route.ts`, `src/app/api/chat/threads/*`
- Expanded query helpers to support new route behavior:
  - `chat.ts`: channel lookup/update, membership lookup, thread/message lookup/listing
  - `notices.ts`: get by id, delete
  - `pinboard.ts`: delete layout
- Expanded validation schemas for pinboard/notices/chat payloads in `src/lib/utils/validation.ts`.

## Recent Changes (Phase 6 Frontend Scaffolding Started)

- Updated dashboard shell to include a new Pinboard Home presentation fed by `/api/pinboard/home-data`:
  - `src/app/dashboard/dashboard-page-client.tsx`
  - Shows prioritized tasks, team notices, and chat highlights as the primary home panel
  - Keeps DashboardEngine visible as adjacent/customizable dashboard area
- Added initial chat page:
  - `src/app/dashboard/chat/page.tsx`
  - `src/app/dashboard/chat/chat-client.tsx`
  - Supports channel listing/selection, team-channel creation, message listing, and message posting
- Added initial notices page:
  - `src/app/dashboard/notices/page.tsx`
  - `src/app/dashboard/notices/notices-client.tsx`
  - Supports notice creation, pin toggling, and archiving from UI
- Added sidebar + header navigation entries for new routes:
  - Sidebar links: `/dashboard/chat`, `/dashboard/notices`
  - Header title mapping for Chat and Notices
- Added `src/components/ui/tooltip.tsx` as a temporary no-op fallback so current sidebar tooltip imports compile without Radix tooltip dependency.
- Extended permission literals in `src/lib/auth/permissions.ts` for Phase 6 domains (pages/items/pinboard/notices/chat).
- Generated migration: `drizzle/0005_tan_rictor.sql` (+ snapshot/journal update).

## Recent Changes (PA Chat Pipeline Refinement)

### Phase 1 — Pipeline Correctness
- **Intent normalization** (`registry.ts`): Added `normalizeIntent()` with lowercase+underscore normalization and Levenshtein fuzzy matching (distance ≤ 2). Handles hyphens, casing, and typos.
- **Task name → ID resolution** (`resolve-task.ts`): NEW file. `resolveTaskId()` resolves UUID, taskTitle/taskName/title via ILIKE fuzzy search. Updated 5 handlers: update-task, complete-task, delete-task, create-comment, flag-blocker.
- **Conversation history**: Classifier and planner now receive last 4 messages for multi-turn context. Added "Multi-Turn Context" section to classification prompt for pronoun resolution and entity carry-forward.
- **Integration pre-check**: Actions with `requiresIntegration` now checked before calling AI planner. Returns clear "Connect in Settings" message without wasting an AI call.
- **Confidence gating**: Classification confidence < 0.4 triggers clarification instead of executing.

### Phase 2 — Performance
- **User name cache** (`cache/user-names.ts`): NEW file. In-memory Map with 5-minute TTL keyed by orgId. Eliminates N API calls per chat message for N-person orgs.
- **Removed redundant tier from planner prompt**: Action tiers removed from AI planner instructions since `resolveActionTier()` on server is the source of truth. `tier` now optional in `PlanResult`.

### Phase 3 — Frontend UX
- **Voice message placeholder**: Changed to "Transcribing your voice message..." with `animate-pulse` animation via `isTranscribing` prop on `PAMessage`.
- **Retry button**: Failed messages store `failedText` and render a "Retry" button that replays the original text.
- **Session mutation loading states**: `PAChatHistory` shows `Loader2` spinner during delete/rename mutations, disables row interactions while pending.

### Phase 4 — Live Validation Tests
- Added sections 7-10 to `scripts/live-tests.ts`: intent normalization tests, task name resolution tests, registry completeness verification, task handler execution with title resolution.

## Recent Changes (Frontend Architecture Refactoring)

### Phase 5A — Shared TanStack Query Hooks
- Created `src/hooks/queries/` directory with 4 hook modules + barrel index
- `use-tasks.ts`: `useTasksQuery`, `useProjectTasksQuery`, `useCreateTaskMutation`, `useUpdateTaskMutation`, `useDeleteTaskMutation`
- `use-projects.ts`: `useProjectsQuery`, `useProjectQuery`, `useCreateProjectMutation`
- `use-messages.ts`: `useMessagesQuery`, `useCreateMessageMutation`
- `use-team.ts`: `useTeamQuery`, `useCurrentOrgTeamQuery`, exported `OrgMember` type
- Updated consumers: `projects-client.tsx` (uses `useProjectsQuery`), `team-client.tsx` (uses `useCurrentOrgTeamQuery`), `messages-client.tsx` (uses `useMessagesQuery`)

### Phase 5B — tasks-client.tsx Decomposition (1606 → 675 lines)
- Extracted 5 components under `src/app/dashboard/projects/[projectId]/tasks/components/`
- `task-filters.tsx` (83L): Status/priority selectors + view mode toggle
- `task-quick-add.tsx` (60L): Inline kanban column quick-add input
- `task-kanban-board.tsx` (349L): Full DnD kanban with sortable cards + drag overlay
- `task-list-view.tsx` (135L): Tabular task list with bulk selection
- `task-detail-sheet.tsx` (468L): Detail panel with comments, activity, subtasks, delete
- `tasks-client.tsx` reduced to orchestrator (675L): state, filtering, mutations, bulk ops, create sheet

### Phase 5C — App Router Loading & Not-Found Pages
- `src/app/dashboard/loading.tsx`: Stats grid + content skeleton
- `src/app/dashboard/not-found.tsx`: 404 with dashboard link
- `src/app/dashboard/projects/[projectId]/loading.tsx`: Breadcrumb + tabs + list skeleton
- `src/app/dashboard/projects/[projectId]/not-found.tsx`: 404 with projects link
- `src/app/dashboard/my-tasks/loading.tsx`: Filters + grouped task skeleton
- `src/app/dashboard/settings/loading.tsx`: Settings sections skeleton

### Phase 5D — Shared Badge/Status Utilities (already existed)
- `src/components/shared/priority-badge.tsx`: `PriorityBadge` (urgent/high/medium/low with dark mode)
- `src/components/shared/status-badge.tsx`: `StatusBadge` (task + project statuses with dark mode)
- **Health check verified:** Database connectivity confirmed from Vercel production.
- **Vercel env vars configured:** Supabase, DATABASE_URL, ENCRYPTION_KEY, CRON_SECRET, OpenAI, Anthropic, Deepgram, Gladia.
- **Cron jobs active:** morning-briefing (15min), overdue-nudge (hourly), stale-tasks (daily 10am), weekly-digest (Fri 10am), data-cleanup (Sun 3am).
- **Remaining env vars:** REDIS_URL, OAuth credentials (Google/Microsoft/Slack), R2 storage, NEXT_PUBLIC_SENTRY_DSN.

## Recent Changes (Review Fixes)

### Phase A — Security (Critical)
- Fixed localStorage key mismatch: apiClient now reads Zustand's persisted state correctly
- OAuth CSRF: Added HMAC-SHA256 signed state parameters with 10-min TTL (oauth-state.ts)
- IDOR fixes: Integration deletion and notification mark-as-read now verify ownership
- SSE endpoint: Added org membership verification
- UUID validation: x-org-id header validated as UUID format in api-auth.ts
- Voice upload: Added 25MB file size limit and MIME type validation
- Auth callback: Prevented open redirect via `next` parameter validation
- Token decryption: Added ciphertext format validation

### Phase B — Core UX
- User display names: Created user-display.ts utility, members API returns displayName/email/avatarUrl via Supabase Admin
- PA panel: Added MainContent wrapper with responsive padding when PA is open
- Voice blob: Fixed with proper useEffect + useRef pattern (removed dead querySelector code)
- Settings navigation: Created settings/layout.tsx with 3-item sub-navigation
- Semantic tokens: Replaced hardcoded zinc colors across 12 PA/integration components
- Interactive tasks: Kanban cards clickable, task detail Sheet with Mark Complete + Open in Project
- Notifications: Made clickable with navigation and per-item mark-as-read
- Header titles: Added missing Integrations, Reports, Profile, PA Settings entries
- Status badges: Raw enum strings replaced with human-readable labels

### Phase C — Production Readiness
- Rate limiting: In-memory rate limiter on PA chat (20/min), voice (10/min), reports (10/min)
- Env validation: Created src/lib/env.ts with required/optional validation
- Lazy initialization: DB and supabaseAdmin now lazily initialized (fixes build without env vars)
- Race conditions: getOrCreatePaProfile uses INSERT ON CONFLICT, incrementInteractions uses atomic SQL
- RBAC in PA handlers: All 6 action handlers now verify project membership before executing
- AI worker: Uses resolveActionTier() instead of trusting Claude's tier
- Health check: GET /api/health endpoint with database connectivity check
- Cron fixes: Weekly digest schedule corrected, stale-tasks/morning-briefing deduplication added
- Embedding atomicity: storeEmbedding wrapped in transaction, batch deletes use inArray
- ILIKE injection: Search escapes %, _, \ characters
- Zod validation: PA chat and profile routes use .safeParse() instead of .parse()
- Deepgram null safety: Added optional chaining for empty transcription results
- Notification limit: Clamped to 1-100 range

### Phase D — Polish
- Auth branding: Sign-in/sign-up pages have Hive logo, branded headings, loading spinners
- Onboarding: Added logo, auto-generated slug, removed editable slug field
- Breadcrumbs: New Breadcrumbs component on all project sub-pages
- Toast feedback: Task and message creation show success/error toasts
- Time formatting: formatMinutes() utility replaces raw minutes display
- Empty states: Shared EmptyState component adopted across dashboard pages
- PA chat: Improved welcome message with example prompts
- Sidebar: Fixed "New Project" link to /dashboard/projects/new
- PA action cards: Human-readable labels, formatted dates, truncated UUIDs
- SSE reconnection: Exponential backoff with max 5 retries
- Activity icons: Mapped activity types to distinct lucide-react icons
- Project cards: Status labels mapped from enum values

## Recent Changes (Phase 5 — Multi-Bee Agent System & Configurable Dashboards)

### Sub-phase 5A — Schema & Bee Templates
- 8 new enums (bee_type, bee_subtype, bee_run_status, swarm_status, handover_type, signal_type, pathway, dashboard_component_type)
- 9 new tables (bee_templates, bee_instances, swarm_sessions, bee_runs, hive_context, bee_handovers, bee_signals, dashboard_layouts, component_registry)
- Extended organizations (pathway), paProfiles (assistantBeeInstanceId, swarmNotificationsEnabled, beeAutonomyOverrides), paConversations (beeInstanceId, swarmSessionId), paActions (beeRunId, swarmSessionId)
- Extended activity_type and notification_type enums with bee/dashboard events
- CRUD queries and API routes for bee templates and instances
- System bee definitions (Assistant + Admin) in system-bees.ts
- TypeScript types in src/types/bees.ts

### Sub-phase 5B — Bee Dispatcher & Swarm Execution
- Complexity assessment (heuristic scoring 0-100, threshold 30 for swarm activation)
- Bee dispatcher inserted between intent classification and action planning in PA chat
- Swarm executor with phased parallel execution, hold signal checking, result synthesis
- Hive context (append-only shared memory), handover contracts, signal system
- AI provider roles: "dispatcher" (GPT-4o-mini) and "bee-runner" (Claude Sonnet)
- Swarm API routes (list, detail, cancel, signal resolve, SSE stream)

### Sub-phase 5C — Swarm Panel UI
- Swarm panel component with SSE-driven real-time updates
- Bee avatar, run item, handover arrow, signal badge components
- Zustand store (use-swarm.ts) + SSE subscription
- Integrated into PA panel (conditionally renders when swarm active)

### Sub-phase 5D — Dashboard Engine & Pathway System
- 3 pathways (boards, lists, workspace) with 4 presets each (12 total)
- Dashboard engine with CSS Grid, lazy-loaded widgets, edit mode, slot picker
- 10 component wrappers (board, list, timeline, calendar, activity, metrics, team, files, chat, bee-panel)
- Layout resolution cascade: user override > project default > org default > preset
- Dashboard API routes (layouts CRUD, components list, pathway set)

### Sub-phase 5E — Enhanced Onboarding
- 4-step onboarding flow: create org → choose pathway → preview layout → meet assistant
- PathwayStep, LayoutStep, AssistantIntroStep components
- Progress bar and back/forward navigation

### Sub-phase 5F — Bee Settings UI & Admin Bee
- Bee template management page with create/delete/toggle/edit
- Template editor page with trigger conditions, autonomy tier, system prompt
- "Bees" nav item in sidebar with Bot icon
- Dashboard page updated to use DashboardEngine based on org pathway

### Sub-phase 5G — Polish & Integration Testing
- Bee activity logging: swarm_started, swarm_completed, handover, signal events written to activity_log
- Swarm cleanup cron (30-day retention for old swarm sessions)
- E2E tests for bee API auth enforcement, dashboard layout API auth, onboarding auth guard
- Drizzle migration generated (0001_flimsy_zarek.sql)
- 0 TypeScript errors, 70 tests pass, clean production build

## Recent Changes (QoL/UX Enhancements)

### F1 — Dark Mode Toggle
- Created ThemeProvider wrapping next-themes (attribute="class", defaultTheme="system")
- Sun/Moon cycle button in header
- Sidebar refactored from hardcoded bg-zinc-* to CSS variable sidebar tokens (bg-sidebar, text-sidebar-foreground, border-sidebar-border, bg-sidebar-accent)
- Mobile sidebar also updated

### F2 — Command Palette (Cmd+K)
- New command-palette.tsx using existing cmdk CommandDialog
- Groups: Navigation (all 8 sidebar items), Actions (New Project), Theme (Light/Dark/System)
- Search trigger button with ⌘K hint in header

### F3 — Keyboard Shortcuts
- use-keyboard-shortcuts.ts hook with input focus guard
- Shortcuts: ? (help dialog), g→d/p/t (go to pages), n (context-dependent new)
- KeyboardShortcutsProvider mounted in dashboard layout

### F4 — Task Quick-Add in Kanban
- Inline "+ Add task" button at bottom of each kanban column
- Enter to create (with status matching column), Escape/blur to cancel

### F5 — Comments & Activity on Task Detail
- Tabs (Comments + Activity) added to task detail Sheet
- Comments: fetch/post via /api/tasks/{id}/comments, textarea + send button
- Activity: fetch via /api/activity?taskId={id}, timeline with icons + descriptions

### F6 — Due Date Warnings
- due-date-styles.ts: getDueDateClassName() and isOverdue() helpers using getTaskTimeGroup()
- Overdue → red + AlertCircle icon, today → orange, tomorrow → yellow
- Applied across tasks-client (list + kanban), my-tasks-client, board-widget

### F7 — Subtask UI
- New GET /api/tasks/{id}/subtasks endpoint
- Subtask list in detail sheet with status dots, clickable to navigate
- Inline "Add subtask" input creating via POST /api/tasks with parentTaskId
- Subtask count badges on kanban cards (computed from loaded tasks array)

### F8+F9 — Drag-and-Drop + Multi-File Upload
- onDragOver/onDragEnter/onDragLeave/onDrop handlers on files widget
- Blue dashed border drop overlay with "Drop files here"
- multiple attribute on file input
- uploadMultipleFiles() with Promise.allSettled and summary toast

### F10 — Notification Enhancement
- "View all notifications" link at bottom of notification popover

## Recent Changes (Phase 7 — Workspaces, Agent Channels, @Mentions, PM Agent, Check-ins)

### Phase A — Workspaces
- New schema: `workspaces`, `workspace_members` tables in `src/lib/db/schema/workspaces.ts`
- Added `workspaceId` FK to `projects`, `chatChannels`, `beeInstances`
- Extended `channel_scope` enum: `workspace`, `agent`
- Workspace CRUD queries in `src/lib/db/queries/workspaces.ts`
- API routes: `/api/workspaces` CRUD + members management
- Permissions: `workspace:create/manage/view/invite/delete` + `hasWorkspacePermission()`
- Workspace switcher in sidebar, Zustand store `use-workspace.ts`
- Migration: `drizzle/0014_workspaces.sql`

### Phase B — Agent Communication Channel
- Added `primaryChannelId` to `pa_profiles`
- Added `isAgentMessage`, `agentBeeInstanceId`, `agentMetadata` to `chat_messages`
- Agent messenger service: `src/lib/agents/channel-messenger.ts` with rate limiting
- API: `/api/pa/primary-channel` GET/PUT
- Migration: `drizzle/0015_agent_channels.sql`

### Phase C — @Mentions System
- New `mentions` table with `mentionType`/`mentionSourceType` enums
- Mention parser: `src/lib/utils/mention-parser.ts` (@user, @agent, @page:title)
- Mention handler: `src/lib/agents/mention-handler.ts` (stores, notifies, enqueues agent mentions)
- Agent mention worker: `src/lib/queue/workers/agent-mention.worker.ts`
- Autocomplete API: `/api/mentions/search`
- UI: `src/components/chat/mention-autocomplete.tsx`
- Migration: `drizzle/0016_mentions.sql`

### Phase D — Autonomous PM Agent
- New tables: `agent_schedules`, `agent_reports`
- Workspace metrics: `src/lib/data/workspace-metrics.ts`
- Schedule worker: `src/lib/queue/workers/agent-schedule.worker.ts` (standups, weekly reports, checkin sweeps)
- Cron: `/api/cron/agent-schedules` (15 min)
- PM dashboard: `src/app/dashboard/agents/pm/page.tsx`
- Migration: `drizzle/0017_pm_agent.sql`

### Phase E — Smart Check-ins
- New tables: `agent_checkins`, `checkin_preferences`
- Scheduler: `src/lib/agents/checkin-scheduler.ts` (priority + deadline based)
- Question generator: `src/lib/agents/checkin-questions.ts` (Claude Sonnet)
- Response processor: `src/lib/agents/checkin-response-processor.ts` (GPT-4o-mini extraction)
- Check-in worker: `src/lib/queue/workers/agent-checkin.worker.ts`
- Expiry cron: `/api/cron/checkin-expiry`
- API: `/api/checkins` CRUD + respond + preferences
- Settings UI: `src/app/dashboard/settings/checkins/page.tsx`
- Migration: `drizzle/0018_checkins.sql`

### Infrastructure
- 3 new BullMQ queues: agent-mention, agent-schedule, agent-checkin
- 3 new workers registered in `scripts/worker.ts` (total: 16)
- 6 new action types in registry (total: 35)
- 8 new activity type descriptions
- Feature flags: workspaces, agentChannels, pmAgent

## Active Decisions & Considerations

- **Auth:** Using Supabase Auth instead of Clerk. All API routes use `authenticateRequest()` from `@/lib/auth/api-auth`.
- **Lazy client initialization:** DB, supabaseAdmin, OpenAI, Anthropic, Deepgram, R2, and Redis clients are lazily initialized via Proxy or getter pattern.
- **OAuth state:** HMAC-SHA256 signed with ENCRYPTION_KEY, base64url encoded, 10-min TTL.
- **Rate limiting:** In-memory for now; upgrade to @upstash/ratelimit for multi-instance production.
- **SSE limitation:** Still in-process singleton; needs Redis pub/sub or Supabase Realtime for multi-instance.
- **apiClient pattern:** Reads orgId from Zustand persisted state under "hive-org" key, handles FormData correctly.
- **Landing page pricing:** Placeholder pricing ($0 Team / $12 Pro) — adjust before launch.
- **Phase 6 editor:** Tiptap + ProseMirror chosen for Notion-like extensibility and typed custom nodes.
- **Phase 6 chat model:** Team-scoped and project-scoped channels with member controls and thread support.
- **Phase 6 collaboration posture:** Async-first; no online presence or typing indicators in initial release.
- **Phase 6 page model:** Tasks/projects can open into pages optionally; pages are not mandatory for every item.
- **Phase 6 implementation status:** Foundations in progress (schema + query layer started); APIs/UI not started yet.
