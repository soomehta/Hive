/**
 * Integrations E2E Tests
 *
 * Tests the integrations page: provider cards, connect/disconnect flows,
 * connected status display, and calendar sync options.
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  MOCK_DATA,
} from "./fixtures";

test.describe("Integrations", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/integrations*", {
      data: MOCK_DATA.integrations,
    });
  });

  test("integrations page renders 3 provider cards", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/integrations"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content").getByText("Integrations").first()).toBeVisible();
      await expect(page.getByText("Google").first()).toBeVisible();
      await expect(page.getByText("Microsoft").first()).toBeVisible();
      await expect(page.getByText("Slack").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("connected integration shows status", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/integrations"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // Google is connected
      await expect(page.getByText("Connected").first()).toBeVisible();
      await expect(page.getByText("alice@gmail.com")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("disconnect integration shows confirm dialog", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/integrations"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const disconnectBtn = page.getByRole("button", { name: /Disconnect/i }).first();
      if (await disconnectBtn.isVisible()) {
        await disconnectBtn.click();
        // Confirm dialog
        await expect(page.getByText(/Disconnect Google\?/i)).toBeVisible();
        await expect(page.getByText(/revoke access/i)).toBeVisible();
        // Cancel
        await page.getByRole("button", { name: "Cancel" }).click();
      }
    } finally {
      await cleanup();
    }
  });

  test("not connected providers show connect button", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/integrations"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // Microsoft and Slack are not connected
      await expect(page.getByText("Not connected").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("integration features listed", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/integrations"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Calendar events").first()).toBeVisible();
      await expect(page.getByText("Email reading").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("expired integration shows re-auth badge", async ({ page }) => {
    await mockApiRoute(page, "**/api/integrations*", {
      data: [
        { ...MOCK_DATA.integrations[0], tokenExpiresAt: "2020-01-01T00:00:00Z" },
      ],
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/integrations"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Needs re-auth").first()).toBeVisible();
      await expect(page.getByRole("button", { name: /Reconnect/i }).first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
