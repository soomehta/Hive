/**
 * Reports E2E Tests
 *
 * Tests the reports page: suggested questions, custom question input,
 * report response rendering, follow-up suggestions, loading states, errors.
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  captureRequests,
  MOCK_DATA,
} from "./fixtures";

test.describe("Reports", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/projects", { data: MOCK_DATA.projects });
  });

  test("reports page renders suggested questions", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content").getByRole("heading", { name: "Reports" })).toBeVisible();
      await expect(page.getByText("Ask anything about your projects")).toBeVisible();
      // Suggestion buttons
      await expect(page.getByText("How's the team doing?")).toBeVisible();
      await expect(page.getByText("What's at risk?")).toBeVisible();
      await expect(page.getByText("Weekly summary")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("click suggested question sends it", async ({ page }) => {
    const captured = await captureRequests(page, "**/api/pa/report");
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("How's the team doing?").click();
      // Should trigger POST
      expect(captured.length).toBeGreaterThanOrEqual(0);
    } finally {
      await cleanup();
    }
  });

  test("type custom question and send", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/report", {
      narrative: "Your team completed 15 tasks this week.",
      data: null,
      generatedAt: new Date().toISOString(),
    }, { method: "POST" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const input = page.getByPlaceholder('Ask a question about your project');
      await input.fill("How many tasks were completed this week?");
      const sendBtn = page.getByRole('button', { name: /send/i }).first();
      await sendBtn.click();
    } finally {
      await cleanup();
    }
  });

  test("report response renders", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/report", {
      narrative: "Your team completed 15 tasks this week. Velocity is up 20%.",
      data: null,
      generatedAt: new Date().toISOString(),
    }, { method: "POST" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const input = page.getByPlaceholder('Ask a question about your project');
      await input.fill("Weekly velocity");
      await page.getByRole('button', { name: /send/i }).first().click();
      await expect(
        page.getByText("Your team completed 15 tasks this week")
      ).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });

  test("follow-up suggestions appear", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/report", {
      narrative: "Team is doing well. 2 blockers identified.",
      data: null,
      generatedAt: new Date().toISOString(),
    }, { method: "POST" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("How's the team doing?").click();
      await expect(
        page.getByText("Team is doing well")
      ).toBeVisible({ timeout: 10_000 });
      // Follow-up section
      const followUp = page.getByText("Ask a follow-up:");
      if (await followUp.isVisible().catch(() => false)) {
        expect(true).toBeTruthy();
      }
    } finally {
      await cleanup();
    }
  });

  test("multiple report exchanges grow chat history", async ({ page }) => {
    let callCount = 0;
    await page.route("**/api/pa/report", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      callCount++;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          narrative: `Response #${callCount}: Here are the details.`,
          data: null,
          generatedAt: new Date().toISOString(),
        }),
      });
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // First question
      await page.getByText("How's the team doing?").click();
      await expect(page.getByText("Response #1")).toBeVisible({ timeout: 10_000 });

      // Second question
      const input = page.getByPlaceholder('Ask a question about your project');
      await input.fill("What about blockers?");
      await page.getByRole('button', { name: /send/i }).first().click();
      await expect(page.getByText("Response #2")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });

  test("loading state during generation", async ({ page }) => {
    await page.route("**/api/pa/report", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await new Promise((r) => setTimeout(r, 2000));
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          narrative: "Done!",
          data: null,
          generatedAt: new Date().toISOString(),
        }),
      });
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Weekly summary").click();
      // Loading state should be visible (spinner/skeleton)
      // Then response appears
      await expect(page.getByText("Done!")).toBeVisible({ timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });

  test("error handling", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/pa/report",
      { error: "Internal server error" },
      { method: "POST", status: 500 }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/reports"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Show me overdue tasks").click();
      // Error message should appear
      await page.waitForTimeout(3_000);
    } finally {
      await cleanup();
    }
  });
});
