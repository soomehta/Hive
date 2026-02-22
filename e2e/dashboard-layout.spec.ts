/**
 * Dashboard Layout System E2E Tests
 *
 * Verifies auth enforcement for dashboard layout and pathway API routes.
 * Also tests that the dashboard page is properly protected behind auth.
 */

import { test, expect } from "@playwright/test";

// ── Dashboard Layout API ────────────────────────────────────────────────────

test.describe("Dashboard Layout API — Auth Enforcement", () => {
  test("GET /api/dashboard/layouts returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/dashboard/layouts");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/dashboard/layouts returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post("/api/dashboard/layouts", {
      data: {
        pathway: "boards",
        layoutPresetIndex: 0,
        slots: [],
        isDefault: true,
      },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("DELETE /api/dashboard/layouts returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.delete("/api/dashboard/layouts", {
      params: { layoutId: "00000000-0000-0000-0000-000000000000" },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Dashboard Components API ────────────────────────────────────────────────

test.describe("Dashboard Components API — Auth Enforcement", () => {
  test("GET /api/dashboard/components returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/dashboard/components");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Dashboard Pathway API ───────────────────────────────────────────────────

test.describe("Dashboard Pathway API — Auth Enforcement", () => {
  test("POST /api/dashboard/pathway returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post("/api/dashboard/pathway", {
      data: { pathway: "boards" },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Dashboard Page — Auth Guard ─────────────────────────────────────────────

test.describe("Dashboard Page — Auth Guard", () => {
  test("/dashboard redirects to /sign-in without auth", async ({ page }) => {
    await page.goto("/dashboard");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
