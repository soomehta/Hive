# Hive — Phases 2-4 Implementation Specification

## 0. Preamble

### Phase 1 Summary (Complete)

Phase 1 (Foundation) is fully implemented and verified:
- **Auth:** Supabase Auth (browser/server/middleware/admin clients) — NOT Clerk as PRD states
- **DB:** Drizzle ORM, 10 tables, 6 enums, PostgreSQL via Supabase
- **API Routes:** 15 route files covering orgs, projects, tasks, messages, activity, notifications
- **Frontend:** 12 pages, 15+ components, dashboard layout with sidebar + header
- **Patterns:** `authenticateRequest()` for API auth, `x-org-id` header for org scoping, `logActivity()` + `createNotification()` retrofitted into all CRUD routes
- **Build:** 0 TypeScript errors, 28 routes, 11 passing tests

### Auth Deviation from PRD

The PRD references Clerk (`auth()` from `@clerk/nextjs/server`). Our implementation uses Supabase Auth:
- `getAuthUser()` from `@/lib/auth/get-user` replaces `auth()` from Clerk
- `authenticateRequest(req)` from `@/lib/auth/api-auth` handles API route auth + org membership
- User IDs are Supabase UUIDs (stored as `varchar(255)`)
- No Clerk webhook needed — Supabase handles user management
- All Phase 2-4 API routes MUST use `authenticateRequest()`, NOT Clerk's `auth()`

### Established Patterns (Reuse in All New Routes)

```typescript
// API Route Pattern (src/app/api/*/route.ts)
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { logActivity } from "@/lib/db/queries/activity";
import { createNotification } from "@/lib/notifications/in-app";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    // ... validate, execute, log activity, notify ...
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

---

## 1. Database Schema Additions

### 1.1 New Enums

Add to `src/lib/db/schema.ts`:

```typescript
export const actionTierEnum = pgEnum("action_tier", [
  "auto_execute", "execute_notify", "draft_approve", "suggest_only"
]);

export const actionStatusEnum = pgEnum("action_status", [
  "pending", "approved", "rejected", "executed", "failed", "expired"
]);

export const actionTypeEnum = pgEnum("action_type", [
  "create_task", "update_task", "complete_task", "delete_task",
  "create_comment", "post_message", "flag_blocker",
  "calendar_block", "calendar_event", "calendar_reschedule",
  "send_email", "send_slack",
  "generate_report", "generate_briefing",
  "check_tasks", "check_calendar", "check_email",
  "check_project_status", "check_workload"
]);

export const integrationProviderEnum = pgEnum("integration_provider", [
  "google", "microsoft", "slack"
]);

export const autonomyModeEnum = pgEnum("autonomy_mode", [
  "autopilot", "copilot", "manual"
]);

export const verbosityEnum = pgEnum("verbosity", [
  "concise", "detailed", "bullet_points"
]);

export const formalityEnum = pgEnum("formality", [
  "casual", "professional", "mixed"
]);
```

### 1.2 New Tables

**PA Profiles:**
```typescript
export const paProfiles = pgTable("pa_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  autonomyMode: autonomyModeEnum("autonomy_mode").notNull().default("copilot"),
  verbosity: verbosityEnum("verbosity").notNull().default("concise"),
  formality: formalityEnum("formality").notNull().default("professional"),
  morningBriefingEnabled: boolean("morning_briefing_enabled").notNull().default(true),
  morningBriefingTime: varchar("morning_briefing_time", { length: 5 }).default("08:45"),
  endOfDayDigestEnabled: boolean("end_of_day_digest_enabled").notNull().default(false),
  endOfDayDigestTime: varchar("end_of_day_digest_time", { length: 5 }).default("17:30"),
  weeklyDigestEnabled: boolean("weekly_digest_enabled").notNull().default(true),
  weeklyDigestDay: integer("weekly_digest_day").default(5), // 0=Sun, 5=Fri
  timezone: varchar("timezone", { length: 100 }).notNull().default("UTC"),
  workingHoursStart: varchar("working_hours_start", { length: 5 }).default("09:00"),
  workingHoursEnd: varchar("working_hours_end", { length: 5 }).default("17:00"),
  languagePreferences: jsonb("language_preferences").default(["en"]),
  notificationChannel: varchar("notification_channel", { length: 50 }).default("in_app"),
  actionOverrides: jsonb("action_overrides").default({}),
  avgTasksPerWeek: real("avg_tasks_per_week"),
  peakHours: jsonb("peak_hours"),
  commonBlockers: jsonb("common_blockers"),
  taskDurationAccuracy: real("task_duration_accuracy"),
  updateHabits: text("update_habits"),
  totalInteractions: integer("total_interactions").default(0),
  commonIntents: jsonb("common_intents"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: uniqueIndex("pa_profiles_user_org_idx").on(table.userId, table.orgId),
}));
```

**PA Conversations:**
```typescript
export const paConversations = pgTable("pa_conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 20 }).notNull(), // 'user' | 'assistant' | 'system'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // { voiceInput: true, audioUrl, intent }
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userOrgIdx: index("pa_conversations_user_org_idx").on(table.userId, table.orgId),
  createdAtIdx: index("pa_conversations_created_at_idx").on(table.createdAt),
}));
```

**PA Actions:**
```typescript
export const paActions = pgTable("pa_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  conversationId: uuid("conversation_id").references(() => paConversations.id),
  actionType: actionTypeEnum("action_type").notNull(),
  tier: actionTierEnum("tier").notNull(),
  status: actionStatusEnum("status").notNull().default("pending"),
  plannedPayload: jsonb("planned_payload").notNull(),
  executedPayload: jsonb("executed_payload"),
  executionResult: jsonb("execution_result"),
  userEditedPayload: jsonb("user_edited_payload"),
  rejectionReason: text("rejection_reason"),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  executedAt: timestamp("executed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index("pa_actions_user_idx").on(table.userId),
  statusIdx: index("pa_actions_status_idx").on(table.status),
}));
```

**PA Corrections:**
```typescript
export const paCorrections = pgTable("pa_corrections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  actionId: uuid("action_id").references(() => paActions.id),
  originalOutput: text("original_output").notNull(),
  correctedOutput: text("corrected_output").notNull(),
  correctionType: varchar("correction_type", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Integrations (OAuth Tokens):**
```typescript
export const integrations = pgTable("integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  provider: integrationProviderEnum("provider").notNull(),
  accessToken: text("access_token").notNull(), // encrypted at rest
  refreshToken: text("refresh_token"), // encrypted at rest
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  scopes: jsonb("scopes"),
  providerAccountId: varchar("provider_account_id", { length: 255 }),
  providerAccountEmail: varchar("provider_account_email", { length: 255 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userProviderIdx: uniqueIndex("integrations_user_provider_idx").on(table.userId, table.orgId, table.provider),
}));
```

**Voice Transcripts:**
```typescript
export const voiceTranscripts = pgTable("voice_transcripts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  audioUrl: text("audio_url"),
  audioFormat: varchar("audio_format", { length: 20 }),
  durationMs: integer("duration_ms"),
  transcript: text("transcript").notNull(),
  language: varchar("language", { length: 10 }),
  confidence: real("confidence"),
  provider: varchar("provider", { length: 50 }).notNull(),
  rawResponse: jsonb("raw_response"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

**Embeddings (pgvector):**
```typescript
import { vector } from "drizzle-orm/pg-core";

export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  sourceType: varchar("source_type", { length: 50 }).notNull(),
  sourceId: uuid("source_id").notNull(),
  content: text("content").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index("embeddings_org_idx").on(table.orgId),
  sourceIdx: index("embeddings_source_idx").on(table.sourceType, table.sourceId),
}));
```

**Scheduled Reports:**
```typescript
export const scheduledReports = pgTable("scheduled_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: uuid("org_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  createdBy: varchar("created_by", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  prompt: text("prompt").notNull(),
  schedule: varchar("schedule", { length: 50 }).notNull(),
  deliveryChannel: varchar("delivery_channel", { length: 50 }).notNull(),
  recipientUserIds: jsonb("recipient_user_ids").notNull(),
  lastRunAt: timestamp("last_run_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### 1.3 Migration SQL (Post-Drizzle)

Add to `scripts/post-migrate.sql`:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS embeddings_vector_idx
  ON embeddings USING hnsw (embedding vector_cosine_ops);

-- updated_at triggers for new tables
CREATE TRIGGER update_pa_profiles_updated_at BEFORE UPDATE ON pa_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON integrations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

---

## 2. New Dependencies

```bash
npm install @deepgram/sdk openai @anthropic-ai/sdk @aws-sdk/client-s3 googleapis @microsoft/microsoft-graph-client @slack/web-api
```

| Package | Purpose | Phase |
|---------|---------|-------|
| `@deepgram/sdk` | Nova-3 transcription | 2 |
| `openai` | GPT-4o-mini intent classification + text-embedding-3-small | 2 |
| `@anthropic-ai/sdk` | Claude Sonnet for planning, reports, drafting | 2 |
| `@aws-sdk/client-s3` | Cloudflare R2 audio file storage | 2 |
| `googleapis` | Google Calendar + Gmail APIs | 3 |
| `@microsoft/microsoft-graph-client` | Outlook Calendar + Mail | 3 |
| `@slack/web-api` | Slack Web API | 3 |

Already installed: `bullmq`, `ioredis`, `resend`, `nanoid`.

---

## 3. Phase 2 — Voice + PA Core

### 3.1 Voice Recording (Frontend)

**`src/hooks/use-voice-recorder.ts`**

MediaRecorder API hook:
- States: `idle`, `recording`, `processing`
- `startRecording()` — requests microphone, begins recording (webm/opus for Chrome/Firefox, mp4/aac for Safari)
- `stopRecording()` — stops recording, produces `audioBlob`
- Auto-stop after 2 minutes of recording
- Silence detection: auto-stop after 3 seconds of silence
- Exports: `{ startRecording, stopRecording, isRecording, audioBlob, duration, error }`

**`src/components/pa/pa-voice-recorder.tsx`**

Three visual states:
```
Idle:       [Mic icon]  "Tap to speak to your PA"
Recording:  [Stop icon] [waveform animation] "0:04"
Processing: [Spinner]   "Transcribing..."
```

On stop: sends audio to `/api/voice/transcribe` via FormData, then passes transcript to PA chat.

### 3.2 Transcription API

**`src/lib/voice/deepgram.ts`**
```typescript
export async function transcribeAudio(audioBuffer: Buffer, options: {
  mimeType: string;
  languageHints?: string[];
  keywords?: string[]; // org-specific terms for accuracy
}): Promise<{
  transcript: string;
  confidence: number;
  language: string;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
}>
```

Config: `model: "nova-3"`, `smart_format: true`, `diarize: false`, `filler_words: false`.

**`src/lib/voice/gladia.ts`**

Same interface as Deepgram. Fallback provider using Gladia Solaria API.

**`src/app/api/voice/transcribe/route.ts`** — POST
1. `authenticateRequest(req)` — auth
2. Accept `FormData` with `audio` field
3. Upload audio to R2 for storage/debugging
4. Call Deepgram Nova-3 with custom keywords (project names, member names from org)
5. If confidence < 0.7 or Deepgram fails → retry with Gladia Solaria
6. Insert into `voiceTranscripts` table
7. Return `{ id, transcript, language, confidence, durationMs }`

**`src/app/api/voice/process/route.ts`** — POST
1. Accept `{ transcriptId }` or `{ text }` (for typed messages)
2. Load PA profile, user's projects, recent tasks, team members
3. Call intent classifier (GPT-4o-mini)
4. Route by intent:
   - Read intents → query DB, format response via Claude
   - Mutation intents → action system (registry → tier → execute or draft)
   - Report intents → report engine
5. Store PA conversation entries
6. Return `{ message, action?, report?, intent, entities }`

### 3.3 Intent Classification

**`src/lib/ai/intent-classifier.ts`**
```typescript
export async function classifyIntent(
  transcript: string,
  context: {
    userName: string;
    projects: Array<{ id: string; name: string }>;
    teamMembers: Array<{ id: string; name: string }>;
    recentTasks: Array<{ id: string; title: string; status: string }>;
  }
): Promise<{
  intent: string; // ActionType
  entities: Record<string, any>;
  confidence: number;
}>
```

Uses OpenAI GPT-4o-mini with `response_format: { type: "json_object" }`.

**`src/lib/ai/prompts/intent-classification.ts`**

System prompt from PRD §10 — classifies into 19 intent types with entity extraction. Includes fuzzy matching rules for project/member names, relative date parsing, duration parsing.

### 3.4 PA Chat

**`src/app/api/pa/chat/route.ts`** — POST

Main PA interaction endpoint. Request: `{ message: string, voiceTranscriptId?: string }`.

Processing pipeline:
1. Load PA profile via `getOrCreatePaProfile(userId, orgId)`
2. Load last 10 conversation messages for continuity
3. Classify intent via `classifyIntent()`
4. Route:
   - **Read intents:** Query DB → Claude formats natural response → return immediately
   - **Mutation intents:** Resolve tier → auto_execute/execute_notify: execute immediately → draft_approve: create pending action → return response
   - **Report intents:** Call report engine → return narrative
5. Store conversation (user message + assistant response) in `paConversations`
6. Increment `totalInteractions`, update `commonIntents` in PA profile

Response: `{ message: string, action?: PAAction, report?: { narrative, data } }`

**`src/lib/ai/action-planner.ts`**

Uses Claude Sonnet to plan complex actions (Tier 3+):
```typescript
export async function planAction(
  intent: string,
  entities: Record<string, any>,
  context: { user: any; paProfile: any; project?: any; recentActivity?: any[] }
): Promise<{
  tier: string;
  payload: Record<string, any>;
  confirmationMessage: string;
  draftPreview?: string;
}>
```

**`src/lib/ai/prompts/action-planning.ts`** — System prompt for Claude Sonnet action planning.

### 3.5 Action System (Graduated Autonomy)

**`src/lib/actions/registry.ts`**

```typescript
export const ACTION_REGISTRY: Record<string, {
  defaultTier: string;
  handler: string;
  requiresIntegration?: string;
  description: string;
}> = {
  // Tier 1: Auto-execute (read-only queries)
  check_tasks:          { defaultTier: "auto_execute", handler: "query", description: "Check task list" },
  check_calendar:       { defaultTier: "auto_execute", handler: "query", description: "Check calendar", requiresIntegration: "google" },
  check_email:          { defaultTier: "auto_execute", handler: "query", description: "Check emails", requiresIntegration: "google" },
  check_project_status: { defaultTier: "auto_execute", handler: "query", description: "Check project status" },
  check_workload:       { defaultTier: "auto_execute", handler: "query", description: "Check team workload" },

  // Tier 2: Execute + Notify
  create_task:      { defaultTier: "execute_notify", handler: "create-task", description: "Create a task" },
  update_task:      { defaultTier: "execute_notify", handler: "update-task", description: "Update task" },
  complete_task:    { defaultTier: "execute_notify", handler: "complete-task", description: "Mark task done" },
  create_comment:   { defaultTier: "execute_notify", handler: "create-comment", description: "Add comment" },
  flag_blocker:     { defaultTier: "execute_notify", handler: "flag-blocker", description: "Flag blocker" },
  calendar_block:   { defaultTier: "execute_notify", handler: "calendar-block", description: "Block time", requiresIntegration: "google" },
  generate_report:  { defaultTier: "execute_notify", handler: "generate-report", description: "Generate report" },
  generate_briefing:{ defaultTier: "execute_notify", handler: "generate-report", description: "Generate briefing" },

  // Tier 3: Draft + Approve
  post_message:        { defaultTier: "draft_approve", handler: "post-message", description: "Post message" },
  calendar_event:      { defaultTier: "draft_approve", handler: "calendar-event", description: "Schedule meeting", requiresIntegration: "google" },
  calendar_reschedule: { defaultTier: "draft_approve", handler: "calendar-event", description: "Reschedule meeting", requiresIntegration: "google" },
  send_email:          { defaultTier: "draft_approve", handler: "send-email", description: "Send email", requiresIntegration: "google" },
  send_slack:          { defaultTier: "draft_approve", handler: "send-slack", description: "Send Slack message", requiresIntegration: "slack" },
};
```

**`resolveActionTier(actionType, paProfile, context?)`** — Resolution order:
1. Check `paProfile.actionOverrides[actionType]`
2. If autonomy mode is `manual` → always `draft_approve`
3. If `autopilot` → use default tier (Tier 3 still requires approval)
4. If `copilot` (default) → default tier, with special rule: create_task for someone else → bump to `draft_approve`

**`src/lib/actions/executor.ts`**

`executeAction(action)`:
1. Check required integration is connected + token not expired
2. Refresh OAuth token if needed
3. Dispatch to handler: create-task, update-task, complete-task, create-comment, post-message, flag-blocker, calendar-block, calendar-event, send-email, send-slack, generate-report
4. Return `{ success, result?, error? }`

**Action Handlers** — `src/lib/actions/handlers/`:
- `create-task.ts` — calls `createTask()` from existing queries
- `update-task.ts` — calls `updateTask()` from existing queries
- `complete-task.ts` — calls `updateTask()` with `{ status: "done" }`
- `create-comment.ts` — calls `createTaskComment()` from existing queries
- `post-message.ts` — calls `createMessage()` from existing queries
- `flag-blocker.ts` — calls `updateTask()` with `{ isBlocked: true, blockedReason }`
- `calendar-block.ts` — calls Google/Microsoft calendar API (Phase 3 stub initially)
- `calendar-event.ts` — calls Google/Microsoft calendar API (Phase 3 stub)
- `send-email.ts` — calls Google/Microsoft mail API (Phase 3 stub)
- `send-slack.ts` — calls Slack Web API (Phase 3 stub)
- `generate-report.ts` — calls report engine (Phase 4 stub initially)

### 3.6 Action API Routes

**`src/app/api/pa/actions/route.ts`**
- GET — list pending actions for current user
- POST — manually create an action

**`src/app/api/pa/actions/[actionId]/route.ts`**
- PATCH — `{ decision: "approve" | "reject" | "edit", editedPayload?, rejectionReason? }`
  - approve → execute with `plannedPayload`, set status `executed`
  - edit → execute with `editedPayload`, store `userEditedPayload`, create PA correction
  - reject → set status `rejected`, store `rejectionReason`, create PA correction

### 3.7 Database Queries

**`src/lib/db/queries/pa-profiles.ts`**
- `getOrCreatePaProfile(userId, orgId)` — returns existing or creates default
- `getPaProfile(userId, orgId)`
- `updatePaProfile(userId, orgId, updates)`

**`src/lib/db/queries/pa-actions.ts`**
- `createPaAction(data)`
- `getPendingActions(userId, orgId)`
- `getPaAction(actionId)`
- `updatePaAction(actionId, updates)`
- `expireStaleActions()` — set `status = "expired"` where `status = "pending" AND expires_at < NOW()`

### 3.8 PA UI Components

All in `src/components/pa/`:

| File | Purpose |
|------|---------|
| `pa-panel.tsx` | Slide-out panel (400px, right side), always accessible via floating button |
| `pa-chat.tsx` | Chat interface: message history (scrollable) + input |
| `pa-message.tsx` | Message bubble — user (right-aligned, primary bg) vs assistant (left-aligned, muted bg) |
| `pa-input.tsx` | Text input + mic button + send button |
| `pa-voice-recorder.tsx` | Recording UI with waveform, uses `use-voice-recorder` hook |
| `pa-action-card.tsx` | Inline action card: type + payload preview + Approve/Edit/Reject buttons |
| `pa-briefing-card.tsx` | Morning briefing card for dashboard home |
| `pa-report-view.tsx` | Report output with narrative text + optional data display |

**`src/hooks/use-pa.ts`** — Zustand or React state for PA panel: open/closed, messages, loading state. TanStack Query mutations for `/api/pa/chat`.

### 3.9 Frontend Modifications

**`src/app/dashboard/layout.tsx`** — Add PA panel toggle (floating button, bottom-right) and `<PAPanel />` component.

**`src/components/layout/sidebar.tsx`** — Add nav items:
- Reports (`/dashboard/reports`) — with `BarChart3` icon
- Integrations (`/dashboard/integrations`) — with `Plug` icon

**`src/app/dashboard/settings/pa/page.tsx`** — PA Settings page:
- Autonomy Mode (radio: Auto-pilot / Co-pilot / Manual)
- Per-Action Overrides (table of action types → dropdown tier selector)
- Briefings (checkboxes + time pickers: morning briefing, end-of-day, weekly)
- Communication Style (selects: verbosity, formality)
- Working Hours (time inputs: start/end + timezone select)
- Languages (primary select + add more)
- Connected Accounts (integration cards with connect/disconnect)

---

## 4. Phase 3 — Integrations

### 4.1 OAuth Infrastructure

**`src/lib/integrations/oauth.ts`**
```typescript
// Token encryption using AES-256-GCM with ENCRYPTION_KEY env var
export function encryptToken(plaintext: string): string
export function decryptToken(ciphertext: string): string

// Auto-refresh: called before any API call to an integration
export async function refreshOAuthToken(integration: Integration): Promise<void>
// - Calls provider's token refresh endpoint
// - Updates access_token + token_expires_at in DB
// - If refresh fails: mark integration as inactive, notify user

// Helper: get active integration with auto-refresh
export async function getActiveIntegration(
  userId: string, orgId: string, provider: string
): Promise<Integration | null>
```

### 4.2 Google Integration

**API Routes:**
- `src/app/api/integrations/google/auth/route.ts` — GET: redirect to Google OAuth consent screen
  - Scopes: `calendar`, `calendar.events`, `gmail.readonly`, `gmail.send`, `gmail.compose`
- `src/app/api/integrations/google/callback/route.ts` — GET: handle OAuth callback, encrypt + store tokens
- `src/app/api/integrations/google/calendar/route.ts` — GET: list events, POST: create event
- `src/app/api/integrations/google/mail/route.ts` — GET: unread emails, POST: send email

**Library Wrappers:**

`src/lib/integrations/google-calendar.ts`:
```typescript
export async function getEvents(userId: string, orgId: string, params: {
  timeMin: string; timeMax: string; maxResults?: number;
}): Promise<CalendarEvent[]>

export async function createEvent(userId: string, orgId: string, event: {
  summary: string; description?: string; startTime: string; endTime: string;
  attendees?: string[]; location?: string;
}): Promise<CalendarEvent>

export async function updateEvent(userId: string, orgId: string, eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent>
export async function deleteEvent(userId: string, orgId: string, eventId: string): Promise<void>
```

`src/lib/integrations/google-mail.ts`:
```typescript
export async function getUnreadEmails(userId: string, orgId: string, params: {
  maxResults?: number; query?: string;
}): Promise<Array<{ id: string; from: string; subject: string; snippet: string; date: string }>>

export async function sendEmail(userId: string, orgId: string, email: {
  to: string; cc?: string; subject: string; body: string; htmlBody?: string;
}): Promise<{ messageId: string }>
```

### 4.3 Microsoft Integration

Same pattern as Google, using Microsoft Graph API:
- `src/app/api/integrations/microsoft/auth/route.ts` — GET: redirect to Microsoft consent
- `src/app/api/integrations/microsoft/callback/route.ts` — GET: handle callback
- `src/app/api/integrations/microsoft/calendar/route.ts` — GET `/me/calendarview`, POST `/me/events`
- `src/app/api/integrations/microsoft/mail/route.ts` — GET `/me/messages`, POST `/me/sendMail`
- `src/lib/integrations/microsoft-calendar.ts` — same interface as google-calendar
- `src/lib/integrations/microsoft-mail.ts` — same interface as google-mail

### 4.4 Slack Integration

- `src/app/api/integrations/slack/auth/route.ts` — GET: redirect to Slack OAuth
- `src/app/api/integrations/slack/callback/route.ts` — GET: handle callback
- `src/app/api/integrations/slack/send/route.ts` — POST: send message

`src/lib/integrations/slack.ts`:
```typescript
export async function sendMessage(userId: string, orgId: string, params: {
  channel?: string; userId?: string; text: string;
}): Promise<{ ts: string; channel: string }>
```

### 4.5 Database Queries

**`src/lib/db/queries/integrations.ts`**
- `getIntegration(userId, orgId, provider)`
- `getUserIntegrations(userId, orgId)` — list all
- `createIntegration(data)` — with encrypted tokens
- `updateIntegration(id, updates)`
- `deleteIntegration(id)`
- `deactivateIntegration(id)` — mark inactive on refresh failure

### 4.6 Integrations Frontend

**`src/app/dashboard/integrations/page.tsx`** — Connection management page with cards for Google, Microsoft, Slack.

**`src/components/integrations/integration-card.tsx`** — Card per provider: logo, name, status (Connected/Disconnected), connected email, Connect/Disconnect button.

**`src/components/integrations/oauth-button.tsx`** — "Connect with Google" style button that navigates to the OAuth auth route.

### 4.7 Activate Action Handler Stubs

Update all Phase 2 action handler stubs to call real integration wrappers:
- `calendar-block.ts` → calls `google-calendar.createEvent()` or `microsoft-calendar.createEvent()`
- `calendar-event.ts` → same
- `send-email.ts` → calls `google-mail.sendEmail()` or `microsoft-mail.sendEmail()`
- `send-slack.ts` → calls `slack.sendMessage()`

---

## 5. Phase 4 — Reporting + Proactive

### 5.1 Report Engine

**`src/lib/ai/report-generator.ts`**
```typescript
export async function generateReport(
  question: string,
  data: ReportData,
  context: { role: string; name: string; date: string }
): Promise<{ narrative: string; data: ReportData; generatedAt: string }>
```

Data aggregation:
- Task counts by status, assignee, priority
- Completion rate (completed / total in timeframe)
- Overdue tasks count + details
- Blockers (blocked tasks)
- Activity log entries for timeframe
- Velocity (tasks completed per week, trailing 4 weeks)
- Upcoming deadlines
- Workload by person

Role-aware context:
- IC → focus on their tasks + immediate team
- Team lead → team metrics, blockers, velocity
- Admin/Owner → org-wide, business impact

**`src/lib/ai/prompts/report-generation.ts`** — System prompt from PRD §12. Key rules: lead with most important insight, be specific (name people/tasks/dates), give probabilities for predictions, always mention blockers and risks, end with recommended action, keep under 300 words, conversational tone.

**`src/app/api/pa/report/route.ts`** — POST
- Request: `{ question: string, projectId?: string, format?: "narrative" | "structured" | "data_only" }`
- Classify report type → build queries → aggregate data → Claude generates narrative
- Response: `{ narrative, data, generatedAt }`

### 5.2 Morning Briefing

**`src/lib/ai/briefing-generator.ts`**
```typescript
export async function generateBriefing(context: {
  userName: string; firstName: string; date: string; dayOfWeek: string; timezone: string;
  todayTasks: any[]; weekTasks: any[]; overdueTasks: any[];
  meetings: any[]; recentActivity: any[]; blockers: any[];
}): Promise<{ briefing: string; todaysTasks: any[]; todaysMeetings: any[]; blockers: any[]; unreadCount: number }>
```

**`src/lib/ai/prompts/briefing.ts`** — System prompt from PRD §12. Rules: warm but efficient, prioritize what's most important today, mention upcoming deadlines, flag blockers/risks, keep under 200 words.

**`src/app/api/pa/briefing/route.ts`** — GET
- Aggregates: today's tasks, calendar events (if integration connected), unread notifications, blockers, recent activity, overdue tasks
- Returns cached briefing if generated today, otherwise generates fresh

### 5.3 Email & Message Drafting

**`src/lib/ai/email-drafter.ts`** — Claude generates email drafts based on intent + entities.
**`src/lib/ai/message-drafter.ts`** — Claude generates team message drafts.
**`src/lib/ai/prompts/drafting.ts`** — Shared drafting prompts.

### 5.4 Cron Jobs

All cron routes are secured with `CRON_SECRET` verification:
```typescript
if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
  return Response.json({ error: "Unauthorized" }, { status: 401 });
}
```

**`src/app/api/cron/morning-briefing/route.ts`** — POST
- Schedule: every 15 minutes
- For each user with `morningBriefingEnabled` where current time (user's timezone) ≈ `morningBriefingTime` (±15 min window):
  1. Generate briefing
  2. Create notification (type `pa_briefing`)
  3. Deliver via preferred channel (in_app, email, slack)

**`src/app/api/cron/overdue-nudge/route.ts`** — POST
- Schedule: every hour
- Find tasks: `dueDate < now AND status NOT IN ("done", "cancelled")`
- Deduplicate: skip if nudged within last 24 hours
- Create notification: "'{task title}' was due {relative time}. Want me to update the deadline or mark it done?"

**`src/app/api/cron/stale-tasks/route.ts`** — POST
- Schedule: daily at 10:00 UTC
- Find tasks: `status = "in_progress" AND updatedAt < 7 days ago`
- Create notification: "'{task title}' hasn't been updated in {N} days. Is it still in progress?"

**`src/app/api/cron/weekly-digest/route.ts`** — POST
- Schedule: Fridays (configurable per user)
- For each user with `weeklyDigestEnabled`:
  1. Get all user's projects
  2. Per project: completion rate, new blockers, milestones
  3. Personal: tasks completed, tasks carried over
  4. Team highlights
  5. Next week preview
  6. Generate narrative with Claude
  7. Deliver via preferred channel

### 5.5 Embeddings + RAG

**`src/lib/ai/embeddings.ts`**
```typescript
export async function generateEmbedding(text: string): Promise<number[]>
// Uses OpenAI text-embedding-3-small (1536 dimensions)

export async function storeEmbedding(
  orgId: string, sourceType: string, sourceId: string, content: string
): Promise<void>
// Generate embedding + insert into embeddings table
```

**`src/lib/ai/rag.ts`**
```typescript
export async function queryContext(
  orgId: string, queryText: string, options?: { limit?: number; sourceTypes?: string[] }
): Promise<Array<{ sourceType: string; sourceId: string; content: string; similarity: number }>>
// Embed query → cosine similarity search via pgvector → return relevant content
```

**Integration points:** Retrofit embedding generation into existing CRUD routes as side effects (via BullMQ jobs):
- Task create/update (title + description)
- Message create (content)
- Comment create (content)
- Project create (name + description)

### 5.6 BullMQ Workers

**`src/lib/queue/index.ts`** — BullMQ queue setup with Upstash Redis connection.

**`src/lib/queue/jobs.ts`** — Job type definitions:
```typescript
type JobType =
  | "transcription"      // audio → transcript
  | "ai-processing"      // transcript → intent → action
  | "action-execution"   // execute a PA action
  | "embedding"          // generate + store embedding
  | "notification"       // send email/slack notification
  | "morning-briefing"   // generate morning briefing
  | "weekly-digest"      // generate weekly digest
  | "profile-learning"   // update PA profile patterns
```

**Workers** — `src/lib/queue/workers/`:
| File | Trigger | Purpose |
|------|---------|---------|
| `transcription.worker.ts` | Audio upload | Process audio → Deepgram/Gladia |
| `ai-processing.worker.ts` | Transcript ready | Intent classification + action planning |
| `action-execution.worker.ts` | Action approved | Execute the action |
| `embedding.worker.ts` | Content created/updated | Generate + store embedding |
| `notification.worker.ts` | Notification created | Send via email/Slack if preferred |
| `morning-briefing.worker.ts` | Cron trigger | Generate briefings for due users |
| `weekly-digest.worker.ts` | Cron trigger | Generate digests for due users |
| `profile-learning.worker.ts` | After PA interaction | Update PA profile patterns |

Update `scripts/worker.ts` to register all workers.

### 5.7 Reports Frontend

**`src/app/dashboard/reports/page.tsx`** — Chat-style report interface:
- Full-width layout (no sidebar PA panel)
- Suggested question chips: "How's the team doing?", "What's at risk?", "Weekly summary"
- Text input + mic button for asking questions
- Report display with narrative text
- Export button (markdown/PDF)

**`src/components/reports/report-chat.tsx`** — Conversational report interface.
**`src/components/reports/report-export.tsx`** — Export options (markdown, PDF).

---

## 6. New Environment Variables

Add to `.env.example` and `.env.local`:

```bash
# AI - Transcription (Phase 2)
DEEPGRAM_API_KEY=
GLADIA_API_KEY=

# AI - LLMs (Phase 2)
OPENAI_API_KEY=           # GPT-4o-mini + embeddings
ANTHROPIC_API_KEY=        # Claude Sonnet

# Cloudflare R2 (Phase 2)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=hive-uploads
R2_PUBLIC_URL=

# Google OAuth (Phase 3)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/integrations/google/callback

# Microsoft OAuth (Phase 3)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_REDIRECT_URI=http://localhost:3000/api/integrations/microsoft/callback

# Slack OAuth (Phase 3)
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:3000/api/integrations/slack/callback

# Security (Phase 3)
ENCRYPTION_KEY=           # AES-256-GCM for OAuth token encryption

# Cron (Phase 4)
CRON_SECRET=              # Verify cron job requests

# Email (Phase 4 — already installed)
RESEND_API_KEY=
RESEND_FROM_EMAIL=noreply@hive.app
```

---

## 7. Types & Validation

### 7.1 New Type Files

**`src/types/pa.ts`**
```typescript
import type { InferSelectModel } from "drizzle-orm";
import type { paProfiles, paConversations, paActions, paCorrections, voiceTranscripts } from "@/lib/db/schema";

export type PAProfile = InferSelectModel<typeof paProfiles>;
export type PAConversation = InferSelectModel<typeof paConversations>;
export type PAAction = InferSelectModel<typeof paActions>;
export type PACorrection = InferSelectModel<typeof paCorrections>;
export type VoiceTranscript = InferSelectModel<typeof voiceTranscripts>;

export type ActionType = typeof actionTypeEnum.enumValues[number];
export type ActionTier = typeof actionTierEnum.enumValues[number];
export type ActionStatus = typeof actionStatusEnum.enumValues[number];
export type AutonomyMode = typeof autonomyModeEnum.enumValues[number];
```

**`src/types/integrations.ts`**
```typescript
import type { InferSelectModel } from "drizzle-orm";
import type { integrations } from "@/lib/db/schema";

export type Integration = InferSelectModel<typeof integrations>;
export type IntegrationProvider = "google" | "microsoft" | "slack";

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: string[];
  location?: string;
}

export interface EmailMessage {
  id: string;
  from: string;
  subject: string;
  snippet: string;
  date: string;
}
```

### 7.2 Additional Zod Schemas

Add to `src/lib/utils/validation.ts`:

```typescript
export const paChatSchema = z.object({
  message: z.string().min(1).max(2000),
  voiceTranscriptId: z.string().uuid().optional(),
});

export const actionDecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "edit"]),
  editedPayload: z.record(z.any()).optional(),
  rejectionReason: z.string().max(500).optional(),
});

export const reportQuerySchema = z.object({
  question: z.string().min(1).max(500),
  projectId: z.string().uuid().optional(),
  format: z.enum(["narrative", "structured", "data_only"]).optional(),
});

export const updatePaProfileSchema = z.object({
  autonomyMode: z.enum(["autopilot", "copilot", "manual"]).optional(),
  verbosity: z.enum(["concise", "detailed", "bullet_points"]).optional(),
  formality: z.enum(["casual", "professional", "mixed"]).optional(),
  morningBriefingEnabled: z.boolean().optional(),
  morningBriefingTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  weeklyDigestEnabled: z.boolean().optional(),
  weeklyDigestDay: z.number().min(0).max(6).optional(),
  timezone: z.string().optional(),
  workingHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  workingHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  actionOverrides: z.record(z.enum(["auto_execute", "execute_notify", "draft_approve", "suggest_only"])).optional(),
});
```

---

## 8. Testing Strategy

### Phase 2 Tests
- **Unit:** Intent classifier (mock GPT-4o-mini responses → expected intents), action tier resolution (all autonomy modes + overrides), each action handler with mock data
- **Integration:** Full PA chat flow: message → intent → action → execution → response
- **E2E:** PA chat sends message → receives response, voice recording → transcription (mock)

### Phase 3 Tests
- **Unit:** Token encryption/decryption, OAuth URL generation
- **Integration:** Mock OAuth flow (mock provider responses), integration wrapper tests (mock API responses)
- **E2E:** Connect Google → verify integration card shows connected

### Phase 4 Tests
- **Unit:** Report data aggregation queries, cron job user filtering logic
- **Integration:** Report generation: question → data → Claude → narrative, briefing pipeline
- **E2E:** Reports page → ask question → receive narrative

---

## 9. Deployment Configuration

**`vercel.json`** (create in project root):
```json
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

**Deployment stack:** Vercel (app + API) + Supabase (auth + PostgreSQL + pgvector) + Upstash (Redis for BullMQ) + Cloudflare R2 (file storage) + Resend (email).

**Alternative for persistent workers:** Railway or Fly.io with separate worker service running `scripts/worker.ts`.

---

## 10. Complete File Inventory

### Phase 2 (~35 new files)
```
src/lib/voice/deepgram.ts
src/lib/voice/gladia.ts
src/lib/ai/intent-classifier.ts
src/lib/ai/action-planner.ts
src/lib/ai/prompts/intent-classification.ts
src/lib/ai/prompts/action-planning.ts
src/lib/actions/registry.ts
src/lib/actions/executor.ts
src/lib/actions/handlers/create-task.ts
src/lib/actions/handlers/update-task.ts
src/lib/actions/handlers/complete-task.ts
src/lib/actions/handlers/create-comment.ts
src/lib/actions/handlers/post-message.ts
src/lib/actions/handlers/flag-blocker.ts
src/lib/actions/handlers/calendar-block.ts
src/lib/actions/handlers/calendar-event.ts
src/lib/actions/handlers/send-email.ts
src/lib/actions/handlers/send-slack.ts
src/lib/actions/handlers/generate-report.ts
src/lib/db/queries/pa-profiles.ts
src/lib/db/queries/pa-actions.ts
src/app/api/voice/transcribe/route.ts
src/app/api/voice/process/route.ts
src/app/api/pa/chat/route.ts
src/app/api/pa/briefing/route.ts
src/app/api/pa/actions/route.ts
src/app/api/pa/actions/[actionId]/route.ts
src/hooks/use-voice-recorder.ts
src/hooks/use-pa.ts
src/components/pa/pa-panel.tsx
src/components/pa/pa-chat.tsx
src/components/pa/pa-message.tsx
src/components/pa/pa-input.tsx
src/components/pa/pa-voice-recorder.tsx
src/components/pa/pa-action-card.tsx
src/components/pa/pa-briefing-card.tsx
src/components/pa/pa-report-view.tsx
src/app/dashboard/settings/pa/page.tsx
src/types/pa.ts
```

### Phase 3 (~18 new files)
```
src/lib/integrations/oauth.ts
src/lib/integrations/google-calendar.ts
src/lib/integrations/google-mail.ts
src/lib/integrations/microsoft-calendar.ts
src/lib/integrations/microsoft-mail.ts
src/lib/integrations/slack.ts
src/lib/db/queries/integrations.ts
src/app/api/integrations/google/auth/route.ts
src/app/api/integrations/google/callback/route.ts
src/app/api/integrations/google/calendar/route.ts
src/app/api/integrations/google/mail/route.ts
src/app/api/integrations/microsoft/auth/route.ts
src/app/api/integrations/microsoft/callback/route.ts
src/app/api/integrations/microsoft/calendar/route.ts
src/app/api/integrations/microsoft/mail/route.ts
src/app/api/integrations/slack/auth/route.ts
src/app/api/integrations/slack/callback/route.ts
src/app/api/integrations/slack/send/route.ts
src/app/dashboard/integrations/page.tsx
src/components/integrations/integration-card.tsx
src/components/integrations/oauth-button.tsx
src/types/integrations.ts
```

### Phase 4 (~20 new files)
```
src/lib/ai/report-generator.ts
src/lib/ai/briefing-generator.ts
src/lib/ai/email-drafter.ts
src/lib/ai/message-drafter.ts
src/lib/ai/embeddings.ts
src/lib/ai/rag.ts
src/lib/ai/prompts/report-generation.ts
src/lib/ai/prompts/briefing.ts
src/lib/ai/prompts/drafting.ts
src/lib/queue/index.ts
src/lib/queue/jobs.ts
src/lib/queue/workers/transcription.worker.ts
src/lib/queue/workers/ai-processing.worker.ts
src/lib/queue/workers/action-execution.worker.ts
src/lib/queue/workers/embedding.worker.ts
src/lib/queue/workers/notification.worker.ts
src/lib/queue/workers/morning-briefing.worker.ts
src/lib/queue/workers/weekly-digest.worker.ts
src/lib/queue/workers/profile-learning.worker.ts
src/app/api/pa/report/route.ts
src/app/api/cron/morning-briefing/route.ts
src/app/api/cron/overdue-nudge/route.ts
src/app/api/cron/stale-tasks/route.ts
src/app/api/cron/weekly-digest/route.ts
src/app/dashboard/reports/page.tsx
src/components/reports/report-chat.tsx
src/components/reports/report-export.tsx
vercel.json
```

**Total: ~73 new files across Phases 2-4.**
