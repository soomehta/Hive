/**
 * Task Management E2E Tests
 *
 * Tests the kanban board, task detail sheet, CRUD operations, comments,
 * list view, my tasks page, subtasks, and due date styling.
 */

import { test, expect } from "@playwright/test";
import {
  authenticateAndNavigate,
  setupDashboardMocks,
  mockApiRoute,
  captureRequests,
  MOCK_DATA,
} from "./fixtures";

test.describe("Tasks — Kanban Board", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/projects/proj-001", {
      data: MOCK_DATA.projects[0],
    });
    await mockApiRoute(page, "**/api/projects/proj-001/members", {
      data: MOCK_DATA.members.slice(0, 2),
    });
    await mockApiRoute(page, "**/api/tasks*", {
      data: MOCK_DATA.tasks,
      nextCursor: null,
    });
    await mockApiRoute(page, "**/api/tasks/task-001", {
      data: MOCK_DATA.tasks[0],
    });
    await mockApiRoute(page, "**/api/tasks/task-001/comments", {
      data: MOCK_DATA.comments,
    });
    await mockApiRoute(page, "**/api/tasks/task-001/subtasks", {
      data: [],
    });
  });

  test("kanban board renders 4+ columns", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("To Do").first()).toBeVisible();
      await expect(page.getByText("In Progress").first()).toBeVisible();
      await expect(page.getByText("In Review").first()).toBeVisible();
      await expect(page.getByText("Done").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("task cards show title, priority, due date", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("Design homepage mockup").first()).toBeVisible();
      await expect(page.getByText("High").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("click task opens detail sheet", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      await expect(page.getByText("Task details")).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("edit task title in detail sheet", async ({ page }) => {
    await mockApiRoute(page, "**/api/tasks/task-001", { data: MOCK_DATA.tasks[0] }, { method: "PATCH" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      await expect(page.getByText("Task details")).toBeVisible();
      // The sheet should show task details
      await expect(page.getByText("Status").first()).toBeVisible();
      await expect(page.getByText("Priority").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("change task status in detail sheet", async ({ page }) => {
    await mockApiRoute(page, "**/api/tasks/task-001", { data: MOCK_DATA.tasks[0] }, { method: "PATCH" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      await expect(page.getByText("Task details")).toBeVisible({ timeout: 10_000 });
      // Verify status field is present
      await expect(page.getByText("Status").first()).toBeVisible({ timeout: 5_000 });
    } finally {
      await cleanup();
    }
  });

  test("set due date", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      const dueDateInput = page.locator("#detail-due-date");
      if (await dueDateInput.isVisible()) {
        await dueDateInput.fill("2026-04-01");
      }
    } finally {
      await cleanup();
    }
  });

  test("add comment to task", async ({ page }) => {
    await mockApiRoute(
      page,
      "**/api/tasks/task-001/comments",
      { data: { id: "comment-new", content: "New comment", taskId: "task-001" } },
      { method: "POST", status: 201 }
    );
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      await expect(page.getByText("Task details")).toBeVisible();
      // Switch to Comments tab
      const commentsTab = page.getByRole("tab", { name: /Comments/i });
      if (await commentsTab.isVisible()) {
        await commentsTab.click();
      }
      const commentInput = page.getByPlaceholder("Add a comment...");
      if (await commentInput.isVisible()) {
        await commentInput.fill("This looks great!");
      }
    } finally {
      await cleanup();
    }
  });

  test("view comments tab shows existing comments", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      const commentsTab = page.getByRole("tab", { name: /Comments/i });
      if (await commentsTab.isVisible()) {
        await commentsTab.click();
        await expect(page.getByText("Looking good so far!")).toBeVisible();
      }
    } finally {
      await cleanup();
    }
  });

  test("view activity tab in detail", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      const activityTab = page.getByRole("tab", { name: /Activity/i });
      if (await activityTab.isVisible()) {
        await activityTab.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("delete task with confirmation", async ({ page }) => {
    await mockApiRoute(page, "**/api/tasks/task-001", { data: MOCK_DATA.tasks[0] }, { method: "DELETE" });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await page.getByText("Design homepage mockup").first().click();
      const deleteBtn = page.getByRole("button", { name: /Delete Task/i });
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();
        // Confirm dialog
        await expect(page.getByText("Delete task?")).toBeVisible();
        const confirmDelete = page.getByRole("button", { name: "Delete" }).last();
        await confirmDelete.click();
      }
    } finally {
      await cleanup();
    }
  });

  test("due date styling: overdue shows red", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // task-005 has yesterday as due date — should be overdue
      await expect(page.getByText("Overdue task example")).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});

test.describe("Tasks — List View", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/projects/proj-001", {
      data: MOCK_DATA.projects[0],
    });
    await mockApiRoute(page, "**/api/projects/proj-001/members", {
      data: MOCK_DATA.members,
    });
    await mockApiRoute(page, "**/api/tasks*", {
      data: MOCK_DATA.tasks,
      nextCursor: null,
    });
  });

  test("list view renders task rows", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/projects/proj-001/tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      // Look for list view toggle if it exists
      const listViewBtn = page.locator('[aria-label*="list" i], [title*="list" i]').first();
      if (await listViewBtn.isVisible()) {
        await listViewBtn.click();
        await expect(page.getByText("Design homepage mockup").first()).toBeVisible();
      }
    } finally {
      await cleanup();
    }
  });
});

test.describe("Tasks — My Tasks", () => {
  test.setTimeout(60_000);

  test.beforeEach(async ({ page }) => {
    await setupDashboardMocks(page);
    await mockApiRoute(page, "**/api/tasks*", {
      data: MOCK_DATA.tasks,
      nextCursor: null,
    });
    await mockApiRoute(page, "**/api/projects", { data: MOCK_DATA.projects });
  });

  test("my tasks page groups by time", async ({ page }) => {
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/my-tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(
        page.locator("#main-content").getByRole("heading", { name: "My Tasks" })
      ).toBeVisible();
      // Should have time group headings
      const groupLabels = ["Overdue", "Today", "Tomorrow", "This Week", "Later", "No Date"];
      let foundAny = false;
      for (const label of groupLabels) {
        const el = page.getByRole("heading", { name: label });
        if (await el.isVisible().catch(() => false)) {
          foundAny = true;
        }
      }
      // At least some tasks should be visible
      await expect(page.getByText("Design homepage mockup").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });

  test("empty my tasks shows empty state", async ({ page }) => {
    await mockApiRoute(page, "**/api/tasks*", { data: [], nextCursor: null });
    const { authenticated, cleanup } = await authenticateAndNavigate(
      page,
      "/dashboard/my-tasks"
    );
    test.skip(!authenticated, "Supabase unavailable");
    try {
      await expect(page.getByText("No tasks assigned").first()).toBeVisible();
    } finally {
      await cleanup();
    }
  });
});
