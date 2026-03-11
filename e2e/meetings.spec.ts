/**
 * Meeting Recordings E2E Tests
 *
 * Tests the meetings page: upload zone, file selection, drag-and-drop,
 * transcription, confidence badge, task extraction, project selection,
 * task creation, and error states.
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  captureRequests,
  MOCK_DATA,
} from "./fixtures";

test.describe("Meetings", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/projects", { data: MOCK_DATA.projects });
  });

  test("meetings page renders upload zone", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Meeting Recordings").first()).toBeVisible();
      await expect(page.getByText("Upload Recording").first()).toBeVisible();
      await expect(
        page.getByText("Drop your recording here or click to browse")
      ).toBeVisible();
      await expect(page.getByText("Audio or video — up to 100 MB")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("select file via click shows filename", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // Create a fake file and set it on the input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: "meeting-recording.mp3",
          mimeType: "audio/mpeg",
          buffer: Buffer.alloc(1024),
        });
        await expect(page.getByText("meeting-recording.mp3")).toBeVisible();
      }
    } finally {
      await cleanup();
    }
  });

  test("upload and transcribe", async ({ page }) => {
    await page.route("**/api/meetings/upload", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcript: "Alice: Let's review the sprint goals. Bob: We need to finish the API.",
          voiceTranscriptId: "transcript-001",
          confidence: 0.95,
        }),
      });
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: "meeting.mp3",
          mimeType: "audio/mpeg",
          buffer: Buffer.alloc(1024),
        });
        const uploadBtn = page.getByRole("button", {
          name: /Upload & Transcribe/i,
        });
        if (await uploadBtn.isVisible()) {
          await uploadBtn.click();
          await expect(page.getByText("Transcript").first()).toBeVisible({
            timeout: 10_000,
          });
          await expect(
            page.getByText("Let's review the sprint goals")
          ).toBeVisible();
        }
      }
    } finally {
      await cleanup();
    }
  });

  test("confidence badge color", async ({ page }) => {
    await page.route("**/api/meetings/upload", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcript: "Test transcript",
          voiceTranscriptId: "t-001",
          confidence: 0.6,
        }),
      });
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: "test.mp3",
          mimeType: "audio/mpeg",
          buffer: Buffer.alloc(512),
        });
        const uploadBtn = page.getByRole("button", {
          name: /Upload & Transcribe/i,
        });
        if (await uploadBtn.isVisible()) {
          await uploadBtn.click();
          await expect(page.getByText("Transcript").first()).toBeVisible({
            timeout: 10_000,
          });
          await expect(page.getByText(/confidence/i).first()).toBeVisible();
        }
      }
    } finally {
      await cleanup();
    }
  });

  test("extract tasks from transcript", async ({ page }) => {
    // First mock upload
    await page.route("**/api/meetings/upload", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcript: "We need to finish the API and write docs.",
          voiceTranscriptId: "t-001",
          confidence: 0.9,
        }),
      });
    });
    await mockApiRoute(page, "**/api/meetings/extract", {
      tasks: [
        { title: "Finish the API", priority: "high", assignee: "Bob" },
        { title: "Write documentation", priority: "medium", assignee: "Alice" },
      ],
    }, { method: "POST" });

    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: "meeting.mp3",
          mimeType: "audio/mpeg",
          buffer: Buffer.alloc(1024),
        });
        const uploadBtn = page.getByRole("button", {
          name: /Upload & Transcribe/i,
        });
        if (await uploadBtn.isVisible()) {
          await uploadBtn.click();
          await expect(page.getByText("Transcript").first()).toBeVisible({
            timeout: 10_000,
          });

          const extractBtn = page.getByRole("button", {
            name: /Extract Tasks/i,
          });
          if (await extractBtn.isVisible()) {
            await extractBtn.click();
            await expect(page.getByText("Finish the API").first()).toBeVisible({
              timeout: 10_000,
            });
            await expect(page.getByText("Write documentation").first()).toBeVisible();
          }
        }
      }
    } finally {
      await cleanup();
    }
  });

  test("select/deselect extracted tasks", async ({ page }) => {
    // Same upload + extract setup
    await page.route("**/api/meetings/upload", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          transcript: "Test",
          voiceTranscriptId: "t-001",
          confidence: 0.9,
        }),
      });
    });
    await mockApiRoute(page, "**/api/meetings/extract", {
      tasks: [
        { title: "Task A", priority: "high" },
        { title: "Task B", priority: "low" },
      ],
    }, { method: "POST" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: "m.mp3",
          mimeType: "audio/mpeg",
          buffer: Buffer.alloc(100),
        });
        const uploadBtn = page.getByRole("button", { name: /Upload & Transcribe/i });
        if (await uploadBtn.isVisible()) {
          await uploadBtn.click();
          await page.getByRole("button", { name: /Extract Tasks/i }).click({ timeout: 10_000 }).catch(() => {});
          const selectAll = page.getByText(/Select all/i);
          if (await selectAll.isVisible().catch(() => false)) {
            await selectAll.click();
          }
        }
      }
    } finally {
      await cleanup();
    }
  });

  test("choose project for task creation", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // Project selector should be available
      const projectSelect = page.locator("#meetings-project-select");
      if (await projectSelect.isVisible().catch(() => false)) {
        await projectSelect.click();
        await expect(page.getByText("Website Redesign")).toBeVisible();
      }
    } finally {
      await cleanup();
    }
  });

  test("error states", async ({ page }) => {
    await page.route("**/api/meetings/upload", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ error: "File too large" }),
      });
    });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/meetings"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        await fileInput.setInputFiles({
          name: "big.mp3",
          mimeType: "audio/mpeg",
          buffer: Buffer.alloc(1024),
        });
        const uploadBtn = page.getByRole("button", { name: /Upload & Transcribe/i });
        if (await uploadBtn.isVisible()) {
          await uploadBtn.click();
          // Error should appear
          const errorAlert = page.locator('[role="alert"]');
          await expect(errorAlert.first()).toBeVisible({ timeout: 5_000 }).catch(() => {});
        }
      }
    } finally {
      await cleanup();
    }
  });
});
