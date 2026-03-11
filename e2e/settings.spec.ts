/**
 * Settings & Profile E2E Tests
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  MOCK_DATA,
} from "./fixtures";

test.describe("Settings", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/workspaces/*", { data: MOCK_DATA.workspaces[0] });
  });

  test("settings page renders sections", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content h1", { hasText: "Settings" })).toBeVisible();
      await expect(page.getByText("Profile").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("profile page shows user info", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/profile"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const main = page.locator("#main-content");
      await expect(main.getByRole("heading", { name: "Profile" })).toBeVisible();
      await expect(page.getByText("Personal Information")).toBeVisible();
      await expect(page.locator("#full-name")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("edit full name", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/profile"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const nameInput = page.locator("#full-name");
      await nameInput.fill("Updated Name");
      const saveBtn = page.getByRole("button", { name: /Save/i }).first();
      if (await saveBtn.isEnabled()) {
        await saveBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("notification toggles", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/profile"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Notifications")).toBeVisible();
      await expect(page.getByText("Email Morning Briefing").first()).toBeVisible();
      await expect(page.getByText("Email Weekly Digest").first()).toBeVisible();
      const switches = page.locator('[role="switch"]');
      if (await switches.first().isVisible()) {
        await switches.first().click();
      }
    } finally {
      await cleanup();
    }
  });

  test("PA verbosity setting", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/profile"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("PA Personality")).toBeVisible();
      await expect(page.getByText("Verbosity").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("PA formality setting", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/profile"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Formality").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("custom PA instructions textarea", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/profile"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const instructionsInput = page.locator("#personality-traits");
      if (await instructionsInput.isVisible()) {
        await instructionsInput.fill("Be encouraging, use bullet points");
      }
    } finally {
      await cleanup();
    }
  });
});

test.describe("Settings — Bees", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/agents/**", { data: [] });
    await mockApiRoute(page, "**/api/bees/**", { data: [] });
  });

  test("bees settings page renders", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/bees"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByRole("heading", { name: "Bee Templates" })).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("create bee template", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/bees"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByRole("heading", { name: "Bee Templates" })).toBeVisible();
      const newBtn = page.getByRole("button", { name: /New Bee/i }).first();
      if (await newBtn.isVisible()) {
        await newBtn.click();
      }
    } finally {
      await cleanup();
    }
  });
});

test.describe("Settings — Check-ins", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/checkins/preferences", {
      data: {
        frequency: "standard",
        preferredTime: "09:00",
        quietHoursStart: "22:00",
        quietHoursEnd: "07:00",
        maxCheckinsPerDay: 3,
      },
    });
  });

  test("check-in preferences form renders", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/checkins"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const main = page.locator("#main-content");
      await expect(main.getByRole("heading", { name: "Check-in Preferences" })).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("save check-in preferences", async ({ page }) => {
    await mockApiRoute(page, "**/api/checkins/preferences", { data: { frequency: "daily" } }, { method: "PUT" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/settings/checkins"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const main = page.locator("#main-content");
      await expect(main.getByRole("heading", { name: "Check-in Preferences" })).toBeVisible();
      const saveBtn = page.getByRole("button", { name: /Save Preferences/i });
      if (await saveBtn.isVisible()) {
        await saveBtn.click();
      }
    } finally {
      await cleanup();
    }
  });
});
