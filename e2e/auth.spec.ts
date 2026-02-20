/**
 * Auth Pages E2E Tests
 *
 * Smoke-tests the /sign-in, /sign-up, and /onboarding pages without
 * performing real authentication.  Dashboard and onboarding auth-guard
 * redirects are also verified.
 *
 * Selectors are derived from:
 *   src/app/sign-in/page.tsx
 *   src/app/sign-up/page.tsx
 *   src/app/onboarding/page.tsx
 *   src/lib/supabase/middleware.ts  (redirect rules)
 */

import { test, expect } from "@playwright/test";

test.describe("Sign-In Page (/sign-in)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
  });

  test("page loads with 'Welcome back' heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Welcome back/i })
    ).toBeVisible();
  });

  test("page shows 'Sign in to your Hive account' description", async ({
    page,
  }) => {
    await expect(
      page.getByText(/Sign in to your Hive account/i)
    ).toBeVisible();
  });

  test("email input is present and typed as email", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("password input is present and typed as password", async ({ page }) => {
    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("submit button labelled 'Sign in' is present", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /^Sign in$/i })
    ).toBeVisible();
  });

  test("'Sign up' link is visible and points to /sign-up", async ({ page }) => {
    const signUpLink = page.getByRole("link", { name: /Sign up/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", "/sign-up");
  });

  test("email and password inputs accept typed values", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    const passwordInput = page.getByLabel("Password");

    await emailInput.fill("test@example.com");
    await passwordInput.fill("hunter2");

    await expect(emailInput).toHaveValue("test@example.com");
    await expect(passwordInput).toHaveValue("hunter2");
  });
});

test.describe("Sign-Up Page (/sign-up)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-up");
  });

  test("page loads with 'Create an account' heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /Create an account/i })
    ).toBeVisible();
  });

  test("page shows 'Get started with Hive' description", async ({ page }) => {
    await expect(page.getByText(/Get started with Hive/i)).toBeVisible();
  });

  test("'Full name' input is present and typed as text", async ({ page }) => {
    // Label text in page.tsx is "Full name" (lowercase 'n')
    const nameInput = page.getByLabel("Full name");
    await expect(nameInput).toBeVisible();
    await expect(nameInput).toHaveAttribute("type", "text");
  });

  test("email input is present and typed as email", async ({ page }) => {
    const emailInput = page.getByLabel("Email");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("password input is present and typed as password", async ({ page }) => {
    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("password input requires minimum 6 characters", async ({ page }) => {
    const passwordInput = page.getByLabel("Password");
    await expect(passwordInput).toHaveAttribute("minlength", "6");
  });

  test("submit button labelled 'Create account' is present", async ({
    page,
  }) => {
    await expect(
      page.getByRole("button", { name: /Create account/i })
    ).toBeVisible();
  });

  test("'Sign in' link is visible and points to /sign-in", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: /Sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/sign-in");
  });

  test("all three fields accept typed values", async ({ page }) => {
    await page.getByLabel("Full name").fill("Jane Doe");
    await page.getByLabel("Email").fill("jane@example.com");
    await page.getByLabel("Password").fill("secret123");

    await expect(page.getByLabel("Full name")).toHaveValue("Jane Doe");
    await expect(page.getByLabel("Email")).toHaveValue("jane@example.com");
    await expect(page.getByLabel("Password")).toHaveValue("secret123");
  });
});

test.describe("Onboarding Page (/onboarding)", () => {
  // NOTE: The middleware redirects unauthenticated users to /sign-in.
  // The assertions below verify the redirect; the page content tests
  // would require an authenticated session and are therefore skipped here.

  test("unauthenticated visit to /onboarding redirects to /sign-in", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("Auth Guard — Protected Routes", () => {
  test("/dashboard redirects unauthenticated users to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    // Middleware (src/lib/supabase/middleware.ts) redirects /dashboard/* to /sign-in
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("/dashboard/my-tasks redirects unauthenticated users to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/my-tasks");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("/dashboard/projects redirects unauthenticated users to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/projects");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("/dashboard/settings redirects unauthenticated users to /sign-in", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });
});

test.describe("Cross-Page Navigation from Sign-In", () => {
  test("clicking 'Sign up' link on /sign-in navigates to /sign-up", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByRole("link", { name: /Sign up/i }).click();
    await expect(page).toHaveURL(/\/sign-up/);
    await expect(
      page.getByRole("heading", { name: /Create an account/i })
    ).toBeVisible();
  });

  test("clicking 'Sign in' link on /sign-up navigates to /sign-in", async ({
    page,
  }) => {
    await page.goto("/sign-up");
    await page.getByRole("link", { name: /Sign in/i }).click();
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(
      page.getByRole("heading", { name: /Welcome back/i })
    ).toBeVisible();
  });
});
