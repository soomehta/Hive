# Hive Security Audit

**Date:** 2026-02-21  
**Scope:** Hive application (Next.js API routes, auth, data access, integrations, cron, env)

---

## Executive summary

The codebase shows **strong security practices** overall: consistent auth, org-scoped access, OAuth CSRF protection, encrypted tokens, rate limiting, and IDOR checks on key operations. Remaining items are mostly **hardening and operational** (env validation, cron secret, headers, callback binding). **No critical vulnerabilities** were found.

---

## 1. Authentication & authorization

| Area | Status | Notes |
|------|--------|------|
| **API auth** | ✅ | All user-facing API routes use `authenticateRequest()` (Supabase session + `x-org-id`). |
| **Org context** | ✅ | `x-org-id` required and validated as UUID; membership checked in DB. |
| **RBAC** | ✅ | `hasPermission(memberRole, permission, context)` used for org/project/task/message actions. |
| **Cron** | ✅ | All 4 cron routes check `Authorization: Bearer ${CRON_SECRET}`. |
| **Health** | ✅ | `/api/health` is unauthenticated by design (typical for load balancers). |
| **OAuth callbacks** | ✅ | No session required; state is HMAC-signed and verified before creating integration. |

**Recommendation:** When using cron in production, set `CRON_SECRET` and treat it as required in env validation for the cron feature.

---

## 2. IDOR & resource ownership

| Resource | Check | Location |
|----------|--------|----------|
| **Integration delete** | ✅ | `deleteIntegration(id, userId, orgId)` filters by `userId` and `orgId`. |
| **Notifications mark-read** | ✅ | `markNotificationsRead(ids, userId, orgId)` filters by `userId` and `orgId`. |
| **PA action approve/reject** | ✅ | `action.userId !== auth.userId` → 403. |
| **Task / comments** | ✅ | `getTask(taskId)` then `task.orgId !== auth.orgId` → 404. |
| **Activity feed** | ✅ | `getActivityFeed({ orgId })` with auth `orgId`. |
| **SSE** | ✅ | Org membership verified before adding client; `orgId` from header or query, validated as UUID. |

No IDOR issues found in the audited paths.

---

## 3. OAuth & integrations

| Control | Status | Notes |
|--------|--------|-------|
| **State parameter** | ✅ | HMAC-SHA256 with `ENCRYPTION_KEY`, 10-min TTL, timing-safe compare. |
| **Token storage** | ✅ | AES-256-GCM in `oauth.ts`; format `iv:authTag:encrypted`; ciphertext format validated on decrypt. |
| **Callback auth** | ✅ | State carries `userId`/`orgId`; integration created for that user/org. No session required on callback. |

**Recommendation (defense in depth):** After `exchangeCodeForSession` in auth callback, optionally assert that the Supabase `user.id` matches `state.userId` so the integration is only created for the user who completed the flow.

---

## 4. Input validation & injection

| Area | Status | Notes |
|------|--------|------|
| **Task search** | ✅ | `search.replace(/[%_\\]/g, '\\$&')` before `ilike()` to avoid ILIKE injection. |
| **PA chat / profile** | ✅ | Zod `.safeParse()` used; validation errors handled without leaking internals. |
| **Notification limit** | ✅ | Clamped to 1–100. |
| **Voice upload** | ✅ | 25MB max; allowlist of MIME types. |
| **Auth redirect** | ✅ | `next` must start with `/`, not `//`, and must not contain `@`. |

No SQL built from unsanitized user input; Drizzle parameterization and escaped search are used appropriately.

---

## 5. Environment & secrets

| Item | Status | Notes |
|------|--------|-------|
| **Required env** | ✅ | `env.ts` validates DATABASE_URL, Supabase keys, ENCRYPTION_KEY. |
| **Optional env** | ✅ | AI, voice, OAuth, R2, Redis, CRON_SECRET loaded optionally. |
| **Lazy init** | ✅ | DB, Supabase admin, OpenAI, Anthropic, Deepgram, R2, Redis lazily initialized. |
| **ENCRYPTION_KEY** | ⚠️ | Used as hex key for AES-256-GCM; no length/format check. If key is short, behavior may be weak or throw. |

**Recommendations:**

- Validate `ENCRYPTION_KEY` length (e.g. 64 hex chars for 32-byte key) at startup or first use.
- For production cron, require `CRON_SECRET` when cron endpoints are enabled (e.g. in `env.ts` or deployment checks).
- Align R2 env with code: `env.ts` has `R2_BUCKET` / `R2_ENDPOINT`; `r2.ts` uses `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`. Use a single set of names and document in `.env.example`.

---

## 6. Rate limiting

| Endpoint / area | Status | Notes |
|-----------------|--------|-------|
| **PA chat** | ✅ | 20/min per user. |
| **Voice** | ✅ | 10/min per user. |
| **Reports** | ✅ | 10/min per user. |
| **Storage** | ⚠️ | In-memory `Map`; resets on restart and not shared across instances. |

**Recommendation:** For multi-instance production, use a shared store (e.g. `@upstash/ratelimit` with Redis) as noted in memory-bank.

---

## 7. Security headers & middleware

- **Auth middleware** redirects unauthenticated users from `/dashboard` and `/onboarding` to sign-in, and signed-in users from `/sign-in` and `/sign-up` to dashboard.
- No **CSP**, **X-Frame-Options**, **HSTS**, or **X-Content-Type-Options** observed in the codebase.

**Recommendation:** Add security headers (e.g. in `next.config.js` or middleware): at least `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and consider CSP and HSTS for production.

---

## 8. Dependencies

- **npm audit:** **0 vulnerabilities** (after overrides for minimatch, tar, glob, ajv, path-to-regexp, undici, esbuild).
- No obvious use of deprecated or known-weak crypto in the reviewed code.

---

## 9. Error handling & logging

- API routes generally catch errors and return generic “Internal server error” to the client.
- Some routes log `error` with `console.error`; ensure logs are not exposed to clients and that sensitive data (tokens, PII) is not logged.
- AuthError returns clear messages (e.g. “Unauthorized”, “Not a member of this organization”); acceptable for auth flows.

---

## 10. Summary table

| Category | Result |
|----------|--------|
| Authentication & authorization | Strong |
| IDOR & resource ownership | Strong |
| OAuth & token handling | Strong |
| Input validation & injection | Strong |
| Env & secrets | Good (minor hardening) |
| Rate limiting | Good (shared store for scale) |
| Security headers | Missing (recommended) |
| Dependencies | Clean (0 known vulns) |

---

## Action items (optional hardening)

1. **ENCRYPTION_KEY:** Validate length/format (e.g. 64 hex chars) on first use or in `env.ts`.
2. **CRON_SECRET:** Require when cron is used in production; document in deployment guide.
3. **OAuth callback:** Optionally assert `user.id === state.userId` after code exchange.
4. **Security headers:** Add X-Frame-Options, X-Content-Type-Options; consider CSP and HSTS.
5. **Rate limiting:** Move to Redis-backed limiter for multi-instance deployment.
6. **R2 env:** Unify and document env var names for R2 in `.env.example` and code.

No critical or high-severity issues were identified; the above are improvements for robustness and defense in depth.
