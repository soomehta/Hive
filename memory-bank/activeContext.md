# Active Context: Hive

## Current Focus

- **DEPLOYED TO PRODUCTION.** Live at https://hive-app-beryl.vercel.app
- **All 5 phases + QoL + prod hardening + database + deployment + test coverage: COMPLETE.** 70+ routes, 0 TypeScript errors, 306 unit tests pass, 112 e2e tests pass.
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

## Active Decisions & Considerations

- **Auth:** Using Supabase Auth instead of Clerk. All API routes use `authenticateRequest()` from `@/lib/auth/api-auth`.
- **Lazy client initialization:** DB, supabaseAdmin, OpenAI, Anthropic, Deepgram, R2, and Redis clients are lazily initialized via Proxy or getter pattern.
- **OAuth state:** HMAC-SHA256 signed with ENCRYPTION_KEY, base64url encoded, 10-min TTL.
- **Rate limiting:** In-memory for now; upgrade to @upstash/ratelimit for multi-instance production.
- **SSE limitation:** Still in-process singleton; needs Redis pub/sub or Supabase Realtime for multi-instance.
- **apiClient pattern:** Reads orgId from Zustand persisted state under "hive-org" key, handles FormData correctly.
- **Landing page pricing:** Placeholder pricing ($0 Team / $12 Pro) — adjust before launch.
