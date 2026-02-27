/**
 * Navigation & Route Response E2E Tests
 *
 * Verifies HTTP status codes and basic routing behaviour for public pages,
 * auth pages, and API endpoints — all without a real auth session or database.
 *
 * API auth flow (src/lib/auth/api-auth.ts):
 *   1. authenticateRequest() calls supabase.auth.getUser() — no session → 401
 *   2. If no x-org-id header  → 400  (only reached after a valid session)
 *
 * Therefore, all protected API routes return 401 when called without cookies.
 *
 * The /api/pa/report route only exports POST, so a GET returns 405.
 */

import { test, expect } from "@playwright/test";

// ── Public Page HTTP Responses ────────────────────────────────────────────────

test.describe("Public Page HTTP Responses", () => {
  test("GET / returns 200", async ({ request }) => {
    const response = await request.get("/");
    expect(response.status()).toBe(200);
  });

  test("GET /sign-in returns 200", async ({ request }) => {
    const response = await request.get("/sign-in");
    expect(response.status()).toBe(200);
  });

  test("GET /sign-up returns 200", async ({ request }) => {
    const response = await request.get("/sign-up");
    expect(response.status()).toBe(200);
  });
});

// ── Auth-Guarded Page Redirects ───────────────────────────────────────────────

test.describe("Auth-Guarded Page Redirects (browser navigation)", () => {
  test("GET /dashboard redirects to /sign-in", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("GET /onboarding redirects to /sign-in", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

// ── API Route Auth Enforcement ────────────────────────────────────────────────

test.describe("API Routes — 401 Without Auth", () => {
  test("GET /api/notifications returns 401 and an error property", async ({
    request,
  }) => {
    const response = await request.get("/api/notifications");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("POST /api/pa/chat returns 401 and an error property", async ({
    request,
  }) => {
    const response = await request.post("/api/pa/chat", {
      data: { message: "hello" },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("POST /api/pa/report returns 401 and an error property", async ({
    request,
  }) => {
    const response = await request.post("/api/pa/report", {
      data: { question: "How is the team doing?" },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
    expect(typeof body.error).toBe("string");
  });

  test("GET /api/projects returns 401 and an error property", async ({
    request,
  }) => {
    const response = await request.get("/api/projects");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/tasks returns 401 and an error property", async ({
    request,
  }) => {
    const response = await request.get("/api/tasks");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/activity returns 401 and an error property", async ({
    request,
  }) => {
    const response = await request.get("/api/activity");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/integrations returns 401 and an error property", async ({
    request,
  }) => {
    const response = await request.get("/api/integrations");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Method Not Allowed ────────────────────────────────────────────────────────

test.describe("API Routes — Method Not Allowed", () => {
  test("GET /api/pa/report returns 405 (only POST is exported)", async ({
    request,
  }) => {
    // pa/report/route.ts only exports `POST`.
    // Next.js returns 405 for methods that have no handler.
    const response = await request.get("/api/pa/report");
    expect(response.status()).toBe(405);
  });

  test("GET /api/pa/chat returns 401 (auth required)", async ({
    request,
  }) => {
    // pa/chat exports both GET and POST, but both require authentication
    const response = await request.get("/api/pa/chat");
    expect(response.status()).toBe(401);
  });
});

// ── Landing Page Internal Navigation ─────────────────────────────────────────

test.describe("Landing Page Internal Navigation", () => {
  test("'Sign In' header link navigates to /sign-in", async ({ page }) => {
    await page.goto("/");
    await page.locator("header").getByRole("link", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("'Get Started Free' header link navigates to /sign-up", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator("header")
      .getByRole("link", { name: /Get Started Free/i })
      .click();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("footer 'Sign In' link navigates to /sign-in", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("footer")
      .getByRole("link", { name: "Sign In" })
      .click();
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("footer 'Sign Up' link navigates to /sign-up", async ({ page }) => {
    await page.goto("/");
    await page
      .locator("footer")
      .getByRole("link", { name: "Sign Up" })
      .click();
    await expect(page).toHaveURL(/\/sign-up/);
  });

  test("pricing 'Get Started Free' (Team plan) link navigates to /sign-up", async ({
    page,
  }) => {
    await page.goto("/");
    await page
      .locator("#pricing")
      .getByRole("link", { name: "Get Started Free" })
      .click();
    await expect(page).toHaveURL(/\/sign-up/);
  });
});

// ── Unknown Routes ────────────────────────────────────────────────────────────

test.describe("Unknown Routes", () => {
  test("a completely unknown route returns a non-200 response or shows a not-found UI", async ({
    page,
  }) => {
    const response = await page.goto("/this-page-does-not-exist-xyz");
    // Next.js App Router returns 404 for unmatched routes
    expect(response?.status()).toBe(404);
  });

  test("an unknown /api/* route returns 404", async ({ request }) => {
    const response = await request.get("/api/this-endpoint-does-not-exist-xyz");
    expect(response.status()).toBe(404);
  });
});
