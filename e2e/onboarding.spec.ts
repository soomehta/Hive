/**
 * Onboarding Flow E2E Tests
 *
 * Covers the complete 4-step onboarding experience:
 *   Step 1: Create Organization (name + auto-slug)
 *   Step 2: Choose Workflow / Pathway (boards | lists | workspace)
 *   Step 3: Pick Dashboard Layout (preset cycler)
 *   Step 4: Meet Assistant Bee (intro + redirect to /dashboard)
 *
 * Auth: Creates a confirmed test user via Supabase Admin API, then injects
 * session cookies programmatically. Mocks onboarding API calls so tests
 * don't depend on database state while still validating the correct payloads.
 */

import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { resolve } from "path";

// Load env from .env.local so Supabase credentials are available
config({ path: resolve(__dirname, "..", ".env.local") });

// ── Constants & Types ───────────────────────────────────────────────────

const MOCK_ORG_ID = "e2e-00000000-0000-0000-0000-000000000001";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PROJECT_REF = SUPABASE_URL.match(/\/\/([^.]+)\./)?.[1] ?? "";

interface CapturedRequest {
  body: Record<string, unknown>;
  headers: Record<string, string>;
}

interface CapturedRequests {
  org?: CapturedRequest;
  pathway?: CapturedRequest;
  layout?: CapturedRequest;
}

// ── Helpers ─────────────────────────────────────────────────────────────

/** Mock the three onboarding API endpoints and capture request payloads + headers. */
async function setupOnboardingMocks(page: Page): Promise<CapturedRequests> {
  const captured: CapturedRequests = {};

  await page.route("**/api/organizations", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = JSON.parse(route.request().postData() ?? "{}");
    captured.org = {
      body,
      headers: route.request().headers(),
    };
    return route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: MOCK_ORG_ID,
          name: body.name,
          slug: body.slug,
          pathway: "boards",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route("**/api/dashboard/pathway", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = JSON.parse(route.request().postData() ?? "{}");
    captured.pathway = {
      body,
      headers: route.request().headers(),
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ id: MOCK_ORG_ID, pathway: body.pathway }),
    });
  });

  await page.route("**/api/dashboard/layouts*", async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const body = JSON.parse(route.request().postData() ?? "{}");
    captured.layout = {
      body,
      headers: route.request().headers(),
    };
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "e2e-00000000-0000-0000-0000-000000000002",
        orgId: MOCK_ORG_ID,
        pathway: body.pathway,
        layoutPresetIndex: body.layoutPresetIndex,
        isDefault: true,
      }),
    });
  });

  return captured;
}

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

/** Navigate steps 1-2 quickly to reach a specific step. */
async function advanceToStep(
  page: Page,
  target: "pathway" | "layout" | "assistant",
  pathway: "boards" | "lists" | "workspace" = "boards"
) {
  const pathwayLabels = {
    boards: "Boards",
    lists: "Lists & Timelines",
    workspace: "Full Workspace",
  };

  // Step 1 → fill org, continue
  await page.getByLabel("Organization name").fill("Test Org");
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.getByText("Choose your workflow")).toBeVisible();
  if (target === "pathway") return;

  // Step 2 → select pathway, continue
  await page.getByText(pathwayLabels[pathway], { exact: true }).click();
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.getByText("Pick a layout")).toBeVisible();
  if (target === "layout") return;

  // Step 3 → continue
  await page.getByRole("button", { name: /Continue/i }).click();
  await expect(page.getByText("Meet your Assistant Bee")).toBeVisible();
}

/** Mock the dashboard route so "Go to Dashboard" doesn't redirect back. */
async function mockDashboardNavigation(page: Page) {
  await page.route(/\/dashboard(\?|$)/, async (route) => {
    if (route.request().url().includes("/api/")) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<html><body><div>Dashboard</div></body></html>",
    });
  });
}

// ── Auth Guard ──────────────────────────────────────────────────────────

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
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
  });
});

// ── Step 1: Organization ────────────────────────────────────────────────

test.describe("Onboarding — Step 1: Organization", () => {
  test.setTimeout(60_000);

  test("renders org creation form with all elements", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await expect(
        page.getByText("Create your organization")
      ).toBeVisible();
      await expect(
        page.getByText("Create your workspace to get started")
      ).toBeVisible();
      await expect(page.getByLabel("Organization name")).toBeVisible();

      // Progress bar: 4 segments
      await expect(
        page.locator("div.flex.items-center.gap-1 > div.rounded-full")
      ).toHaveCount(4);

      // No Back button on first step
      await expect(
        page.getByRole("button", { name: /Back/i })
      ).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });

  test("auto-generates slug from org name", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const input = page.getByLabel("Organization name");

      // Basic slug
      await input.fill("Acme Corp");
      await expect(page.getByText("acme-corp")).toBeVisible();

      // Special characters stripped
      await input.fill("My Cool Company!!!");
      await expect(page.getByText("my-cool-company")).toBeVisible();

      // Multiple spaces/hyphens collapsed
      await input.fill("  Hello   World  ");
      await expect(page.getByText("hello-world")).toBeVisible();

      // Numbers preserved
      await input.fill("Team 42");
      await expect(page.getByText("team-42")).toBeVisible();

      // Empty slug hidden when name is empty
      await input.fill("");
      await expect(page.locator("text=Workspace URL")).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });

  test("sends correct org payload and stores orgId in sessionStorage", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);

      await page.getByLabel("Organization name").fill("Payload Test Inc");
      await page.getByRole("button", { name: /Continue/i }).click();

      await expect(page.getByText("Choose your workflow")).toBeVisible();

      // Verify API payload
      expect(captured.org!.body).toMatchObject({
        name: "Payload Test Inc",
        slug: "payload-test-inc",
      });

      // Verify sessionStorage
      const storedOrgId = await page.evaluate(() =>
        sessionStorage.getItem("hive-org-id")
      );
      expect(storedOrgId).toBe(MOCK_ORG_ID);
    } finally {
      await cleanup();
    }
  });

  test("shows error when org creation fails", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      // Mock org creation to fail
      await page.route("**/api/organizations", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        return route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "Organization slug already taken" }),
        });
      });

      await page.getByLabel("Organization name").fill("Taken Org");
      await page.getByRole("button", { name: /Continue/i }).click();

      // Should show error and stay on step 1
      await expect(
        page.getByText("Organization slug already taken")
      ).toBeVisible();
      await expect(
        page.getByText("Create your organization")
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("shows loading spinner during org creation", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      // Delay the API response to observe loading state
      await page.route("**/api/organizations", async (route) => {
        if (route.request().method() !== "POST") return route.fallback();
        await new Promise((r) => setTimeout(r, 1000));
        const body = JSON.parse(route.request().postData() ?? "{}");
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            data: {
              id: MOCK_ORG_ID,
              name: body.name,
              slug: body.slug,
              pathway: "boards",
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          }),
        });
      });

      await page.getByLabel("Organization name").fill("Loading Test");
      await page.getByRole("button", { name: /Continue/i }).click();

      // Loading text should appear while waiting
      await expect(page.getByText("Creating...")).toBeVisible();

      // Should advance after response
      await expect(page.getByText("Choose your workflow")).toBeVisible({
        timeout: 5_000,
      });
    } finally {
      await cleanup();
    }
  });
});

// ── Step 2: Pathway Selection ───────────────────────────────────────────

test.describe("Onboarding — Step 2: Pathway", () => {
  test.setTimeout(60_000);

  test("renders all three pathway cards with descriptions and features", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "pathway");

      // Titles
      await expect(
        page.getByText("Boards", { exact: true })
      ).toBeVisible();
      await expect(page.getByText("Lists & Timelines")).toBeVisible();
      await expect(page.getByText("Full Workspace")).toBeVisible();

      // Descriptions
      await expect(
        page.getByText("Simple and visual. Great for solo work or small teams.")
      ).toBeVisible();
      await expect(
        page.getByText("Balanced view with deadlines.")
      ).toBeVisible();
      await expect(
        page.getByText("Complete control over your dashboard.")
      ).toBeVisible();

      // Feature bullets across all cards
      await expect(page.getByText("Kanban board")).toBeVisible();
      await expect(page.getByText("Calendar view")).toBeVisible();
      await expect(page.getByText("Activity feed")).toBeVisible();
      await expect(page.getByText("AI assistant")).toBeVisible();
      await expect(page.getByText("Task list with sorting")).toBeVisible();
      await expect(page.getByText("Timeline / Gantt view")).toBeVisible();
      await expect(page.getByText("Files & documents")).toBeVisible();
      await expect(page.getByText("Team chat")).toBeVisible();
      await expect(page.getByText("Multi-slot layouts")).toBeVisible();

      // "You can change this later" note
      await expect(
        page.getByText("You can change this later")
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("Continue is disabled until a pathway is selected", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "pathway");

      const continueBtn = page.getByRole("button", { name: /Continue/i });
      await expect(continueBtn).toBeDisabled();

      // Select a pathway → enabled
      await page.getByText("Boards").first().click();
      await expect(continueBtn).toBeEnabled();
    } finally {
      await cleanup();
    }
  });

  test("can switch pathway selection before continuing", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);
      await advanceToStep(page, "pathway");

      // Select Boards first
      await page.getByText("Boards").first().click();
      const continueBtn = page.getByRole("button", { name: /Continue/i });
      await expect(continueBtn).toBeEnabled();

      // Switch to Lists
      await page.getByText("Lists & Timelines").click();
      await expect(continueBtn).toBeEnabled();

      // Switch to Workspace and continue
      await page.getByText("Full Workspace").click();
      await continueBtn.click();

      // Should have sent "workspace" not "boards"
      expect(captured.pathway!.body).toMatchObject({ pathway: "workspace" });
    } finally {
      await cleanup();
    }
  });

  test("sends x-org-id header with pathway API call", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);
      await advanceToStep(page, "pathway");

      await page.getByText("Boards").first().click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Pick a layout")).toBeVisible();

      expect(captured.pathway!.headers["x-org-id"]).toBe(MOCK_ORG_ID);
    } finally {
      await cleanup();
    }
  });
});

// ── Step 3: Layout ──────────────────────────────────────────────────────

test.describe("Onboarding — Step 3: Layout", () => {
  test.setTimeout(60_000);

  test("shows correct presets for Boards pathway", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "layout", "boards");

      const cycler = page.locator(
        ".flex.justify-center .flex.items-center.gap-2"
      );
      const nextBtn = cycler.locator("button").last();

      // Preset 1: Kanban Focus
      await expect(page.getByText("Kanban Focus").first()).toBeVisible();
      await expect(page.getByText("1 / 4")).toBeVisible();
      await expect(
        page.getByText("Full board with activity sidebar")
      ).toBeVisible();

      // Preset 2: Kanban + Metrics
      await nextBtn.click();
      await expect(page.getByText("Kanban + Metrics").first()).toBeVisible();
      await expect(page.getByText("2 / 4")).toBeVisible();

      // Preset 3: Kanban + Team
      await nextBtn.click();
      await expect(page.getByText("Kanban + Team").first()).toBeVisible();
      await expect(page.getByText("3 / 4")).toBeVisible();

      // Preset 4: Kanban + Calendar
      await nextBtn.click();
      await expect(
        page.getByText("Kanban + Calendar").first()
      ).toBeVisible();
      await expect(page.getByText("4 / 4")).toBeVisible();

      // Wraps to 1
      await nextBtn.click();
      await expect(page.getByText("Kanban Focus").first()).toBeVisible();
      await expect(page.getByText("1 / 4")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("shows correct presets for Lists pathway with backward wrap", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "layout", "lists");

      const cycler = page.locator(
        ".flex.justify-center .flex.items-center.gap-2"
      );
      const nextBtn = cycler.locator("button").last();
      const prevBtn = cycler.locator("button").first();

      // Boards presets must NOT appear
      await expect(page.getByText("Kanban Focus")).toHaveCount(0);

      // All list presets
      await expect(page.getByText("List Focus").first()).toBeVisible();
      await expect(page.getByText("1 / 4")).toBeVisible();

      await nextBtn.click();
      await expect(page.getByText("List + Timeline").first()).toBeVisible();

      await nextBtn.click();
      await expect(page.getByText("List + Metrics").first()).toBeVisible();

      await nextBtn.click();
      await expect(page.getByText("List + Calendar").first()).toBeVisible();
      await expect(page.getByText("4 / 4")).toBeVisible();

      // Forward wrap
      await nextBtn.click();
      await expect(page.getByText("List Focus").first()).toBeVisible();
      await expect(page.getByText("1 / 4")).toBeVisible();

      // Backward wrap
      await prevBtn.click();
      await expect(page.getByText("List + Calendar").first()).toBeVisible();
      await expect(page.getByText("4 / 4")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("shows correct presets for Workspace pathway", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "layout", "workspace");

      const cycler = page.locator(
        ".flex.justify-center .flex.items-center.gap-2"
      );
      const nextBtn = cycler.locator("button").last();

      await expect(page.getByText("Command Center").first()).toBeVisible();
      await expect(page.getByText("1 / 4")).toBeVisible();
      await expect(
        page.getByText("Full overview with all key widgets")
      ).toBeVisible();

      await nextBtn.click();
      await expect(page.getByText("Project Hub").first()).toBeVisible();
      await expect(
        page.getByText("Board, chat, and files together")
      ).toBeVisible();

      await nextBtn.click();
      await expect(page.getByText("Timeline Focus").first()).toBeVisible();
      await expect(
        page.getByText("Timeline with supporting widgets")
      ).toBeVisible();

      await nextBtn.click();
      await expect(page.getByText("Team Dashboard").first()).toBeVisible();
      await expect(page.getByText("People-centric view")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("sends correct layoutPresetIndex when user cycles to a non-default preset", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);
      await advanceToStep(page, "layout", "boards");

      // Cycle to preset index 2 (Kanban + Team)
      const cycler = page.locator(
        ".flex.justify-center .flex.items-center.gap-2"
      );
      const nextBtn = cycler.locator("button").last();
      await nextBtn.click(); // → index 1
      await nextBtn.click(); // → index 2
      await expect(page.getByText("Kanban + Team").first()).toBeVisible();
      await expect(page.getByText("3 / 4")).toBeVisible();

      // Continue to step 4
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Meet your Assistant Bee")).toBeVisible();

      // Verify payload sent preset index 2 with the right slots
      expect(captured.layout!.body).toMatchObject({
        pathway: "boards",
        layoutPresetIndex: 2,
        isDefault: true,
      });
      const slots = captured.layout!.body.slots as Array<{
        componentType: string;
      }>;
      expect(slots.length).toBe(2);
      expect(slots.map((s) => s.componentType)).toEqual([
        "board",
        "team_view",
      ]);
    } finally {
      await cleanup();
    }
  });

  test("sends x-org-id header with layout API call", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);
      await advanceToStep(page, "layout", "boards");

      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Meet your Assistant Bee")).toBeVisible();

      expect(captured.layout!.headers["x-org-id"]).toBe(MOCK_ORG_ID);
    } finally {
      await cleanup();
    }
  });

  test("layout grid preview shows slot components visually", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "layout", "boards");

      // Default Kanban Focus has: board + activity_feed
      await expect(
        page.getByText("Board", { exact: true })
      ).toBeVisible();
      await expect(
        page.getByText("Activity", { exact: true })
      ).toBeVisible();

      // Cycle to Kanban + Team → board + team_view
      const cycler = page.locator(
        ".flex.justify-center .flex.items-center.gap-2"
      );
      await cycler.locator("button").last().click();
      await cycler.locator("button").last().click();
      await expect(page.getByText("Kanban + Team").first()).toBeVisible();
      await expect(
        page.getByText("Team", { exact: true })
      ).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});

// ── Step 4: Assistant Intro ─────────────────────────────────────────────

test.describe("Onboarding — Step 4: Assistant", () => {
  test.setTimeout(60_000);

  test("renders assistant intro with all example prompts", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "assistant");

      await expect(
        page.getByText("Meet your Assistant Bee")
      ).toBeVisible();
      await expect(
        page.getByText(/Your personal AI assistant/i)
      ).toBeVisible();
      await expect(page.getByText(/type or speak naturally/i)).toBeVisible();
      await expect(page.getByText("Try saying...")).toBeVisible();

      // All 3 example prompts
      await expect(
        page.getByText(/Create a task to review the design mockups/i)
      ).toBeVisible();
      await expect(
        page.getByText(/What tasks are overdue/i)
      ).toBeVisible();
      await expect(
        page.getByText(/Schedule a team sync/i)
      ).toBeVisible();

      // Specialized bees note
      await expect(
        page.getByText(/coordinate with specialized bees/i)
      ).toBeVisible();

      // Go to Dashboard button
      await expect(
        page.getByRole("button", { name: /Go to Dashboard/i })
      ).toBeVisible();

      // No Back button on final step (none rendered)
      await expect(
        page.getByRole("button", { name: /Back/i })
      ).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });
});

// ── Navigation & State ──────────────────────────────────────────────────

test.describe("Onboarding — Navigation", () => {
  test.setTimeout(60_000);

  test("Back button preserves org name across step transitions", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);

      // Fill org name and advance
      const orgInput = page.getByLabel("Organization name");
      await orgInput.fill("Persistent Org");
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Choose your workflow")).toBeVisible();

      // Go back → org name preserved
      await page.getByRole("button", { name: /Back/i }).click();
      await expect(
        page.getByText("Create your organization")
      ).toBeVisible();
      await expect(orgInput).toHaveValue("Persistent Org");
      await expect(page.getByText("persistent-org")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("Back from step 3 returns to step 2", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);
      await advanceToStep(page, "layout", "lists");

      // Step 3 visible
      await expect(page.getByText("Pick a layout")).toBeVisible();

      // Go back to step 2
      await page.getByRole("button", { name: /Back/i }).click();
      await expect(page.getByText("Choose your workflow")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("progress bar advances with each step", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      await setupOnboardingMocks(page);

      const segments = page.locator(
        "div.flex.items-center.gap-1 > div.rounded-full"
      );
      await expect(segments).toHaveCount(4);

      // Step 1: first segment active (violet)
      await expect(segments.nth(0)).toHaveClass(/bg-violet/);
      await expect(segments.nth(1)).not.toHaveClass(/bg-violet/);

      // Advance to step 2
      await page.getByLabel("Organization name").fill("Progress Test");
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Choose your workflow")).toBeVisible();

      // Step 2: first two segments active
      await expect(segments.nth(0)).toHaveClass(/bg-violet/);
      await expect(segments.nth(1)).toHaveClass(/bg-violet/);
      await expect(segments.nth(2)).not.toHaveClass(/bg-violet/);

      // Advance to step 3
      await page.getByText("Boards").first().click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Pick a layout")).toBeVisible();

      // Step 3: first three segments active
      await expect(segments.nth(0)).toHaveClass(/bg-violet/);
      await expect(segments.nth(1)).toHaveClass(/bg-violet/);
      await expect(segments.nth(2)).toHaveClass(/bg-violet/);
      await expect(segments.nth(3)).not.toHaveClass(/bg-violet/);

      // Advance to step 4
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Meet your Assistant Bee")).toBeVisible();

      // Step 4: all segments active
      await expect(segments.nth(0)).toHaveClass(/bg-violet/);
      await expect(segments.nth(1)).toHaveClass(/bg-violet/);
      await expect(segments.nth(2)).toHaveClass(/bg-violet/);
      await expect(segments.nth(3)).toHaveClass(/bg-violet/);
    } finally {
      await cleanup();
    }
  });
});

// ── End-to-End Full Flows ───────────────────────────────────────────────

test.describe("Onboarding — Full Flow", () => {
  test.setTimeout(60_000);

  test("Boards: complete flow org → pathway → layout → assistant → dashboard", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);

      // Step 1
      await page.getByLabel("Organization name").fill("Boards Org");
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Choose your workflow")).toBeVisible();
      expect(captured.org!.body).toMatchObject({
        name: "Boards Org",
        slug: "boards-org",
      });

      // Step 2
      await page.getByText("Boards").first().click();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Pick a layout")).toBeVisible();
      expect(captured.pathway!.body).toMatchObject({ pathway: "boards" });

      // Step 3 — use default preset (index 0)
      await expect(page.getByText("Kanban Focus").first()).toBeVisible();
      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Meet your Assistant Bee")).toBeVisible();
      expect(captured.layout!.body).toMatchObject({
        pathway: "boards",
        layoutPresetIndex: 0,
        isDefault: true,
      });

      // Step 4
      await mockDashboardNavigation(page);
      await page
        .getByRole("button", { name: /Go to Dashboard/i })
        .click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });

  test("Lists: complete flow with non-default preset", async ({ page }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);

      // Step 1
      await page.getByLabel("Organization name").fill("Lists Org");
      await page.getByRole("button", { name: /Continue/i }).click();

      // Step 2
      await page.getByText("Lists & Timelines").click();
      await page.getByRole("button", { name: /Continue/i }).click();
      expect(captured.pathway!.body).toMatchObject({ pathway: "lists" });

      // Step 3 — cycle to "List + Calendar" (index 3)
      const cycler = page.locator(
        ".flex.justify-center .flex.items-center.gap-2"
      );
      const nextBtn = cycler.locator("button").last();
      await nextBtn.click(); // index 1
      await nextBtn.click(); // index 2
      await nextBtn.click(); // index 3
      await expect(page.getByText("List + Calendar").first()).toBeVisible();
      await expect(page.getByText("4 / 4")).toBeVisible();

      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Meet your Assistant Bee")).toBeVisible();

      expect(captured.layout!.body).toMatchObject({
        pathway: "lists",
        layoutPresetIndex: 3,
        isDefault: true,
      });
      const slots = captured.layout!.body.slots as Array<{
        componentType: string;
      }>;
      expect(slots.map((s) => s.componentType).sort()).toEqual([
        "calendar",
        "list",
      ]);

      // Step 4
      await mockDashboardNavigation(page);
      await page
        .getByRole("button", { name: /Go to Dashboard/i })
        .click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });

  test("Workspace: complete flow with non-default preset", async ({
    page,
  }) => {
    const { reached, cleanup } = await createUserAndReachOnboarding(page);
    test.skip(!reached, "Supabase unavailable");

    try {
      const captured = await setupOnboardingMocks(page);

      // Step 1
      await page.getByLabel("Organization name").fill("Workspace Org");
      await page.getByRole("button", { name: /Continue/i }).click();

      // Step 2
      await page.getByText("Full Workspace").click();
      await page.getByRole("button", { name: /Continue/i }).click();
      expect(captured.pathway!.body).toMatchObject({ pathway: "workspace" });

      // Step 3 — cycle to "Project Hub" (index 1)
      const cycler = page.locator(
        ".flex.justify-center .flex.items-center.gap-2"
      );
      await cycler.locator("button").last().click();
      await expect(page.getByText("Project Hub").first()).toBeVisible();
      await expect(page.getByText("2 / 4")).toBeVisible();

      await page.getByRole("button", { name: /Continue/i }).click();
      await expect(page.getByText("Meet your Assistant Bee")).toBeVisible();

      expect(captured.layout!.body).toMatchObject({
        pathway: "workspace",
        layoutPresetIndex: 1,
        isDefault: true,
      });
      const slots = captured.layout!.body.slots as Array<{
        componentType: string;
      }>;
      expect(slots.map((s) => s.componentType).sort()).toEqual([
        "board",
        "chat_messages",
        "files",
      ]);

      // Step 4
      await mockDashboardNavigation(page);
      await page
        .getByRole("button", { name: /Go to Dashboard/i })
        .click();
      await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 });
    } finally {
      await cleanup();
    }
  });
});
