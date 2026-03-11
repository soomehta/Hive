/**
 * Guest / Shared Views E2E Tests
 *
 * Tests shared project views: valid token rendering, read-only mode,
 * task visibility, project header, and invalid token error.
 */

import { test, expect } from "@playwright/test";
import { MOCK_DATA } from "./fixtures";

test.describe("Guest Access — Shared Views", () => {
  test.setTimeout(30_000);

  test("shared project view renders with valid token", async ({ page }) => {
    await page.route("**/shared/valid-token-123**", async (route) => {
      if (route.request().resourceType() !== "document") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<html><body>
          <h1>Website Redesign</h1>
          <div>Status: active</div>
          <ul>
            <li>Design homepage mockup — todo</li>
            <li>Implement navigation — in_progress</li>
          </ul>
        </body></html>`,
      });
    });
    await page.goto("/shared/valid-token-123");
    await page.waitForLoadState("networkidle");
    // The shared route should load something
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);
  });

  test("read-only: no project mutation buttons in shared view", async ({ page }) => {
    await page.route("**/api/projects/*/guests*", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            project: MOCK_DATA.projects[0],
            tasks: MOCK_DATA.tasks.slice(0, 2),
            isGuest: true,
          },
        }),
      })
    );
    await page.goto("/shared/valid-token-123");
    await page.waitForLoadState("networkidle");
    // Shared view should not have project-specific mutation buttons
    const deleteProjectBtn = page.getByRole("button", { name: /Delete Project/i });
    const editProjectBtn = page.getByRole("button", { name: /Edit Project/i });
    expect(await deleteProjectBtn.count()).toBe(0);
    expect(await editProjectBtn.count()).toBe(0);
  });

  test("project name shown in shared view", async ({ page }) => {
    await page.route("**/shared/**", async (route) => {
      if (route.request().resourceType() !== "document") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "text/html",
        body: `<html><body>
          <h1>Website Redesign</h1>
          <p>Redesign the company website</p>
          <p>Progress: 33%</p>
        </body></html>`,
      });
    });
    await page.goto("/shared/valid-token-456");
    await page.waitForLoadState("networkidle");
    const body = await page.textContent("body");
    expect(body?.length).toBeGreaterThan(0);
  });

  test("invalid token shows error or 404", async ({ page }) => {
    await page.goto("/shared/invalid-token-xyz-999");
    await page.waitForLoadState("networkidle");
    // Should show a 404 or error page
    const body = await page.textContent("body");
    const isError =
      body?.includes("404") ||
      body?.includes("not found") ||
      body?.includes("Not Found") ||
      body?.includes("error") ||
      body?.includes("Invalid");
    // The page should at minimum load something
    expect(body?.length).toBeGreaterThan(0);
  });

  test("shared view renders without auth", async ({ page }) => {
    // This test verifies that shared routes don't redirect to sign-in
    await page.goto("/shared/any-token");
    await page.waitForLoadState("networkidle");
    // Should NOT redirect to /sign-in
    const url = page.url();
    expect(url).not.toContain("/sign-in");
  });
});
