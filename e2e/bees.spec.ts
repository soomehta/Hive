/**
 * Bee System E2E Tests
 *
 * Verifies auth enforcement and HTTP responses for all bee-related API routes.
 * No real auth session or database required — all protected endpoints should
 * return 401 when called without authentication.
 */

import { test, expect } from "@playwright/test";

// ── Bee Templates API ───────────────────────────────────────────────────────

test.describe("Bee Templates API — Auth Enforcement", () => {
  test("GET /api/bees/templates returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/bees/templates");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/bees/templates returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post("/api/bees/templates", {
      data: {
        name: "Test Bee",
        type: "operator",
        subtype: "specialist",
        systemPrompt: "You are a test bee.",
      },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/bees/templates/nonexistent returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/bees/templates/00000000-0000-0000-0000-000000000000"
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("PATCH /api/bees/templates/nonexistent returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.patch(
      "/api/bees/templates/00000000-0000-0000-0000-000000000000",
      { data: { name: "Updated" } }
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("DELETE /api/bees/templates/nonexistent returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.delete(
      "/api/bees/templates/00000000-0000-0000-0000-000000000000"
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Bee Instances API ───────────────────────────────────────────────────────

test.describe("Bee Instances API — Auth Enforcement", () => {
  test("GET /api/bees/instances returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/bees/instances");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/bees/instances returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post("/api/bees/instances", {
      data: {
        templateId: "00000000-0000-0000-0000-000000000000",
        name: "Test Instance",
      },
    });
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("PATCH /api/bees/instances/nonexistent returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.patch(
      "/api/bees/instances/00000000-0000-0000-0000-000000000000",
      { data: { name: "Updated" } }
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("DELETE /api/bees/instances/nonexistent returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.delete(
      "/api/bees/instances/00000000-0000-0000-0000-000000000000"
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Swarm Sessions API ──────────────────────────────────────────────────────

test.describe("Swarm Sessions API — Auth Enforcement", () => {
  test("GET /api/bees/swarms returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get("/api/bees/swarms");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("GET /api/bees/swarms/nonexistent returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/bees/swarms/00000000-0000-0000-0000-000000000000"
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST /api/bees/swarms/nonexistent/cancel returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/bees/swarms/00000000-0000-0000-0000-000000000000/cancel"
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("POST swarm signal resolve returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.post(
      "/api/bees/swarms/00000000-0000-0000-0000-000000000000/signals/00000000-0000-0000-0000-000000000001/resolve"
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });

  test("GET swarm SSE stream returns 401 without auth", async ({
    request,
  }) => {
    const response = await request.get(
      "/api/bees/swarms/00000000-0000-0000-0000-000000000000/stream"
    );
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Swarm Cleanup Cron ──────────────────────────────────────────────────────

test.describe("Swarm Cleanup Cron — Auth Enforcement", () => {
  test("POST /api/cron/swarm-cleanup returns 401 without CRON_SECRET", async ({
    request,
  }) => {
    const response = await request.post("/api/cron/swarm-cleanup");
    expect(response.status()).toBe(401);

    const body = await response.json();
    expect(body).toHaveProperty("error");
  });
});

// ── Bee Settings Page — Auth Guard ──────────────────────────────────────────

test.describe("Bee Settings Pages — Auth Guard", () => {
  test("/dashboard/settings/bees redirects to /sign-in without auth", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings/bees");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
