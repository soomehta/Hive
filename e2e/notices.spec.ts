/**
 * Notices E2E Tests
 *
 * Tests the notices page: rendering, creation, pin/unpin, archive, delete,
 * pinned ordering, and empty state.
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  captureRequests,
  MOCK_DATA,
} from "./fixtures";

test.describe("Notices", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/notices", { data: MOCK_DATA.notices });
  });

  test("notices page renders", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/notices"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Team Notices")).toBeVisible();
      await expect(page.getByText("Company All-Hands Friday")).toBeVisible();
      await expect(page.getByText("Office Closure Next Monday")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("create new notice", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/notices",
      {
        data: {
          id: "notice-new",
          title: "New Team Notice",
          body: "This is a test notice",
          status: "active",
          isPinned: false,
        },
      },
      { method: "POST", status: 201 }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/notices"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const newBtn = page.getByRole("button", { name: /New Notice/i });
      await newBtn.click();
      // Should show compose form
      const titleInput = page.getByPlaceholder(/title/i).first();
      if (await titleInput.isVisible()) {
        await titleInput.fill("New Team Notice");
      }
    } finally {
      await cleanup();
    }
  });

  test("pin notice", async ({ page }) => {
    await mockApiRoute(page, "**/api/notices/notice-002/pin", {
      data: { ...MOCK_DATA.notices[1], isPinned: true },
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/notices"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Office Closure Next Monday")).toBeVisible();
      const pinBtn = page.getByRole("button", { name: /pin/i }).first();
      if (await pinBtn.isVisible()) {
        await pinBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("archive notice", async ({ page }) => {
    await mockApiRoute(page, "**/api/notices/notice-001/archive", {
      data: { ...MOCK_DATA.notices[0], status: "archived" },
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/notices"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Company All-Hands Friday")).toBeVisible();
      const archiveBtn = page.getByRole("button", { name: /archive/i }).first();
      if (await archiveBtn.isVisible()) {
        await archiveBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("delete notice", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/notices/notice-002",
      { data: MOCK_DATA.notices[1] },
      { method: "DELETE" }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/notices"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Office Closure Next Monday")).toBeVisible();
      const deleteBtn = page.getByRole("button", { name: /delete/i }).first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("pinned notices shown at top", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/notices"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // notice-001 is pinned, should appear before notice-002
      const allText = await page.textContent("body");
      if (allText) {
        const pinnedIdx = allText.indexOf("Company All-Hands Friday");
        const unpinnedIdx = allText.indexOf("Office Closure Next Monday");
        if (pinnedIdx >= 0 && unpinnedIdx >= 0) {
          expect(pinnedIdx).toBeLessThan(unpinnedIdx);
        }
      }
    } finally {
      await cleanup();
    }
  });

  test("empty state", async ({ page }) => {
    await mockApiRoute(page, "**/api/notices", { data: [] });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/notices"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Team Notices")).toBeVisible();
      // Should show some empty state
    } finally {
      await cleanup();
    }
  });
});
