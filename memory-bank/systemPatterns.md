# System Patterns: Hive

## Architecture

- **Monorepo:** Single Next.js 14+ app (App Router). No separate backend service; API routes live under `src/app/api/`.
- **Data flow:** Frontend (React + Zustand + TanStack Query) → Next.js Route Handlers → Drizzle ORM → PostgreSQL. Background jobs via BullMQ + Redis.
- **Auth boundary:** Clerk for identity; `auth()` in every API route. Org context via `x-org-id` header (or equivalent). RBAC in `src/lib/auth/permissions.ts`.

## Key Technical Decisions

- **PostgreSQL + pgvector:** Single DB for relational data and vector embeddings (RAG); no separate vector DB.
- **Drizzle ORM:** Type-safe, SQL-first; schema in `src/lib/db/schema.ts`; migrations in `drizzle/migrations/`.
- **Action tiers:** `auto_execute` | `execute_notify` | `draft_approve` | `suggest_only`. PA action planner assigns tier; executor respects user PA profile and overrides.
- **Voice pipeline:** Upload audio → Deepgram (primary) / Gladia (fallback) → transcript → same PA chat/action pipeline as text.
- **Real-time:** SSE for notifications and live updates only; no WebSockets for chat.

## Design Patterns

- **API route pattern:** Auth → org membership check → permission check (where needed) → business logic → response. Use shared middleware/helpers from `src/lib/auth/`.
- **Activity log:** All mutations that change org/project/task state write to `activity_log`; one place for feed and reporting.
- **PA actions:** Stored in `pa_actions` with status (pending → approved/rejected → executed/failed); approval UI reads pending, PATCH to approve/reject/edit.
- **Integrations:** OAuth tokens per user per org per provider in `integrations`; encrypted at rest; refresh before use.

## Component Relationships

- **Organizations** own **Projects** and **Organization Members**; **Projects** have **Project Members**, **Tasks**, and **Messages**.
- **Tasks** have **Task Comments**; **pa_actions** reference **pa_conversations** and optionally tasks/messages.
- **PA profiles** are per user per org; **pa_conversations** and **pa_actions** are scoped to user + org.
- **Notifications** and **activity_log** are org-scoped with optional project/task links.
- **Embeddings** are org-scoped; sourceType + sourceId link to tasks, messages, comments, projects for RAG.
