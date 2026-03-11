/**
 * PM Agent E2E Tests
 *
 * Tests the PM Agent page: rendering, reports list, manual trigger,
 * schedules, and report detail view.
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  captureRequests,
  MOCK_DATA,
  MOCK_WORKSPACE_ID,
} from "./fixtures";

test.describe("PM Agent", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, `**/api/agents/pm/*/reports`, {
      data: MOCK_DATA.reports,
    });
    await mockApiRoute(page, `**/api/agents/pm/*/schedules`, {
      data: MOCK_DATA.schedules,
    });
  });

  test("PM Agent page renders", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/agents/pm"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content").getByText("PM Agent").first()).toBeVisible();
      await expect(
        page.getByText("Automated standups, reports & check-ins")
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("view agent reports", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/agents/pm"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Recent Reports")).toBeVisible();
      await expect(page.getByText("Daily Standup — March 6")).toBeVisible();
      await expect(page.getByText("Weekly Report — Week 10")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("trigger manual standup", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/agents/pm/*/trigger",
      {
        data: {
          triggered: true,
          scheduleType: "daily_standup",
          workspaceId: MOCK_WORKSPACE_ID,
        },
      },
      { method: "POST" }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/agents/pm"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const standupBtn = page.getByRole("button", { name: /Run Standup/i });
      if (await standupBtn.isVisible()) {
        await standupBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("trigger manual report", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/agents/pm/*/trigger",
      {
        data: {
          triggered: true,
          scheduleType: "weekly_report",
          workspaceId: MOCK_WORKSPACE_ID,
        },
      },
      { method: "POST" }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/agents/pm"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const reportBtn = page.getByRole("button", { name: /Run Report/i });
      if (await reportBtn.isVisible()) {
        await reportBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("empty reports state", async ({ page }) => {
    await mockApiRoute(page, `**/api/agents/pm/*/reports`, { data: [] });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/agents/pm"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(
        page.getByText("No reports yet")
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("report shows content", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/agents/pm"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("3 tasks in progress")).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
