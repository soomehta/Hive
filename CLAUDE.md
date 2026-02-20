# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hive is an AI-native project management platform with Personal Assistants (PA). It is a **pre-implementation** project — only the PRD and project intelligence files exist; no source code has been written yet.

**Source of truth:** `hive-prd.md` contains the complete product requirements, schema, API routes, env vars, and implementation order. Do not deviate from the PRD without explicit user approval.

## Memory Bank

At the start of every task, read the Memory Bank files in `memory-bank/`: projectbrief.md, productContext.md, activeContext.md, systemPatterns.md, techContext.md, progress.md. When significant work is completed, update activeContext.md and progress.md.

## Tech Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript (strict), Tailwind CSS v4, shadcn/ui, Zustand (client state), TanStack Query (server state), React Hook Form + Zod
- **Backend:** Next.js API Routes (monorepo, no separate backend), Drizzle ORM, PostgreSQL 16 + pgvector, Redis + BullMQ
- **Auth:** Clerk (user IDs are Clerk IDs — varchar, no local user table)
- **AI:** GPT-4o-mini (intent classification), Claude Sonnet (action planning, reports, drafting), OpenAI text-embedding-3-small + pgvector for RAG
- **Voice:** Deepgram Nova-3 (primary STT), Gladia Solaria (fallback)
- **Integrations:** Google Calendar/Gmail, Microsoft Outlook/Calendar, Slack — all via OAuth2
- **Storage/Email:** Cloudflare R2, Resend

## Build & Development Commands

```bash
npm install                     # Install dependencies
npm run dev                     # Next.js dev server (port 3000)
npx tsx scripts/worker.ts       # BullMQ worker (separate terminal)
npm run build                   # Production build
npm start                       # Production server

# Database
npx drizzle-kit generate        # Generate migrations from schema
npx drizzle-kit migrate         # Run migrations
npx tsx scripts/seed.ts          # Seed sample data

# Testing
npm run test                    # Vitest (unit + integration)
npm run test:e2e                # Playwright (e2e)
npx tsc --noEmit                # Type check
```

Dev requires two terminals: one for `npm run dev`, one for `npx tsx scripts/worker.ts`.

## Implementation Order (Strict)

Build phases sequentially. Complete and test each before starting the next.

1. **Phase 1 – Foundation:** Next.js + Clerk + Drizzle + PostgreSQL; Organizations, Projects, Tasks, Messages, Activity Log, Notifications; all CRUD and frontend pages
2. **Phase 2 – Voice + PA Core:** Voice recording, transcription, intent classifier, PA chat, action registry/executor, approval UI
3. **Phase 3 – Integrations:** Google/Microsoft/Slack OAuth and APIs
4. **Phase 4 – Reporting + Proactive:** Report engine, morning briefing, weekly digest, cron jobs, PA learning, embeddings/RAG

## Architecture

**Monorepo:** Single Next.js app. Frontend and API routes coexist. No separate backend service.

**Data flow:** React (Zustand + TanStack Query) → Next.js Route Handlers → Drizzle ORM → PostgreSQL. Background jobs via BullMQ + Redis.

**PA core loop:** User input (text/voice) → intent classification (GPT-4o-mini) → action planning (Claude Sonnet) → tier-based execution → activity log + notifications.

**Action tiers (graduated autonomy):**
- `auto_execute` — execute immediately, notify user
- `execute_notify` — execute, ask permission after
- `draft_approve` — draft, wait for user approval
- `suggest_only` — present suggestion, user decides

Tier is overridable per action type in the user's PA profile.

**Activity log:** All state-changing mutations write to `activity_log` — single source for feed, reports, and PA learning.

**Real-time:** SSE for notifications and live updates (no WebSockets).

## Key Conventions

**API route pattern:** `auth()` from Clerk → validate org membership via `x-org-id` header → `hasPermission()` from `src/lib/auth/permissions.ts` → business logic → log to `activity_log` → return response.

**Schema:** UUIDs for all PKs. UTC timestamps (`withTimezone: true`). Cascade deletes. OAuth tokens encrypted at rest with `ENCRYPTION_KEY`. After Drizzle migrations, run additional SQL for pgvector extension, HNSW index, and `updated_at` triggers (see PRD §3).

**File structure:** Follow PRD §2 exactly — pages under `src/app/`, library code under `src/lib/`, components under `src/components/`, reusable DB queries in `src/lib/db/queries/`.

**Cron endpoints:** Secured with `CRON_SECRET` env var. Scheduled via `vercel.json`.
