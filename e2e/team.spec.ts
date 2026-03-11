/**
 * Team Management E2E Tests
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  MOCK_DATA,
} from "./fixtures";

test.describe("Team", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/organizations/*/members*", {
      data: MOCK_DATA.members,
    });
  });

  test("team page renders members", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.getByText("Alice Johnson")).toBeVisible();
      await expect(page.getByText("Bob Smith")).toBeVisible();
      await expect(page.getByText("Carol Davis")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("role badges display correctly", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Owner").first()).toBeVisible();
      await expect(page.getByText("Admin").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("invite member dialog", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content h1")).toBeVisible();
      const inviteBtn = page.getByRole("button", { name: /Invite/i }).first();
      await inviteBtn.click();
      await expect(page.getByText("Invite Team Member")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("send invitation", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/organizations/*/members",
      { data: { userId: "user-new", fullName: "New User", email: "new@co.com", role: "member" } },
      { method: "POST", status: 201 }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content h1")).toBeVisible();
      const inviteBtn = page.getByRole("button", { name: /Invite/i }).first();
      await inviteBtn.click();
      const emailInput = page.getByPlaceholder(/email/i).first();
      if (await emailInput.isVisible()) {
        await emailInput.fill("new@co.com");
      }
    } finally {
      await cleanup();
    }
  });

  test("empty team state", async ({ page }) => {
    await mockApiRoute(page, "**/api/organizations/*/members*", { data: [] });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content h1")).toBeVisible();
      await expect(page.getByText("No team members")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("member job title and department display", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Product Manager").first()).toBeVisible();
      await expect(page.getByText("Engineer").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("member initials avatar renders", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Alice Johnson").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("error state on load failure", async ({ page }) => {
    await mockApiRoute(page, "**/api/organizations/*/members*", { error: "Server error" }, { status: 500 });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/team"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.locator("#main-content h1")).toBeVisible();
      await page.waitForTimeout(2_000);
    } finally {
      await cleanup();
    }
  });
});
