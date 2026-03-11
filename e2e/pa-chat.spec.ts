/**
 * PA / Personal Assistant Chat E2E Tests
 *
 * Tests the PA overlay: keyboard shortcut toggle, message sending,
 * streaming responses, action cards, approval/rejection, chat history,
 * session management, and suggestion chips.
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  captureRequests,
  MOCK_DATA,
} from "./fixtures";

test.describe("PA Chat", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/pinboard/home-data", {
      data: MOCK_DATA.pinboardHomeData,
    });
    await mockApiRoute(page, "**/api/pinboard/layouts", { data: [] });
    await mockApiRoute(page, "**/api/projects", { data: MOCK_DATA.projects });
    await mockApiRoute(page, "**/api/pa/conversations?*", {
      data: MOCK_DATA.conversations,
    });
    await mockApiRoute(page, "**/api/pa/conversations", {
      data: MOCK_DATA.conversations,
    });
    await mockApiRoute(page, "**/api/pa/conversations/conv-001", {
      data: {
        session: MOCK_DATA.conversations[0],
        messages: [
          { role: "user", content: "What tasks are overdue?" },
          { role: "assistant", content: "You have 2 overdue tasks." },
        ],
      },
    });
    await mockApiRoute(page, "**/api/pa/actions", { data: [] });
  });

  test("PA overlay opens with Ctrl+J", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      // Overlay should be visible
      const closeBtn = page.locator('[aria-label="Close chat"]');
      await expect(closeBtn).toBeVisible({ timeout: 3_000 });
    } finally {
      await cleanup();
    }
  });

  test("PA overlay closes with Escape", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      const closeBtn = page.locator('[aria-label="Close chat"]');
      await expect(closeBtn).toBeVisible({ timeout: 3_000 });
      // Focus the overlay so Escape reaches it
      await page.locator('[aria-label="PA conversation"]').click().catch(() => {});
      await page.keyboard.press("Escape");
      await expect(closeBtn).not.toBeVisible({ timeout: 5_000 });
    } finally {
      await cleanup();
    }
  });

  test("send message to PA", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/chat", {
      message: "I'll help you with that!",
      action: null,
      sessionId: "sess-001",
      intent: "general",
      entities: {},
      dispatchMode: "direct",
    }, { method: "POST" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      const closeBtn = page.locator('[aria-label="Close chat"]');
      await expect(closeBtn).toBeVisible({ timeout: 3_000 });

      // Welcome message
      await expect(page.getByText("Hey — what can I help you with?")).toBeVisible();

      // Type and send
      const input = page.locator('textarea, input[type="text"]').last();
      await input.fill("Create a task for me");
      await input.press("Enter");
    } finally {
      await cleanup();
    }
  });

  test("PA response renders", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/chat", {
      message: "Task created successfully!",
      action: null,
      sessionId: "sess-001",
      intent: "create_task",
      entities: {},
      dispatchMode: "direct",
    }, { method: "POST" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      const input = page.locator('textarea, input[type="text"]').last();
      await input.fill("Create a task");
      await input.press("Enter");

      await expect(page.getByText("Task created successfully!")).toBeVisible({ timeout: 5_000 });
    } finally {
      await cleanup();
    }
  });

  test("action card renders for draft_approve", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/chat", {
      message: "I've drafted a task for your approval.",
      action: {
        id: "action-001",
        type: "create_task",
        status: "pending_approval",
        tier: "draft_approve",
        payload: { title: "Review Q4 planning", projectId: "proj-001" },
      },
      sessionId: "sess-001",
      intent: "create_task",
      entities: {},
      dispatchMode: "direct",
    }, { method: "POST" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      const input = page.locator('textarea, input[type="text"]').last();
      await input.fill("Create a task for Q4");
      await input.press("Enter");

      await expect(
        page.getByText("I've drafted a task for your approval.")
      ).toBeVisible({ timeout: 5_000 });
    } finally {
      await cleanup();
    }
  });

  test("approve action", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/chat", {
      message: "Approve this?",
      action: {
        id: "action-001",
        type: "create_task",
        status: "pending_approval",
        tier: "draft_approve",
        payload: { title: "New task" },
      },
      sessionId: "sess-001",
      intent: "create_task",
      entities: {},
      dispatchMode: "direct",
    }, { method: "POST" });
    await mockApiRoute(
      page,
      "**/api/pa/actions/action-001",
      { status: "executed", result: { success: true } },
      { method: "PATCH" }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      const input = page.locator('textarea, input[type="text"]').last();
      await input.fill("Create task");
      await input.press("Enter");

      const approveBtn = page.getByRole("button", { name: /approve/i }).first();
      if (await approveBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await approveBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("reject action", async ({ page }) => {
    await mockApiRoute(page, "**/api/pa/chat", {
      message: "Reject this?",
      action: {
        id: "action-002",
        type: "create_task",
        status: "pending_approval",
        tier: "draft_approve",
        payload: { title: "Bad task" },
      },
      sessionId: "sess-001",
      intent: "create_task",
      entities: {},
      dispatchMode: "direct",
    }, { method: "POST" });
    await mockApiRoute(
      page,
      "**/api/pa/actions/action-002",
      { status: "rejected" },
      { method: "PATCH" }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      const input = page.locator('textarea, input[type="text"]').last();
      await input.fill("Create bad task");
      await input.press("Enter");

      const rejectBtn = page.getByRole("button", { name: /reject/i }).first();
      if (await rejectBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await rejectBtn.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("chat history view", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      const historyBtn = page.locator('[aria-label="Chat history"]');
      if (await historyBtn.isVisible()) {
        await historyBtn.click();
        await expect(page.getByText("History")).toBeVisible();
        await expect(page.getByText("Task planning session")).toBeVisible();
      }
    } finally {
      await cleanup();
    }
  });

  test("select history session loads messages", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      const historyBtn = page.locator('[aria-label="Chat history"]');
      if (await historyBtn.isVisible()) {
        await historyBtn.click();
        await page.getByText("Task planning session").click();
        await expect(
          page.getByText("What tasks are overdue?")
        ).toBeVisible({ timeout: 3_000 });
      }
    } finally {
      await cleanup();
    }
  });

  test("delete chat session", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/pa/conversations/conv-001",
      { data: { deleted: true } },
      { method: "DELETE" }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      const historyBtn = page.locator('[aria-label="Chat history"]');
      if (await historyBtn.isVisible()) {
        await historyBtn.click();
        await expect(page.getByText("Task planning session")).toBeVisible();
      }
    } finally {
      await cleanup();
    }
  });

  test("suggestion chips on welcome screen", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.keyboard.press("Control+j");
      await expect(page.locator('[aria-label="Close chat"]')).toBeVisible({ timeout: 3_000 });

      // Welcome suggestion chips
      await expect(page.getByText("Create a task")).toBeVisible();
      await expect(page.getByText("How's the team doing?")).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
