# PRODUCT REQUIREMENTS DOCUMENT
# Hive Phase 6 — Pinboard Home, Canvas Pages, and Team Chat
## For Implementation by Cursor

---

# 1. Overview

## Product Name

Phase 6: Pinboard + Canvas + Chat

## Problem

Hive currently has strong project/task/PA foundations, but it does not yet provide:
- A Notion-like page/canvas model for rich contextual work.
- A unified "item opens into page" experience across project management objects.
- A personalized illustrated home surface that acts as the user's default command center.
- Native Slack-like team channels with project/team scoping and member controls.

## Vision

When users log in, they land on a dynamic illustrated pinboard that reflects their priorities, team/company updates, and communication context. Tasks/projects can optionally open into rich pages. Teams collaborate in channels (team-level and project-level) with deep links to tasks/pages and PA-assisted workflows.

---

# 2. Scope Boundaries

## What This Is

- A new default home experience ("Pinboard Home") built on top of existing dashboard infrastructure.
- A rich text/block canvas page system where pages are first-class entities.
- Optional "open as page" behavior for tasks and projects (not forced).
- A linked item graph so tasks/projects/pages/chats reference each other.
- Native team chat with channels, members, threads, and item conversion actions.
- Team-wide sticky notices and announcements integrated into home and activity.

## What This Is Not

- Not replacing existing tasks/projects/messages modules.
- Not requiring every task/project to become a page.
- Not real-time presence indicators (online status, typing indicators) in this phase.
- Not full collaborative cursor editing in phase MVP.
- Not replacing Slack integration; this is internal chat inside Hive.
- Not introducing external app marketplace or custom plugin runtime.

---

# 3. Guiding Principles

- **Optional depth:** Basic users can stay lightweight; power users can open items as pages.
- **Home-first workflow:** Pinboard is the default landing experience.
- **Async calm:** Communication is channel-based and thread-based, without presence noise.
- **PA-native:** PA can read/write relevant entities safely via permissions and action tiers.
- **Interlinked context:** Every major object can reference and be referenced.

---

# 4. Editor Stack Decision

## Decision

Use **Tiptap (ProseMirror) + Markdown interoperability + JSON storage**.

## Why This Is Best for Hive

- Mature extension model for mentions, task lists, callouts, embeds, slash commands.
- Strong TypeScript support and active ecosystem.
- Precise control over schema and custom node types for Hive item linking.
- Good long-term fit for "Notion-like but tailored" behavior.
- Works cleanly in Next.js App Router and existing React stack.

## Deferred (Later Phases)

- CRDT live collaboration (`yjs` + `@tiptap/extension-collaboration`).
- Presence UI for collaborators.
- Rich external embeds beyond safe allowlist.

---

# 5. User Experience Specification

## 5.1 Default Landing: Pinboard Home

Route: `/dashboard` (default after auth)

The pinboard is visually illustrated and dynamic, with card "pins" on a board surface. It is still productivity-first.

### Home Core Regions

- **Top strip:** Date, quick capture, PA prompt, org/team switch context.
- **Center board:** Drag/reorder cards pinned by user preferences.
- **Right rail:** Team notices, announcements, channel highlights, mentions.
- **Bottom quick bar:** Create task/page/channel/note actions.

### Required Cards (MVP)

- My Priorities (tasks due/overdue/high-impact)
- PA Briefing
- Team Notices / Sticky Notes
- Recent Mentions
- Project Pulse (risk/blockers/momentum)
- Chat Highlights (unread + pinned threads)
- Upcoming Deadlines

### Personalization Controls

- Pin/unpin cards
- Resize card density (`compact | comfortable`)
- Card ordering and layout persistence
- Theme variant for illustrated board style
- Save multiple board presets (e.g., "Execution", "Leadership")

## 5.2 Pages and Optional "Open as Page"

- Tasks and projects show an "Open as Page" action.
- If no page exists, create one lazily from an item template.
- Standalone pages can also be created directly.
- Page view includes title, icon, cover, blocks, linked items, activity, mentions.

## 5.3 Chat UX

- Users can create channels and add/remove members.
- Two channel scopes:
  - **Team channels:** org/team functional collaboration.
  - **Project channels:** tied to a specific project.
- Thread replies on any channel message.
- Convert message to task/page from message actions.
- Pinned messages and channel topic supported.
- No presence indicators in this phase.

---

# 6. Functional Requirements

## 6.1 Canvas Pages

FR-001: Create page (standalone or linked to item).
FR-002: Edit page using block editor.
FR-003: Auto-save drafts with debounce and optimistic updates.
FR-004: Mention users (`@`) and items (`#`).
FR-005: Maintain backlinks and linked references.
FR-006: View page revisions (snapshot history).
FR-007: Permission-respecting page sharing within org/project scopes.
FR-008: Full-text extraction for search and RAG indexing.

## 6.2 Item Graph

FR-009: First-class item metadata for task/project/page/chat/announcement.
FR-010: Typed relations (`references`, `blocks`, `derived_from`, `parent_of`, `related_to`).
FR-011: Relation creation/deletion via API and UI.
FR-012: Backlink panel on pages and item details.

## 6.3 Pinboard

FR-013: Pinboard is the post-login default.
FR-014: Card registry and user-specific layout persistence.
FR-015: Dynamic illustrated board rendering based on selected theme.
FR-016: Quick actions from board cards.
FR-017: Adjacent dashboards remain available and user-switchable.

## 6.4 Notices/Sticky Notes

FR-018: Org and project scoped notices.
FR-019: Pin, schedule expiry, archive.
FR-020: Role-gated creation and moderation.
FR-021: Surface on pinboard and optional digest summaries.

## 6.5 Team Chat

FR-022: Channel CRUD (team/project scope).
FR-023: Channel membership management.
FR-024: Message CRUD (edit/delete with policy constraints).
FR-025: Threaded replies.
FR-026: Message-to-task and message-to-page conversion.
FR-027: Search across channels with permission filtering.

---

# 7. Non-Functional Requirements

- NFR-001: Page autosave P95 < 500ms server acknowledgment for small edits.
- NFR-002: Home pinboard render P95 < 1.5s for typical user context.
- NFR-003: Chat message send P95 < 300ms server acknowledgment.
- NFR-004: All mutations logged to `activity_log`.
- NFR-005: RBAC and org/project membership enforced on every route.
- NFR-006: Sanitized editor rendering; XSS-safe content pipeline.
- NFR-007: SSE-based updates remain compatible with existing real-time strategy.

---

# 8. Data Model (Schema Additions)

All tables are org-scoped unless noted.

## 8.1 Enums

- `item_type`: `task`, `project`, `page`, `note`, `chat_channel`, `announcement`
- `relation_type`: `references`, `blocks`, `derived_from`, `parent_of`, `related_to`
- `channel_scope`: `team`, `project`
- `channel_member_role`: `owner`, `moderator`, `member`
- `notice_status`: `active`, `scheduled`, `expired`, `archived`
- `pinboard_theme`: `paper_classic`, `blueprint`, `studio`, `minimal`

## 8.2 Tables

### `items`

- `id` UUID PK
- `org_id` UUID FK
- `project_id` UUID FK nullable
- `type` item_type
- `title` varchar
- `owner_id` varchar
- `status` varchar nullable
- `attributes` jsonb
- `created_at`, `updated_at`

Indexes:
- `(org_id, type)`
- `(org_id, project_id, type)`
- GIN on `attributes`

### `item_relations`

- `id` UUID PK
- `org_id` UUID FK
- `from_item_id` UUID FK items
- `to_item_id` UUID FK items
- `relation_type` relation_type
- `created_by` varchar
- `created_at`

Indexes:
- `(org_id, from_item_id)`
- `(org_id, to_item_id)`
- unique `(from_item_id, to_item_id, relation_type)`

### `pages`

- `id` UUID PK
- `org_id` UUID FK
- `item_id` UUID FK items unique
- `editor_version` varchar
- `content_json` jsonb
- `plain_text` text
- `icon` varchar nullable
- `cover_url` text nullable
- `last_edited_by` varchar
- `created_at`, `updated_at`

Indexes:
- GIN full-text index on `plain_text`

### `page_revisions`

- `id` UUID PK
- `org_id` UUID FK
- `page_id` UUID FK pages
- `content_json` jsonb
- `plain_text` text
- `created_by` varchar
- `created_at`

### `pinboard_layouts_user`

- `id` UUID PK
- `org_id` UUID FK
- `user_id` varchar
- `name` varchar
- `is_default` boolean
- `theme` pinboard_theme
- `layout_json` jsonb
- `created_at`, `updated_at`

Unique:
- `(org_id, user_id, name)`

### `notices`

- `id` UUID PK
- `org_id` UUID FK
- `project_id` UUID FK nullable
- `author_id` varchar
- `title` varchar
- `body` text
- `status` notice_status
- `is_pinned` boolean
- `starts_at`, `expires_at` timestamptz nullable
- `created_at`, `updated_at`

Indexes:
- `(org_id, status, is_pinned)`
- `(org_id, project_id, status)`

### `chat_channels`

- `id` UUID PK
- `org_id` UUID FK
- `project_id` UUID FK nullable (required when scope=project)
- `scope` channel_scope
- `name` varchar
- `topic` text nullable
- `created_by` varchar
- `is_archived` boolean
- `created_at`, `updated_at`

Indexes:
- unique `(org_id, project_id, name)` for project scope
- unique `(org_id, scope, name)` for team scope

### `chat_channel_members`

- `id` UUID PK
- `org_id` UUID FK
- `channel_id` UUID FK chat_channels
- `user_id` varchar
- `role` channel_member_role
- `created_at`

Unique:
- `(channel_id, user_id)`

### `chat_messages`

- `id` UUID PK
- `org_id` UUID FK
- `channel_id` UUID FK
- `author_id` varchar
- `content` text
- `content_json` jsonb nullable (for rich message format)
- `edited_at` timestamptz nullable
- `deleted_at` timestamptz nullable (soft delete)
- `created_at`

Indexes:
- `(channel_id, created_at desc)`
- full-text index on `content`

### `chat_threads`

- `id` UUID PK
- `org_id` UUID FK
- `channel_id` UUID FK
- `root_message_id` UUID FK chat_messages
- `created_at`

### `chat_thread_messages`

- `id` UUID PK
- `org_id` UUID FK
- `thread_id` UUID FK chat_threads
- `author_id` varchar
- `content` text
- `edited_at` timestamptz nullable
- `deleted_at` timestamptz nullable
- `created_at`

---

# 9. API Contract Additions

All routes follow existing auth pattern and require org context.

## 9.1 Pages & Items

- `POST /api/items`
- `GET /api/items`
- `GET /api/items/[itemId]`
- `PATCH /api/items/[itemId]`
- `DELETE /api/items/[itemId]`

- `POST /api/pages`
- `GET /api/pages/[itemId]`
- `PATCH /api/pages/[itemId]`
- `GET /api/pages/[itemId]/revisions`
- `POST /api/pages/[itemId]/restore`

- `POST /api/item-relations`
- `DELETE /api/item-relations/[relationId]`
- `GET /api/items/[itemId]/backlinks`

## 9.2 Pinboard

- `GET /api/pinboard/layouts`
- `POST /api/pinboard/layouts`
- `PATCH /api/pinboard/layouts/[layoutId]`
- `POST /api/pinboard/layouts/[layoutId]/set-default`
- `GET /api/pinboard/home-data`

## 9.3 Notices

- `POST /api/notices`
- `GET /api/notices`
- `PATCH /api/notices/[noticeId]`
- `POST /api/notices/[noticeId]/pin`
- `POST /api/notices/[noticeId]/archive`

## 9.4 Chat

- `POST /api/chat/channels`
- `GET /api/chat/channels`
- `PATCH /api/chat/channels/[channelId]`
- `POST /api/chat/channels/[channelId]/members`
- `DELETE /api/chat/channels/[channelId]/members/[userId]`

- `POST /api/chat/channels/[channelId]/messages`
- `GET /api/chat/channels/[channelId]/messages`
- `PATCH /api/chat/messages/[messageId]`
- `DELETE /api/chat/messages/[messageId]`

- `POST /api/chat/messages/[messageId]/thread`
- `GET /api/chat/threads/[threadId]`
- `POST /api/chat/threads/[threadId]/messages`

- `POST /api/chat/messages/[messageId]/convert-task`
- `POST /api/chat/messages/[messageId]/convert-page`

---

# 10. Permissions Model

Add granular permissions:

- `page.create`, `page.read`, `page.edit`, `page.delete`, `page.restore_revision`
- `item.link`, `item.unlink`
- `pinboard.layout.manage_self`
- `notice.create`, `notice.pin`, `notice.archive`, `notice.moderate`
- `chat.channel.create`, `chat.channel.manage`, `chat.channel.join`
- `chat.message.post`, `chat.message.edit_own`, `chat.message.delete_own`, `chat.message.moderate`
- `chat.member.add`, `chat.member.remove`

Rules:
- Project-scoped channels/pages require project membership.
- Team channels require org membership and channel membership.
- Moderation actions require manager/admin role or channel moderator role.

---

# 11. Frontend Architecture

## 11.1 New Routes

- `/dashboard` -> Pinboard home default
- `/dashboard/pages/[itemId]`
- `/dashboard/chat`
- `/dashboard/chat/channels/[channelId]`
- `/dashboard/notices`

## 11.2 Core Components

- `PinboardHome` (illustrated board shell + slot renderer)
- `PinCard` variants for all core cards
- `CanvasEditor` (Tiptap wrapper + mention + slash menu)
- `BacklinksPanel`
- `NoticeComposer` and `NoticeBoard`
- `ChannelList`, `ChannelView`, `ThreadPanel`, `MemberPicker`

## 11.3 State & Data

- TanStack Query for server state.
- Zustand for ephemeral board UI mode and editor local UI state.
- Debounced mutation hooks for autosave.
- SSE subscriptions for chat/notices/home counters.

---

# 12. AI/PA Integration

- New PA intents:
  - `create_page`, `update_page`, `summarize_page`
  - `link_items`, `unlink_items`
  - `create_notice`
  - `create_channel`, `post_channel_message`
  - `convert_message_to_task`, `convert_message_to_page`
- Action planner includes channel/page context references.
- Respect existing autonomy tiers and approval flows.
- PA responses include clickable deep links to affected entities.

---

# 13. Security & Compliance

- Sanitize and validate all rich text inputs.
- Store both structured JSON and safe plain text extraction.
- Prevent cross-org references in item links.
- Enforce membership at route and query layer.
- Soft-delete chat messages with moderation audit trail.
- Rate limit chat/page mutation endpoints.
- Activity log entries for all state-changing operations.

---

# 14. Telemetry & Success Metrics

## Adoption

- % active users opening pinboard daily
- % tasks/projects opened as pages
- # pages created per active org
- # active channels and weekly messages

## Engagement Quality

- Median time-to-first-action from pinboard
- % messages converted to tasks/pages
- Notice read-through and expiry hygiene

## Reliability

- API error rates per module
- Autosave failure rate
- Chat delivery latency P95

---

# 15. Implementation Plan

## Phase 6A — Foundations

- Add enums/tables/migrations for items/pages/pinboard/notices/chat.
- Add query modules and server-side authorization checks.
- Seed default pinboard templates and card registry entries.

## Phase 6B — Canvas MVP

- Implement page APIs and editor wrapper.
- Add optional "Open as Page" from task/project UIs.
- Add backlinks and revision snapshots.

## Phase 6C — Pinboard Home

- Replace default dashboard home with pinboard shell.
- Implement layout persistence and personalization controls.
- Add required core cards and dynamic illustrated themes.

## Phase 6D — Chat + Notices

- Implement channels/members/messages/threads APIs and UI.
- Implement notices and sticky board integration.
- Add conversion actions from chat messages to task/page.

## Phase 6E — PA + Search + Polish

- Extend intent classification and action planner.
- Unified search index inclusion for pages/chat/notices.
- Performance hardening, QA, and release readiness.

---

# 16. Testing Strategy

## Unit Tests

- Schema validators, permission guards, converters, relation handlers.
- Editor serialization/deserialization and sanitization helpers.

## API Integration Tests

- Full CRUD and auth enforcement for pages/items/chat/notices.
- Project vs team channel access checks.
- Message conversion workflow correctness.

## E2E Tests (Playwright)

- Login lands on pinboard.
- Personalize pinboard and persist across reload.
- Create task -> open as page -> edit -> backlinks appear.
- Create team and project channels, add members, post thread replies.
- Convert message to task/page and verify linked entities.
- Create/expire/archive notices and verify pinboard rendering.

## Load & Reliability

- Chat burst test (message throughput)
- Editor autosave soak test
- Pinboard home-data aggregation response time tests

---

# 17. Rollout & Migration

- Feature flags:
  - `phase6_pinboard_enabled`
  - `phase6_canvas_enabled`
  - `phase6_chat_enabled`
- Internal dogfood org rollout first.
- Gradual enablement by org tier.
- Backfill:
  - Create `items` records for existing projects/tasks.
  - No mandatory page creation; pages generated on first "open as page."

---

# 18. Risks & Mitigations

- **Risk:** Editor schema churn.
  - **Mitigation:** versioned `editor_version`, migration utilities.
- **Risk:** Cross-link permission leaks.
  - **Mitigation:** guard relations with org/project membership checks.
- **Risk:** Pinboard overload.
  - **Mitigation:** strict default card set, optional advanced cards.
- **Risk:** Chat sprawl.
  - **Mitigation:** channel templates, archive policy, moderation tooling.

---

# 19. Final Product Decisions Captured

- Editor stack: **Tiptap + ProseMirror**.
- Chat scope: **team channels and project channels**, with member management.
- Presence: **not included in this phase**.
- Pinboard style: **dynamic illustrated board**.
- Task/project page behavior: **optional open as page** (lazy page creation).

