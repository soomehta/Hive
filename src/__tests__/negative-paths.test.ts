/**
 * Negative path tests — auth errors, permission matrix, validation edge cases,
 * rate limiting, and cron authentication.
 *
 * ~30 tests across 5 describe blocks.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── Safety mocks for heavy transitive imports ────────────────────────────────
// These prevent Drizzle / Supabase client code from running during the test
// environment where no real database or env vars are present.
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/db/schema", () => ({}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

// ─── Upstash mocks (must be declared before rate-limit import) ────────────────
const mockLimit = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  const MockRatelimit = vi.fn().mockImplementation(() => ({
    limit: mockLimit,
  }));
  (MockRatelimit as unknown as Record<string, unknown>).slidingWindow = vi.fn(
    () => ({})
  );
  return { Ratelimit: MockRatelimit };
});

vi.mock("@upstash/redis", () => ({
  Redis: vi.fn().mockImplementation(() => ({})),
}));

// ─── Actual imports ───────────────────────────────────────────────────────────
import { AuthError, authErrorResponse } from "@/lib/auth/api-auth";
import { hasPermission } from "@/lib/auth/permissions";
import {
  createTaskSchema,
  createMessageSchema,
  updateTaskSchema,
} from "@/lib/utils/validation";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { verifyCronSecret } from "@/lib/auth/cron-auth";
import { NextRequest } from "next/server";
import { MOCK_ORG_ID } from "./helpers";

// Zod v4 enforces RFC 4122 UUID format (version nibble 1-8, variant bits set).
// The MOCK_ORG_ID / MOCK_PROJECT_ID constants use all-zero UUIDs that intentionally
// fail UUID validation, so we use a proper v4 UUID for positive validation tests.
const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

// ─── 1. Auth errors ───────────────────────────────────────────────────────────

describe("AuthError class", () => {
  beforeEach(() => vi.clearAllMocks());

  it("has the correct name property", () => {
    const err = new AuthError("Unauthorized", 401);
    expect(err.name).toBe("AuthError");
  });

  it("stores the statusCode correctly", () => {
    const err = new AuthError("Forbidden", 403);
    expect(err.statusCode).toBe(403);
  });

  it("sets the message correctly", () => {
    const err = new AuthError("Custom message", 400);
    expect(err.message).toBe("Custom message");
  });

  it("is an instance of Error", () => {
    const err = new AuthError("Oops", 500);
    expect(err).toBeInstanceOf(Error);
  });
});

describe("authErrorResponse helper", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns a 401 Response for AuthError(401)", async () => {
    const err = new AuthError("Unauthorized", 401);
    const res = authErrorResponse(err);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("returns a 403 Response for AuthError(403)", async () => {
    const err = new AuthError("Forbidden", 403);
    const res = authErrorResponse(err);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: "Forbidden" });
  });

  it("re-throws non-AuthError errors", () => {
    const plainError = new Error("Something exploded");
    expect(() => authErrorResponse(plainError)).toThrow("Something exploded");
  });
});

// ─── 2. Permission matrix ─────────────────────────────────────────────────────

describe("hasPermission — negative cases (member role)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("member cannot manage org", () => {
    expect(hasPermission("member", "org:manage")).toBe(false);
  });

  it("member cannot delete tasks without project lead or creator context", () => {
    expect(hasPermission("member", "task:delete")).toBe(false);
  });

  it("member cannot view project without isProjectMember context", () => {
    expect(hasPermission("member", "project:view")).toBe(false);
  });

  it("member cannot post messages without isProjectMember context", () => {
    expect(hasPermission("member", "message:post")).toBe(false);
  });

  it("member cannot create tasks without isProjectMember context", () => {
    expect(hasPermission("member", "task:create")).toBe(false);
  });
});

describe("hasPermission — positive cases", () => {
  beforeEach(() => vi.clearAllMocks());

  it("member with isProjectLead CAN manage project", () => {
    expect(
      hasPermission("member", "project:manage", { isProjectLead: true })
    ).toBe(true);
  });

  it("member with isProjectMember can create tasks", () => {
    expect(
      hasPermission("member", "task:create", { isProjectMember: true })
    ).toBe(true);
  });

  it("owner has org:manage permission", () => {
    expect(hasPermission("owner", "org:manage")).toBe(true);
  });

  it("owner has org:delete permission", () => {
    expect(hasPermission("owner", "org:delete")).toBe(true);
  });

  it("admin has org:manage but NOT org:delete", () => {
    expect(hasPermission("admin", "org:manage")).toBe(true);
    expect(hasPermission("admin", "org:delete")).toBe(false);
  });

  it("owner always has project:view even without context", () => {
    expect(hasPermission("owner", "project:view")).toBe(true);
  });

  it("admin always has project:view even without context", () => {
    expect(hasPermission("admin", "project:view")).toBe(true);
  });

  it("member with isCreator can delete their own task", () => {
    expect(
      hasPermission("member", "task:delete", { isCreator: true })
    ).toBe(true);
  });
});

// ─── 3. Validation edge cases ─────────────────────────────────────────────────

describe("createTaskSchema — negative paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an empty title", () => {
    const result = createTaskSchema.safeParse({
      projectId: MOCK_ORG_ID,
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a title exceeding 500 characters", () => {
    const result = createTaskSchema.safeParse({
      projectId: MOCK_ORG_ID,
      title: "x".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a description exceeding 10000 characters", () => {
    const result = createTaskSchema.safeParse({
      projectId: MOCK_ORG_ID,
      title: "Valid title",
      description: "d".repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID projectId", () => {
    const result = createTaskSchema.safeParse({
      projectId: "not-a-uuid",
      title: "Valid title",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority enum value", () => {
    const result = createTaskSchema.safeParse({
      projectId: MOCK_ORG_ID,
      title: "Valid title",
      priority: "critical",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a minimal valid task", () => {
    const result = createTaskSchema.safeParse({
      projectId: VALID_UUID,
      title: "A valid task title",
    });
    expect(result.success).toBe(true);
  });
});

describe("updateTaskSchema — negative paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects an invalid status enum value", () => {
    const result = updateTaskSchema.safeParse({
      status: "invalid_status",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid priority enum value", () => {
    const result = updateTaskSchema.safeParse({
      priority: "extreme",
    });
    expect(result.success).toBe(false);
  });
});

describe("createMessageSchema — negative paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects content exceeding 20000 characters", () => {
    const result = createMessageSchema.safeParse({
      projectId: MOCK_ORG_ID,
      content: "m".repeat(20001),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-UUID projectId", () => {
    const result = createMessageSchema.safeParse({
      projectId: "not-a-uuid",
      content: "Some content",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid message at content boundary (20000 chars)", () => {
    const result = createMessageSchema.safeParse({
      projectId: VALID_UUID,
      content: "m".repeat(20000),
    });
    expect(result.success).toBe(true);
  });
});

// ─── 4. Rate limiting ─────────────────────────────────────────────────────────

describe("rateLimitResponse — pure response shape", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns HTTP 429 status", async () => {
    const futureReset = Date.now() + 60_000;
    const res = rateLimitResponse({
      success: false,
      remaining: 0,
      resetAt: futureReset,
    });
    expect(res.status).toBe(429);
  });

  it("includes X-RateLimit-Remaining header", () => {
    const futureReset = Date.now() + 60_000;
    const res = rateLimitResponse({
      success: false,
      remaining: 0,
      resetAt: futureReset,
    });
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("includes a positive Retry-After header", () => {
    const futureReset = Date.now() + 30_000;
    const res = rateLimitResponse({
      success: false,
      remaining: 0,
      resetAt: futureReset,
    });
    const retryAfter = Number(res.headers.get("Retry-After"));
    expect(retryAfter).toBeGreaterThan(0);
  });

  it("response body contains an error message", async () => {
    const futureReset = Date.now() + 60_000;
    const res = rateLimitResponse({
      success: false,
      remaining: 0,
      resetAt: futureReset,
    });
    const body = await res.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });
});

describe("rateLimit — behavior when Redis is not configured", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure env vars are absent so the lazy singleton stays null.
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });

  it("allows all requests when Redis is unconfigured (success: true)", async () => {
    const result = await rateLimit("test-key", 10, 60_000);
    expect(result.success).toBe(true);
  });

  it("returns the full limit as remaining when Redis is unconfigured", async () => {
    const result = await rateLimit("test-key", 100, 60_000);
    expect(result.remaining).toBe(100);
  });
});

// ─── 5. Cron authentication ───────────────────────────────────────────────────

describe("verifyCronSecret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "super-secret-cron-token";
  });

  function makeCronRequest(authHeader: string | null): NextRequest {
    const headers: Record<string, string> = {};
    if (authHeader !== null) {
      headers["authorization"] = authHeader;
    }
    return new NextRequest("http://localhost:3000/api/cron/test", { headers });
  }

  it("returns true for a valid CRON_SECRET", () => {
    const req = makeCronRequest("Bearer super-secret-cron-token");
    expect(verifyCronSecret(req)).toBe(true);
  });

  it("returns false for an incorrect secret", () => {
    const req = makeCronRequest("Bearer wrong-secret");
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false when the authorization header is missing", () => {
    const req = makeCronRequest(null);
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false when CRON_SECRET env var is not set", () => {
    delete process.env.CRON_SECRET;
    const req = makeCronRequest("Bearer super-secret-cron-token");
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false for a Bearer token with extra whitespace", () => {
    const req = makeCronRequest("Bearer  super-secret-cron-token");
    expect(verifyCronSecret(req)).toBe(false);
  });

  it("returns false for a token without the Bearer prefix", () => {
    const req = makeCronRequest("super-secret-cron-token");
    expect(verifyCronSecret(req)).toBe(false);
  });
});
