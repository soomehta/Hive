# Active Context: Hive

## Current Focus

- **Phase 1 complete.** Foundation fully built with all CRUD, activity logging, notifications.
- **Phase 2 complete.** Voice + PA Core — intent classification, action system, PA chat, approval UI.
- **Phase 3 complete.** Google/Microsoft/Slack OAuth, calendar, email, messaging integrations.
- **Phase 4 complete.** Report engine, morning briefing, weekly digest, cron jobs, PA learning, embeddings/RAG, BullMQ workers.
- **Landing page complete.** Conversion-optimized marketing page with 8 sections.
- **Phases 2-4 spec complete.** Implementation-ready document at `docs/phases-2-4-spec.md`.
- **All phases code complete.** 55 routes, 0 TypeScript errors, 11 tests pass.
- **Next step:** Set up Supabase project, run Drizzle migrations, and perform end-to-end testing with real data.

## Recent Changes

- Implemented full Phase 4 (Reporting + Proactive):
  - Schema: Added embeddings table (pgvector, 1536 dimensions) + scheduledReports table
  - AI modules: report-generator.ts, briefing-generator.ts, email-drafter.ts, message-drafter.ts, embeddings.ts, rag.ts
  - AI prompts: report-generation.ts, briefing.ts, drafting.ts
  - BullMQ queue: index.ts (Redis connection, queue/worker factories), jobs.ts (8 typed job interfaces)
  - 8 workers: transcription, ai-processing, action-execution, embedding, notification, morning-briefing, weekly-digest, profile-learning
  - API routes: POST /api/pa/report, 4 cron endpoints (morning-briefing, overdue-nudge, stale-tasks, weekly-digest)
  - Reports page: /dashboard/reports with chat-style interface, suggested questions, export
  - Updated generate-report handler from stub to real implementation
  - Enhanced briefing route with Claude narrative generation
  - vercel.json with 4 cron job schedules
  - scripts/worker.ts updated with all 8 worker imports + graceful shutdown

## Active Decisions & Considerations

- **Auth:** Using Supabase Auth instead of Clerk. All API routes use `authenticateRequest()` from `@/lib/auth/api-auth`.
- **Lazy client initialization:** OpenAI, Anthropic, Deepgram, R2, and Redis clients are lazily initialized to avoid build errors when env vars are missing.
- **Integration handler pattern:** Each handler tries Google first, then Microsoft. If neither is connected, returns a user-friendly error.
- **BullMQ ioredis version:** Uses `as unknown as ConnectionOptions` cast to resolve ioredis version mismatch between top-level and BullMQ bundled versions.
- **pgvector RAG:** Uses raw SQL via `db.execute()` for cosine similarity search since Drizzle doesn't have native pgvector query support.
- **apiClient pattern:** fetch wrapper (not axios) — use `apiClient(url, { method, body })` syntax, not `.get()/.post()`.
- **Landing page pricing:** Placeholder pricing ($0 Team / $12 Pro) — adjust before launch.
