/**
 * Landing Page E2E Tests
 *
 * Covers the public-facing "/" route rendered by LandingPage component.
 * No auth or database required — all assertions are against static markup.
 *
 * Selectors are derived from src/components/landing/landing-page.tsx.
 */

import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  // ── Branding & Hero ───────────────────────────────────────────────────────

  test("page loads and shows Hive branding in the header", async ({ page }) => {
    // The header contains a <span> with "Hive" next to the Hexagon icon
    const headerBrand = page.locator("header").getByText("Hive");
    await expect(headerBrand).toBeVisible();
  });

  test("hero section shows badge text", async ({ page }) => {
    await expect(page.getByText("Project management that feels simpler")).toBeVisible();
  });

  test("hero section shows main h1 heading", async ({ page }) => {
    await expect(
      page.getByRole("heading", {
        name: /Less busywork\. More meaningful progress/i,
        level: 1,
      })
    ).toBeVisible();
  });

  test("hero section shows descriptive paragraph mentioning Hive", async ({
    page,
  }) => {
    await expect(
      page.getByText(/Hive keeps everything you need in one place/i)
    ).toBeVisible();
  });

  test("hero section has 'Start Free' CTA that links to /sign-up", async ({
    page,
  }) => {
    // Primary hero CTA button (inside the hero section, not the header)
    const heroCta = page
      .locator("section")
      .first()
      .getByRole("link", { name: /Start Free/i });
    await expect(heroCta).toBeVisible();
    await expect(heroCta).toHaveAttribute("href", "/sign-up");
  });

  test("hero section has 'See How It Works' anchor that points to #how-it-works", async ({
    page,
  }) => {
    const howItWorksLink = page.getByRole("link", {
      name: /See How It Works/i,
    });
    await expect(howItWorksLink).toBeVisible();
    await expect(howItWorksLink).toHaveAttribute("href", "#how-it-works");
  });

  // ── Header Navigation ─────────────────────────────────────────────────────

  test("header nav shows Features, How It Works, and Pricing anchor links", async ({
    page,
  }) => {
    const nav = page.locator("header nav");

    await expect(nav.getByText("Features")).toBeVisible();
    await expect(nav.getByText("How It Works")).toBeVisible();
    await expect(nav.getByText("Pricing")).toBeVisible();
  });

  test("header 'Sign In' button links to /sign-in", async ({ page }) => {
    const signInLink = page
      .locator("header")
      .getByRole("link", { name: "Sign In" });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", "/sign-in");
  });

  test("header 'Get Started Free' button links to /sign-up", async ({
    page,
  }) => {
    const getStartedLink = page
      .locator("header")
      .getByRole("link", { name: /Get Started Free/i });
    await expect(getStartedLink).toBeVisible();
    await expect(getStartedLink).toHaveAttribute("href", "/sign-up");
  });

  // ── PA Conversation Mockup ────────────────────────────────────────────────

  test("hero shows the PA conversation card with 'Hive PA' label", async ({
    page,
  }) => {
    await expect(page.getByText("Hive PA")).toBeVisible();
  });

  // ── Social Proof Bar ──────────────────────────────────────────────────────

  test("philosophy bar shows 'Voice-First', 'Your Workspace', and 'You Stay in Control'", async ({
    page,
  }) => {
    // Scope to the philosophy bar section (between hero and #features)
    const philBar = page.locator("section.border-y").first();
    await expect(philBar.getByText("Voice-First")).toBeVisible();
    await expect(philBar.getByText("Your Workspace")).toBeVisible();
    await expect(philBar.getByText("You Stay in Control")).toBeVisible();
  });

  // ── Features Section ──────────────────────────────────────────────────────

  test("features section heading is visible", async ({ page }) => {
    const featuresSection = page.locator("#features");
    await expect(featuresSection).toBeVisible();
    await expect(
      featuresSection.getByRole("heading", {
        name: /Everything your team needs/i,
      })
    ).toBeVisible();
  });

  test("all 6 feature card titles are visible inside #features", async ({
    page,
  }) => {
    const featuresSection = page.locator("#features");

    const expectedFeatures = [
      "Personal AI Assistant",
      "Voice-First Commands",
      "Graduated Autonomy",
      "Reports as Conversations",
      "Smart Integrations",
      "Morning Briefings",
    ];

    for (const title of expectedFeatures) {
      await expect(featuresSection.getByText(title)).toBeVisible();
    }
  });

  // ── How It Works Section ──────────────────────────────────────────────────

  test("#how-it-works section is visible with 3 step titles", async ({
    page,
  }) => {
    const howSection = page.locator("#how-it-works");
    await expect(howSection).toBeVisible();

    await expect(
      howSection.getByRole("heading", { name: /How it works/i })
    ).toBeVisible();

    await expect(howSection.getByText("Speak or Type")).toBeVisible();
    await expect(howSection.getByText("Hive Coordinates the Work")).toBeVisible();
    await expect(howSection.getByText("You Stay in Control")).toBeVisible();
  });

  // ── Pricing Section ───────────────────────────────────────────────────────

  test("pricing section heading is visible", async ({ page }) => {
    const pricingSection = page.locator("#pricing");
    await expect(pricingSection).toBeVisible();
    await expect(
      pricingSection.getByRole("heading", {
        name: /Simple, transparent pricing/i,
      })
    ).toBeVisible();
  });

  test("pricing section shows Free and Pro plan titles", async ({ page }) => {
    const pricingSection = page.locator("#pricing");

    await expect(
      pricingSection.getByText("Free", { exact: true })
    ).toBeVisible();
    await expect(
      pricingSection.getByText("Pro", { exact: true })
    ).toBeVisible();
  });

  test("pricing section shows $0 and $3 price amounts", async ({ page }) => {
    const pricingSection = page.locator("#pricing");

    await expect(pricingSection.getByText("$0")).toBeVisible();
    await expect(pricingSection.getByText("$3")).toBeVisible();
  });

  test("pricing Team card has 'Get Started Free' CTA linking to /sign-up", async ({
    page,
  }) => {
    const pricingSection = page.locator("#pricing");
    const teamCta = pricingSection.getByRole("link", {
      name: "Get Started Free",
    });
    await expect(teamCta).toBeVisible();
    await expect(teamCta).toHaveAttribute("href", "/sign-up");
  });

  test("pricing Pro card has 'Start Free Trial' CTA linking to /sign-up", async ({
    page,
  }) => {
    const pricingSection = page.locator("#pricing");
    const proCta = pricingSection.getByRole("link", {
      name: /Start Free Trial/i,
    });
    await expect(proCta).toBeVisible();
    await expect(proCta).toHaveAttribute("href", "/sign-up");
  });

  // ── Final CTA Section ─────────────────────────────────────────────────────

  test("final CTA section has 'Ready to make work feel lighter?' heading", async ({
    page,
  }) => {
    await expect(
      page.getByRole("heading", {
        name: /Ready to make work feel lighter\?/i,
      })
    ).toBeVisible();
  });

  // ── Footer ────────────────────────────────────────────────────────────────

  test("footer contains Hive branding and nav links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer.getByText("Hive", { exact: true })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Sign In" })).toBeVisible();
    await expect(footer.getByRole("link", { name: "Sign Up" })).toBeVisible();
  });

  // ── Responsive Behaviour ──────────────────────────────────────────────────

  test("desktop viewport (1280px): header nav is visible", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    // The nav uses `hidden md:flex` so at 1280px it should be visible
    const nav = page.locator("header nav");
    await expect(nav).toBeVisible();
  });

  test("mobile viewport (375px): header nav is hidden", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    // `hidden md:flex` collapses the nav below the md breakpoint (768px)
    const nav = page.locator("header nav");
    await expect(nav).toBeHidden();
  });

  test("mobile viewport (375px): hero h1 is still visible", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(
      page.getByRole("heading", {
        name: /Less busywork\. More meaningful progress/i,
        level: 1,
      })
    ).toBeVisible();
  });
});
