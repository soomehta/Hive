/**
 * Shared E2E Test Fixtures
 *
 * Provides authentication helpers, API mock utilities, and reusable mock data
 * for all E2E spec files. Extracts the Supabase cookie injection pattern from
 * onboarding.spec.ts so every test can authenticate without duplication.
 */

import { type Page, type Route } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { config } from "dotenv";
import { resolve } from "path";
import postgres from "postgres";

config({ path: resolve(__dirname, "..", ".env.local") });

const DATABASE_URL = process.env.DATABASE_URL ?? "";

// ── Constants ────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const PROJECT_REF = SUPABASE_URL.match(/\/\/([^.]+)\./)?.[1] ?? "";

export const MOCK_ORG_ID = "e2e-00000000-0000-0000-0000-000000000001";
export const MOCK_WORKSPACE_ID = "e2e-ws-00000000-0000-0000-0000-000000000001";

// ── Cookie Helpers ───────────────────────────────────────────────────────

function chunkString(str: string, size: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < str.length; i += size) {
    chunks.push(str.slice(i, i + size));
  }
  return chunks;
}

// ── Auth Helpers ─────────────────────────────────────────────────────────

export interface AuthResult {
  authenticated: boolean;
  userId: string;
  cleanup: () => Promise<void>;
  adminClient: SupabaseClient;
}

/**
 * Create a test user, inject session cookies, and navigate to the given path.
 * Returns cleanup function to delete the user after the test.
 */
export async function authenticateAndNavigate(
  page: Page,
  path: string
): Promise<AuthResult> {
  const noop: AuthResult = {
    authenticated: false,
    userId: "",
    cleanup: async () => {},
    adminClient: null as unknown as SupabaseClient,
  };

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !SUPABASE_ANON_KEY || !PROJECT_REF) {
    return noop;
  }
  if (!DATABASE_URL) {
    return noop;
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@test.hive.dev`;
  const password = "E2eTestPass123!";

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "E2E Test User" },
  });

  if (error || !data.user) return noop;

  const userId = data.user.id;

  // Create an organization + membership so the user passes the dashboard
  // layout guard (redirects to /onboarding if no orgs)
  const orgId = randomUUID();
  const orgSlug = `e2e-${Date.now()}`;
  const sql = postgres(DATABASE_URL, { max: 1 });
  try {
    await sql`INSERT INTO organizations (id, name, slug) VALUES (${orgId}, ${"E2E Test Org"}, ${orgSlug})`;
    await sql`INSERT INTO organization_members (org_id, user_id, role) VALUES (${orgId}, ${userId}, ${"owner"})`;
  } catch (dbErr) {
    // If DB insert fails, still allow cleanup
    console.warn("Failed to create org for E2E user:", dbErr);
  }

  const cleanup = async () => {
    try {
      await sql`DELETE FROM organization_members WHERE org_id = ${orgId}`;
      await sql`DELETE FROM organizations WHERE id = ${orgId}`;
    } catch { /* ignore */ }
    await sql.end().catch(() => {});
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  };

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signInData, error: signInError } =
    await anonClient.auth.signInWithPassword({ email, password });

  if (signInError || !signInData.session) {
    return { ...noop, cleanup };
  }

  // Inject session cookies
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

  // Navigate to a same-origin page first to set sessionStorage
  await page.goto("/sign-in");
  await page.waitForLoadState("domcontentloaded");

  // Set org in sessionStorage so Zustand picks it up (useOrg hook)
  await page.evaluate(
    ([oid, oname]) => {
      sessionStorage.setItem(
        "hive-org",
        JSON.stringify({ state: { orgId: oid, orgName: oname }, version: 0 })
      );
    },
    [orgId, "E2E Test Org"]
  );

  // Set workspace in sessionStorage so useWorkspace hook picks it up
  await page.evaluate(
    ([wsId]) => {
      sessionStorage.setItem(
        "hive-workspace",
        JSON.stringify({ state: { activeWorkspaceId: wsId, activeWorkspaceName: "E2E Workspace" }, version: 0 })
      );
    },
    [MOCK_WORKSPACE_ID]
  );

  await page.goto(path);
  await page
    .waitForURL(new RegExp(`(${path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|/sign-in|/onboarding)`), {
      timeout: 15_000,
    })
    .catch(() => {});

  const authenticated = page.url().includes(path);

  return { authenticated, userId, cleanup, adminClient: admin };
}

// ── API Mock Helpers ─────────────────────────────────────────────────────

type RouteHandler = (route: Route) => Promise<void> | void;
type MockResponse = Record<string, unknown> | Array<unknown> | string;

/**
 * Mock an API route with a static response or dynamic handler.
 */
export async function mockApiRoute(
  page: Page,
  pattern: string,
  responseOrHandler: MockResponse | RouteHandler,
  options: { status?: number; method?: string } = {}
): Promise<void> {
  const { status = 200, method } = options;

  await page.route(pattern, async (route) => {
    if (method && route.request().method() !== method) {
      return route.fallback();
    }

    if (typeof responseOrHandler === "function") {
      return (responseOrHandler as RouteHandler)(route);
    }

    return route.fulfill({
      status,
      contentType: "application/json",
      body: JSON.stringify(responseOrHandler),
    });
  });
}

/**
 * Mock multiple API routes at once.
 */
export async function mockApiRoutes(
  page: Page,
  mocks: Array<{
    pattern: string;
    response: MockResponse | RouteHandler;
    status?: number;
    method?: string;
  }>
): Promise<void> {
  for (const mock of mocks) {
    await mockApiRoute(page, mock.pattern, mock.response, {
      status: mock.status,
      method: mock.method,
    });
  }
}

/**
 * Capture requests to a given pattern and return them.
 */
export async function captureRequests(
  page: Page,
  pattern: string
): Promise<Array<{ method: string; url: string; body: unknown }>> {
  const captured: Array<{ method: string; url: string; body: unknown }> = [];

  await page.route(pattern, async (route) => {
    const method = route.request().method();
    const url = route.request().url();
    let body: unknown = null;
    try {
      body = JSON.parse(route.request().postData() ?? "null");
    } catch {
      body = route.request().postData();
    }
    captured.push({ method, url, body });

    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { success: true } }),
    });
  });

  return captured;
}

// ── Mock Data ────────────────────────────────────────────────────────────

const now = new Date().toISOString();
const tomorrow = new Date(Date.now() + 86400000).toISOString();
const yesterday = new Date(Date.now() - 86400000).toISOString();
const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString();

export const MOCK_DATA = {
  projects: [
    {
      id: "proj-001",
      name: "Website Redesign",
      description: "Redesign the company website",
      status: "active",
      color: "#6366f1",
      orgId: MOCK_ORG_ID,
      createdBy: "user-001",
      startDate: yesterday,
      targetDate: nextWeek,
      createdAt: yesterday,
      updatedAt: now,
      taskCount: 12,
      completedTaskCount: 4,
      memberCount: 3,
      messageCount: 8,
    },
    {
      id: "proj-002",
      name: "Mobile App",
      description: "Build the mobile application",
      status: "active",
      color: "#10b981",
      orgId: MOCK_ORG_ID,
      createdBy: "user-001",
      startDate: now,
      targetDate: null,
      createdAt: now,
      updatedAt: now,
      taskCount: 5,
      completedTaskCount: 1,
      memberCount: 2,
      messageCount: 3,
    },
    {
      id: "proj-003",
      name: "Q4 Planning",
      description: "Plan Q4 initiatives",
      status: "completed",
      color: "#f59e0b",
      orgId: MOCK_ORG_ID,
      createdBy: "user-001",
      startDate: null,
      targetDate: null,
      createdAt: yesterday,
      updatedAt: now,
      taskCount: 8,
      completedTaskCount: 8,
      memberCount: 5,
      messageCount: 15,
    },
  ],

  tasks: [
    {
      id: "task-001",
      projectId: "proj-001",
      title: "Design homepage mockup",
      description: "Create mockup for the new homepage",
      status: "todo",
      priority: "high",
      assigneeId: "user-001",
      dueDate: tomorrow,
      isBlocked: false,
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: "task-002",
      projectId: "proj-001",
      title: "Implement navigation",
      description: "Build the nav component",
      status: "in_progress",
      priority: "medium",
      assigneeId: "user-002",
      dueDate: nextWeek,
      isBlocked: false,
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: "task-003",
      projectId: "proj-001",
      title: "Write unit tests",
      description: "Add test coverage",
      status: "in_review",
      priority: "low",
      assigneeId: "user-001",
      dueDate: null,
      isBlocked: false,
      createdBy: "user-001",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "task-004",
      projectId: "proj-001",
      title: "Fix mobile layout",
      description: "Fix responsive issues",
      status: "done",
      priority: "urgent",
      assigneeId: "user-001",
      dueDate: yesterday,
      isBlocked: false,
      createdBy: "user-002",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: "task-005",
      projectId: "proj-001",
      title: "Overdue task example",
      description: "This task is overdue",
      status: "todo",
      priority: "high",
      assigneeId: "user-001",
      dueDate: yesterday,
      isBlocked: false,
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: now,
    },
  ],

  members: [
    {
      userId: "user-001",
      fullName: "Alice Johnson",
      email: "alice@test.dev",
      role: "owner",
      jobTitle: "Product Manager",
      department: "Product",
      createdAt: yesterday,
    },
    {
      userId: "user-002",
      fullName: "Bob Smith",
      email: "bob@test.dev",
      role: "admin",
      jobTitle: "Engineer",
      department: "Engineering",
      createdAt: yesterday,
    },
    {
      userId: "user-003",
      fullName: "Carol Davis",
      email: "carol@test.dev",
      role: "member",
      jobTitle: "Designer",
      department: "Design",
      createdAt: now,
    },
  ],

  channels: [
    {
      id: "ch-001",
      name: "general",
      scope: "workspace",
      topic: "General discussion",
      isArchived: false,
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: now,
      unreadCount: 3,
    },
    {
      id: "ch-002",
      name: "engineering",
      scope: "workspace",
      topic: "Engineering updates",
      isArchived: false,
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: now,
      unreadCount: 0,
    },
    {
      id: "ch-003",
      name: "design",
      scope: "project",
      projectId: "proj-001",
      topic: "Design channel",
      isArchived: false,
      createdBy: "user-002",
      createdAt: now,
      updatedAt: now,
      unreadCount: 5,
    },
  ],

  messages: [
    {
      id: "msg-001",
      channelId: "ch-001",
      authorId: "user-001",
      content: "Hello everyone!",
      isPinned: false,
      isDeleted: false,
      createdAt: yesterday,
      updatedAt: yesterday,
      authorName: "Alice Johnson",
      reactions: [],
      threadReplyCount: 0,
    },
    {
      id: "msg-002",
      channelId: "ch-001",
      authorId: "user-002",
      content: "Hey Alice, ready for standup?",
      isPinned: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      authorName: "Bob Smith",
      reactions: [{ emoji: "👍", count: 2, hasReacted: true }],
      threadReplyCount: 3,
    },
  ],

  notices: [
    {
      id: "notice-001",
      title: "Company All-Hands Friday",
      body: "Join us for the quarterly all-hands meeting this Friday at 3pm.",
      status: "active",
      isPinned: true,
      orgId: MOCK_ORG_ID,
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: now,
    },
    {
      id: "notice-002",
      title: "Office Closure Next Monday",
      body: "The office will be closed next Monday for maintenance.",
      status: "active",
      isPinned: false,
      orgId: MOCK_ORG_ID,
      createdBy: "user-002",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "notice-003",
      title: "Archived Announcement",
      body: "This is an old archived notice.",
      status: "archived",
      isPinned: false,
      orgId: MOCK_ORG_ID,
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
  ],

  pages: [
    {
      id: "page-item-001",
      title: "Product Roadmap",
      type: "page",
      status: "active",
      createdBy: "user-001",
      createdAt: yesterday,
      updatedAt: now,
      page: {
        id: "page-001",
        itemId: "page-item-001",
        contentJson: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Roadmap content here" }] }] },
        plainText: "Roadmap content here",
      },
    },
    {
      id: "page-item-002",
      title: "Meeting Notes",
      type: "page",
      status: "active",
      createdBy: "user-002",
      createdAt: now,
      updatedAt: now,
      page: {
        id: "page-002",
        itemId: "page-item-002",
        contentJson: null,
        plainText: "",
      },
    },
  ],

  conversations: [
    {
      id: "conv-001",
      title: "Task planning session",
      userId: "user-001",
      createdAt: yesterday,
      updatedAt: now,
      messageCount: 5,
    },
    {
      id: "conv-002",
      title: "Weekly review",
      userId: "user-001",
      createdAt: now,
      updatedAt: now,
      messageCount: 3,
    },
  ],

  activity: [
    {
      id: "act-001",
      action: "task.created",
      entityType: "task",
      entityId: "task-001",
      userId: "user-001",
      orgId: MOCK_ORG_ID,
      metadata: { title: "Design homepage mockup" },
      createdAt: yesterday,
    },
    {
      id: "act-002",
      action: "task.status_changed",
      entityType: "task",
      entityId: "task-002",
      userId: "user-002",
      orgId: MOCK_ORG_ID,
      metadata: { title: "Implement navigation", from: "todo", to: "in_progress" },
      createdAt: now,
    },
  ],

  comments: [
    {
      id: "comment-001",
      taskId: "task-001",
      content: "Looking good so far!",
      authorId: "user-002",
      createdAt: yesterday,
      updatedAt: yesterday,
    },
    {
      id: "comment-002",
      taskId: "task-001",
      content: "Can we add a dark mode variant?",
      authorId: "user-001",
      createdAt: now,
      updatedAt: now,
    },
  ],

  integrations: [
    {
      id: "int-001",
      provider: "google",
      name: "Google",
      description: "Google Calendar and Gmail",
      isActive: true,
      providerAccountEmail: "alice@gmail.com",
      tokenExpiresAt: nextWeek,
      isExpired: false,
    },
  ],

  reports: [
    {
      id: "report-001",
      reportType: "daily_standup",
      title: "Daily Standup — March 6",
      content: "## Team Status\n\n3 tasks in progress, 1 blocker identified.",
      workspaceId: MOCK_WORKSPACE_ID,
      createdAt: yesterday,
    },
    {
      id: "report-002",
      reportType: "weekly_report",
      title: "Weekly Report — Week 10",
      content: "## Weekly Summary\n\nCompleted 8 tasks, 2 new blockers.",
      workspaceId: MOCK_WORKSPACE_ID,
      createdAt: now,
    },
  ],

  schedules: [
    {
      id: "sched-001",
      beeInstanceId: "bee-001",
      scheduleType: "daily_standup",
      cronExpression: "0 9 * * 1-5",
      timezone: "America/New_York",
      isActive: true,
      workspaceId: MOCK_WORKSPACE_ID,
      createdAt: yesterday,
    },
  ],

  pinboardHomeData: {
    layout: null,
    cards: {
      myTasks: [
        {
          id: "task-001",
          title: "Design homepage mockup",
          status: "todo",
          priority: "high",
          dueDate: tomorrow,
        },
        {
          id: "task-002",
          title: "Implement navigation",
          status: "in_progress",
          priority: "medium",
          dueDate: nextWeek,
        },
      ],
      notices: [
        {
          id: "notice-001",
          title: "Company All-Hands Friday",
          isPinned: true,
        },
      ],
      channels: [
        { id: "ch-001", name: "general", unreadCount: 3 },
        { id: "ch-002", name: "engineering", unreadCount: 0 },
      ],
      deadlines: [
        {
          id: "task-001",
          title: "Design homepage mockup",
          dueDate: tomorrow,
          priority: "high",
        },
      ],
      mentions: [
        {
          id: "act-002",
          type: "task_comment",
          action: "mention",
          metadata: { content: "mentioned you in a comment" },
          createdAt: now,
        },
      ],
      projectPulse: [
        { id: "proj-001", name: "Website Redesign", blockerCount: 1 },
      ],
      paBriefing: null,
    },
    unreadCounts: { "ch-001": 3, "ch-003": 5 },
  },

  searchResults: {
    tasks: [
      {
        type: "task",
        id: "task-001",
        title: "Design homepage mockup",
        snippet: "Create mockup for the new homepage",
        status: "todo",
        priority: "high",
        projectId: "proj-001",
        updatedAt: now,
      },
    ],
    projects: [
      {
        type: "project",
        id: "proj-001",
        title: "Website Redesign",
        snippet: "Redesign the company website",
        status: "active",
        updatedAt: now,
      },
    ],
    pages: [
      {
        type: "page",
        id: "page-item-001",
        title: "Product Roadmap",
        snippet: "Roadmap content here",
        updatedAt: now,
      },
    ],
    chat: [],
    notices: [],
  },

  paProfile: {
    id: "pa-001",
    userId: "user-001",
    autonomyMode: "copilot",
    verbosity: "balanced",
    formality: "professional",
    timezone: "America/New_York",
    personalityTraits: null,
    workingHoursStart: "09:00",
    workingHoursEnd: "17:00",
    morningBriefing: true,
    weeklyDigest: true,
    createdAt: yesterday,
    updatedAt: now,
  },

  suggestion: {
    suggestion: "Review the 3 overdue tasks in Website Redesign",
    taskId: "task-005",
  },

  workspaces: [
    {
      id: MOCK_WORKSPACE_ID,
      name: "Default Workspace",
      slug: "default",
      orgId: MOCK_ORG_ID,
      createdAt: yesterday,
      updatedAt: now,
    },
  ],
} as const;

// ── Common Mock Setup ────────────────────────────────────────────────────

/**
 * Set up common mocks for dashboard pages (feature flags, workspace, org header).
 */
export async function setupDashboardMocks(page: Page): Promise<void> {
  // Mock organization API — skip /members subroute so team tests can mock it
  await page.route("**/api/organizations/**", (route) => {
    const url = route.request().url();
    if (url.includes("/members")) return route.fallback();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          id: MOCK_ORG_ID,
          name: "E2E Test Org",
          slug: "e2e-test-org",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  // Mock SSE endpoint to avoid connection errors
  await page.route("**/api/sse", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/event-stream",
      body: "data: {}\n\n",
    })
  );

  // Mock workspace endpoint
  await page.route("**/api/workspaces", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: MOCK_DATA.workspaces }),
    })
  );

  // Mock PA suggest endpoint
  await page.route("**/api/pa/suggest", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: MOCK_DATA.suggestion }),
    })
  );

  // Mock PA profile
  await page.route("**/api/pa/profile", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: MOCK_DATA.paProfile }),
    })
  );

  // Mock notifications
  await page.route("**/api/notifications*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [] }),
    })
  );

  // Mock chat unread
  await page.route("**/api/chat/unread", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: { "ch-001": 3, "ch-003": 5 } }),
    })
  );
}
