# Tech Context: Hive

## Stack (from PRD)

### Frontend
- Next.js 14+ (App Router), TypeScript (strict)
- Tailwind CSS v4 + shadcn/ui
- Zustand (client state), TanStack Query (server state)
- MediaRecorder API (voice), SSE for live updates
- React Hook Form + Zod

### Backend
- Node.js 20+, TypeScript
- Next.js API Routes (Route Handlers)
- Drizzle ORM, PostgreSQL 16, pgvector
- Redis (Upstash or self-hosted), BullMQ
- Clerk (auth), Cloudflare R2 (files), Resend (email)

### AI & Voice
- Deepgram Nova-3 (STT primary), Gladia Solaria (fallback)
- GPT-4o-mini (intent classification), Claude Sonnet (reports, planning, drafting)
- OpenAI text-embedding-3-small; pgvector for RAG

### Integrations
- Google OAuth2 + Calendar + Gmail APIs
- Microsoft OAuth2 + Graph (Calendar, Mail)
- Slack OAuth2 + Web API

## Development Setup

- **Database:** PostgreSQL 16 with pgvector extension. Run Drizzle migrations then optional SQL for vector index and `updated_at` triggers (see PRD §3).
- **Env:** `.env.local` from `.env.example`; Clerk, DB URL, Redis, API keys for Deepgram, OpenAI, Anthropic, Resend, R2, Google/Microsoft/Slack as needed.
- **Commands:** `npm install` → `npx drizzle-kit generate` / `migrate` → `npx tsx scripts/seed.ts`. Dev: `npm run dev` (Next.js) and `npx tsx scripts/worker.ts` (BullMQ) in separate terminals.
- **Tests:** Vitest (unit/integration), Playwright (e2e). Type check: `npx tsc --noEmit`.

## Technical Constraints

- User IDs are Clerk IDs (varchar); no local user table except as synced by Clerk webhook.
- All timestamps UTC in DB; display in user timezone (from PA profile or browser).
- Tokens (OAuth, invitation) must be encrypted at rest; env vars for encryption key.
- Cron endpoints (Vercel or external) must be secured (e.g. CRON_SECRET); see PRD §21.
