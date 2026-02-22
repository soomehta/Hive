/**
 * Onboarding Flow E2E Tests
 *
 * Tests the multi-step onboarding flow UI elements without requiring
 * real authentication. Verifies:
 *   - Auth guard (redirects unauthenticated users)
 *   - Sign-in page exists and is the redirect target
 *
 * Full onboarding flow tests (pathway selection, layout preview,
 * assistant intro) would require an authenticated session, which
 * is beyond the scope of smoke tests.
 */

import { test, expect } from "@playwright/test";

test.describe("Onboarding — Auth Guard", () => {
  test("unauthenticated visit to /onboarding redirects to /sign-in", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("Sign-In Page (onboarding redirect target)", () => {
  test("sign-in page renders correctly after onboarding redirect", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });

    // Verify the sign-in page loaded
    await expect(page.getByText(/Welcome back to Hive/i)).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});
