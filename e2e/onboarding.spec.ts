/**
 * Onboarding Flow E2E Tests
 *
 * Tests the conversational chat-based onboarding experience:
 *   - Welcome message is shown
 *   - User types responses in a textarea
 *   - Messages are sent to /api/pa/onboard
 *   - On setupComplete, user is redirected to /dashboard
 *
 * Auth: Creates a confirmed test user via Supabase Admin API, then injects
 * session cookies programmatically. Mocks the /api/pa/onboard endpoint so
 * tests don't depend on AI or database state.
 */

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load env from .env.local so Supabase credentials are available
config({ path: resolve(__dirname, "..", ".env.local") });

// ── Constants ────────────────────────────────────────────────────────────

const MOCK_ORG_ID = "e2e-00000000-0000-0000-0000-000000000001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PROJECT_REF = SUPABASE_URL.match(/\/\/([^.]+)\./)?.[1] ?? "";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Chunk a string for Supabase SSR multi-cookie storage. */
function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

/**
 * Create a confirmed test user via Admin API, sign in programmatically,
 * inject session cookies, then navigate to /onboarding.
 */
async function createUserAndReachOnboarding(page: Page): Promise<{
  reached: boolean;
  cleanup: () => Promise<void>;
}> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey || !anonKey || !PROJECT_REF) {
    return { reached: false, cleanup: async () => {} };
  }

  const admin = createClient(url, serviceKey);
  const email = `e2e-onboard-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.hive.dev`;
  const password = "E2eTestPass123!";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Onboarding User" },
  });

  if (error || !data.user) {
    return { reached: false, cleanup: async () => {} };
  }

  const userId = data.user.id;
  const cleanup = async () => {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  };

  const anonClient = createClient(url, anonKey);
  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    return { reached: false, cleanup };
  }

  // Inject session cookies into browser context
  const cookieName = `sb-${PROJECT_REF}-auth-token`;
  const sessionJson = JSON.stringify(signInData.session);
  const chunks = chunkString(sessionJson, 3180);
  const context = page.context();

  if (chunks.length === 1) {
    await context.addCookies([
      {
        name: cookieName,
        value: sessionJson,
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax",
      },
    ]);
  } else {
    await context.addCookies(
      chunks.map((chunk, i) => ({
        name: `${cookieName}.${i}`,
        value: chunk,
        domain: "localhost",
        path: "/",
        httpOnly: false,
        secure: false,
        sameSite: "Lax" as const,
      }))
    );
  }

  await page.goto("/onboarding");
  await page
    .waitForURL(/\/(onboarding|dashboard)/, { timeout: 10_000 })
    .catch(() => {});

  if (page.url().includes("/onboarding")) {
    return { reached: true, cleanup };
  }

  if (page.url().includes("/dashboard")) {
    await page.goto("/onboarding");
    return { reached: page.url().includes("/onboarding"), cleanup };
  }

  return { reached: false, cleanup };
}

/** Mock /api/pa/onboard to return controlled responses. */
async function mockOnboardApi(
  page: Page,
  responses: Array<{
    message: string;
    setupComplete?: boolean;
    orgId?: string;
  }>
) {
  let callIndex = 0;
  const captured: Array<{ messages: unknown; orgId: unknown }> = [];

  await page.route("**/api/pa/onboard", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();

    const body = JSON.parse(route.request().postData() ?? "{}");
    captured.push({ messages: body.messages, orgId: body.orgId });

    const response = responses[callIndex] ?? {
      message: "I ran into an issue. Let me try again.",
    };
    callIndex++;

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        message: response.message,
        setupComplete: response.setupComplete ?? false,
        orgId: response.orgId ?? null,
      }),
    });
  });

  return captured;
}

// ── Auth Guard ───────────────────────────────────────────────────────────

test.describe("Onboarding — Auth Guard", () => {
  test("unauthenticated visit to /onboarding redirects to /sign-in", async ({
    page,
  }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("sign-in page renders correctly after redirect", async ({ page }) => {
    await page.goto("/onboarding");
    await page.waitForURL(/\/sign-in/, { timeout: 10_000 });
    await expect(page.getByText(/Welcome back to Hive/i)).toBeVisible();
  });
});

// ── Chat UI Rendering ────────────────────────────────────────────────────

test.describe("Onboarding — Chat UI", () => {
  test.setTimeout(60_000);

  test("renders page heading and welcome message", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      // Page heading
      await expect(
        page.getByText(/Let.s build your workspace/i)
      ).toBeVisible();
      await expect(
        page.getByText(/A few quick questions and you.re in/i)
      ).toBeVisible();

      // Welcome message from assistant
      await expect(
        page.getByText(/Welcome to the Hive/i)
      ).toBeVisible();
      await expect(
        page.getByText(/What's your team or company called/i)
      ).toBeVisible();

      // Input area
      await expect(
        page.getByPlaceholder("Type your response...")
      ).toBeVisible();

      // Send button
      await expect(
        page.getByRole("button", { name: "Send" })
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("send button is disabled when input is empty", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const sendBtn = page.getByRole("button", { name: "Send" });
      await expect(sendBtn).toBeDisabled();

      // Type something → enabled
      await page.getByPlaceholder("Type your response...").fill("Hello");
      await expect(sendBtn).toBeEnabled();

      // Clear → disabled again
      await page.getByPlaceholder("Type your response...").fill("");
      await expect(sendBtn).toBeDisabled();
    } finally {
      await cleanup();
    }
  });

  test("Hive logo links to home page", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const logo = page.getByRole("link").filter({ hasText: "Hive" });
      await expect(logo).toHaveAttribute("href", "/");
    } finally {
      await cleanup();
    }
  });
});

// ── Chat Interaction ─────────────────────────────────────────────────────

test.describe("Onboarding — Chat Interaction", () => {
  test.setTimeout(60_000);

  test("user can type and send a message", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await mockOnboardApi(page, [
        { message: "Great name! What kind of work does your team do?" },
      ]);

      const input = page.getByPlaceholder("Type your response...");
      await input.fill("Acme Corp");
      await page.getByRole("button", { name: "Send" }).click();

      // User message appears
      await expect(page.getByText("Acme Corp")).toBeVisible();

      // Assistant response appears
      await expect(
        page.getByText("Great name! What kind of work does your team do?")
      ).toBeVisible();

      // Verify captured payload
      expect(captured.length).toBe(1);
      const sentMessages = captured[0].messages as Array<{
        role: string;
        content: string;
      }>;
      expect(sentMessages).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ role: "user", content: "Acme Corp" }),
        ])
      );
    } finally {
      await cleanup();
    }
  });

  test("Enter key sends message (without Shift)", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await mockOnboardApi(page, [
        { message: "Nice! Tell me about your projects." },
      ]);

      const input = page.getByPlaceholder("Type your response...");
      await input.fill("My Team");
      await input.press("Enter");

      // User message appears
      await expect(page.getByText("My Team")).toBeVisible();

      // Assistant response appears
      await expect(
        page.getByText("Nice! Tell me about your projects.")
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("shows loading state while waiting for response", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      // Delay the API response
      await page.route("**/api/pa/onboard", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await new Promise((r) => setTimeout(r, 1500));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Got it!",
            setupComplete: false,
            orgId: null,
          }),
        });
      });

      const input = page.getByPlaceholder("Type your response...");
      await input.fill("Test loading");
      await page.getByRole("button", { name: "Send" }).click();

      // Loading indicator visible
      await expect(page.getByText("Setting things up...")).toBeVisible();

      // After response, loading disappears and response appears
      await expect(page.getByText("Got it!")).toBeVisible({ timeout: 5_000 });
    } finally {
      await cleanup();
    }
  });

  test("shows error message when API fails", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await page.route("**/api/pa/onboard", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      });

      await page.getByPlaceholder("Type your response...").fill("Hello");
      await page.getByRole("button", { name: "Send" }).click();

      // Error message from the client-side catch
      await expect(
        page.getByText("I ran into a hiccup. Could you try that again?")
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("input is disabled while loading", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await page.route("**/api/pa/onboard", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await new Promise((r) => setTimeout(r, 2000));
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "Done!",
            setupComplete: false,
            orgId: null,
          }),
        });
      });

      const input = page.getByPlaceholder("Type your response...");
      await input.fill("Test");
      await page.getByRole("button", { name: "Send" }).click();

      // Input should be disabled while loading
      await expect(input).toBeDisabled();

      // Wait for response, then input should be enabled again
      await expect(page.getByText("Done!")).toBeVisible({ timeout: 5_000 });
      await expect(input).toBeEnabled();
    } finally {
      await cleanup();
    }
  });
});

// ── Complete Setup Flow ──────────────────────────────────────────────────

test.describe("Onboarding — Complete Flow", () => {
  test.setTimeout(60_000);

  test("multi-turn conversation ending with setup complete and redirect", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await mockOnboardApi(page, [
        {
          message: "Great name! What kind of projects does your team work on?",
          orgId: MOCK_ORG_ID,
        },
        {
          message:
            "Sounds great! Your workspace is all set up. Taking you there now.",
          setupComplete: true,
          orgId: MOCK_ORG_ID,
        },
      ]);

      // Mock dashboard navigation for redirect
      await page.route(/\/dashboard(\?|$)/, async (route) => {
        if (route.request().url().includes("/api/")) return route.fallback();
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "<html><body><div>Dashboard</div></body></html>",
        });
      });

      // Turn 1: provide org name
      const input = page.getByPlaceholder("Type your response...");
      await input.fill("Acme Corp");
      await page.getByRole("button", { name: "Send" }).click();
      await expect(
        page.getByText("What kind of projects does your team work on?")
      ).toBeVisible();

      // Turn 2: describe work
      await input.fill("We build software products");
      await input.press("Enter");
      await expect(
        page.getByText("Your workspace is all set up")
      ).toBeVisible();

      // Setup complete indicator
      await expect(
        page.getByText("Taking you to your workspace...")
      ).toBeVisible();

      // Input should be hidden after setup complete
      await expect(input).not.toBeVisible();

      // Verify orgId was stored in sessionStorage
      const storedOrgId = await page.evaluate(() =>
        sessionStorage.getItem("hive-org-id")
      );
      expect(storedOrgId).toBe(MOCK_ORG_ID);

      // Verify API was called with correct conversation history
      expect(captured.length).toBe(2);
      // Second call should include orgId from first response
      expect(captured[1].orgId).toBe(MOCK_ORG_ID);

      // Should redirect to dashboard
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });

  test("orgId is persisted and passed in subsequent API calls", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await mockOnboardApi(page, [
        {
          message: "Got it! What do you work on?",
          orgId: MOCK_ORG_ID,
        },
        {
          message: "Perfect!",
          orgId: MOCK_ORG_ID,
        },
      ]);

      const input = page.getByPlaceholder("Type your response...");

      // Turn 1
      await input.fill("Team Alpha");
      await input.press("Enter");
      await expect(page.getByText("Got it! What do you work on?")).toBeVisible();

      // First call should have no orgId
      expect(captured[0].orgId).toBeUndefined();

      // Turn 2
      await input.fill("Engineering");
      await input.press("Enter");
      await expect(page.getByText("Perfect!")).toBeVisible();

      // Second call should pass the orgId received from first response
      expect(captured[1].orgId).toBe(MOCK_ORG_ID);
    } finally {
      await cleanup();
    }
  });
});
