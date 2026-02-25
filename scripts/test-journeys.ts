/**
 * End-to-end user journey test script.
 * Tests the full authenticated flow: sign-up → onboarding → CRUD → PA → settings.
 *
 * Usage: set -a && source .env.local && set +a && npx tsx scripts/test-journeys.ts
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_EMAIL = `hivetest${Date.now()}@gmail.com`;
const TEST_PASSWORD = "TestPass123!";
const TEST_NAME = "Hive Test User";

let accessToken = "";
let refreshToken = "";
let orgId = "";
let projectId = "";
let taskId = "";

// Extract project ref from Supabase URL for cookie naming
const SUPABASE_PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0];

let passed = 0;
let failed = 0;

function log(status: "PASS" | "FAIL" | "SKIP" | "INFO", msg: string) {
  const icon = { PASS: "✓", FAIL: "✗", SKIP: "~", INFO: "→" }[status];
  console.log(`  ${icon} ${msg}`);
  if (status === "PASS") passed++;
  if (status === "FAIL") failed++;
}

function stringToBase64URL(str: string): string {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function api(
  path: string,
  options: RequestInit = {},
  headers: Record<string, string> = {}
) {
  // Supabase SSR @supabase/ssr uses: sb-<ref>-auth-token = base64-<base64url(JSON)>
  const cookieName = `sb-${SUPABASE_PROJECT_REF}-auth-token`;
  const sessionJson = JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
  });
  const cookieValue = accessToken
    ? `base64-${stringToBase64URL(sessionJson)}`
    : "";

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Cookie: `${cookieName}=${cookieValue}` } : {}),
      ...(orgId ? { "x-org-id": orgId } : {}),
      ...headers,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => null);
  return { status: res.status, body };
}

async function testSignUp() {
  console.log("\n── Auth: Sign Up ──");

  // Use admin API to create user (bypasses rate limits and email validation)
  const adminClient = createClient(
    SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: adminData, error: adminError } =
    await adminClient.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: TEST_NAME },
    });

  if (adminError) {
    log("FAIL", `Admin create user failed: ${adminError.message}`);
    return false;
  }

  log("PASS", `Created user via admin API: ${adminData.user.email}`);

  // Now sign in normally to get a session
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: signInData, error: signInError } =
    await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

  if (signInError) {
    log("FAIL", `Sign in failed: ${signInError.message}`);
    return false;
  }

  accessToken = signInData.session!.access_token;
  refreshToken = signInData.session!.refresh_token;
  log("PASS", `Signed in, got token: ${accessToken.slice(0, 20)}...`);
  return true;
}

async function testHealthCheck() {
  console.log("\n── Health Check ──");
  const { status, body } = await api("/api/health");
  if (status === 200 && body?.status === "healthy") {
    log("PASS", `Health: ${body.status}, DB: ${body.checks?.database}`);
  } else {
    log("FAIL", `Health check failed: ${status}`);
  }
}

async function testCreateOrg() {
  console.log("\n── Onboarding: Create Organization ──");

  const { status, body } = await api("/api/organizations", {
    method: "POST",
    body: JSON.stringify({
      name: "Hive Test Org",
      slug: `hive-test-${Date.now()}`,
    }),
  });

  const orgData = body?.data || body;
  if (status === 201 && orgData?.id) {
    orgId = orgData.id;
    log("PASS", `Created org: ${orgData.name} (${orgId.slice(0, 8)}...)`);
    return true;
  }

  log("FAIL", `Create org failed: ${status} ${JSON.stringify(body)}`);
  return false;
}

async function testSetPathway() {
  console.log("\n── Onboarding: Set Pathway ──");

  const { status, body } = await api("/api/dashboard/pathway", {
    method: "POST",
    body: JSON.stringify({ pathway: "boards" }),
  });

  if (status === 200) {
    log("PASS", `Pathway set to 'boards'`);
  } else {
    log("FAIL", `Set pathway failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function testSaveLayout() {
  console.log("\n── Onboarding: Save Layout ──");

  const { status, body } = await api("/api/dashboard/layouts", {
    method: "POST",
    body: JSON.stringify({
      pathway: "boards",
      layoutPresetIndex: 0,
      slots: [
        {
          slotId: "main",
          componentType: "board",
          config: {},
          x: 0,
          y: 0,
          width: 3,
          height: 3,
        },
        {
          slotId: "sidebar",
          componentType: "activity_feed",
          config: {},
          x: 3,
          y: 0,
          width: 1,
          height: 3,
        },
      ],
      isDefault: true,
    }),
  });

  if (status === 201 && body?.id) {
    log("PASS", `Layout saved (${body.id.slice(0, 8)}...)`);
  } else {
    log("FAIL", `Save layout failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function testGetLayout() {
  console.log("\n── Dashboard: Get Layout ──");

  const { status, body } = await api("/api/dashboard/layouts");

  if (status === 200 && body?.data) {
    log("PASS", `Got layout: pathway=${body.data.pathway}, ${(body.data.slots as any[])?.length} slots`);
  } else {
    log("FAIL", `Get layout failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function testGetComponents() {
  console.log("\n── Dashboard: Get Components ──");

  const { status, body } = await api("/api/dashboard/components");

  if (status === 200 && body?.data?.length > 0) {
    log("PASS", `Got ${body.data.length} components: ${body.data.map((c: any) => c.name).join(", ")}`);
  } else {
    log("FAIL", `Get components failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function testProjectCRUD() {
  console.log("\n── Projects: CRUD ──");

  // Create
  const { status: createStatus, body: createBody } = await api(
    "/api/projects",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test Project",
        description: "Created by journey test",
        status: "active",
      }),
    }
  );

  const projData = createBody?.data || createBody;
  if (createStatus === 201 && projData?.id) {
    projectId = projData.id;
    log("PASS", `Created project: ${projData.name} (${projectId.slice(0, 8)}...)`);
  } else {
    log("FAIL", `Create project failed: ${createStatus} ${JSON.stringify(createBody)}`);
    return;
  }

  // List
  const { status: listStatus, body: listBody } = await api("/api/projects");
  if (listStatus === 200 && listBody?.data?.length > 0) {
    log("PASS", `Listed ${listBody.data.length} project(s)`);
  } else {
    log("FAIL", `List projects failed: ${listStatus}`);
  }

  // Get
  const { status: getStatus, body: getBody } = await api(
    `/api/projects/${projectId}`
  );
  const getProject = getBody?.data || getBody;
  if (getStatus === 200 && getProject?.id === projectId) {
    log("PASS", `Got project by ID`);
  } else {
    log("FAIL", `Get project failed: ${getStatus}`);
  }

  // Update
  const { status: updateStatus } = await api(`/api/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify({ description: "Updated description" }),
  });
  if (updateStatus === 200) {
    log("PASS", `Updated project description`);
  } else {
    log("FAIL", `Update project failed: ${updateStatus}`);
  }
}

async function testTaskCRUD() {
  console.log("\n── Tasks: CRUD ──");

  // Create
  const { status: createStatus, body: createBody } = await api("/api/tasks", {
    method: "POST",
    body: JSON.stringify({
      title: "Test Task",
      description: "Created by journey test",
      projectId,
      status: "todo",
      priority: "medium",
    }),
  });

  const taskData = createBody?.data || createBody;
  if (createStatus === 201 && taskData?.id) {
    taskId = taskData.id;
    log("PASS", `Created task: ${taskData.title} (${taskId.slice(0, 8)}...)`);
  } else {
    log("FAIL", `Create task failed: ${createStatus} ${JSON.stringify(createBody)}`);
    return;
  }

  // List
  const { status: listStatus, body: listBody } = await api(
    `/api/tasks?projectId=${projectId}`
  );
  if (listStatus === 200 && listBody?.data?.length > 0) {
    log("PASS", `Listed ${listBody.data.length} task(s)`);
  } else {
    log("FAIL", `List tasks failed: ${listStatus}`);
  }

  // Update
  const { status: updateStatus } = await api(`/api/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "in_progress" }),
  });
  if (updateStatus === 200) {
    log("PASS", `Updated task status to in_progress`);
  } else {
    log("FAIL", `Update task failed: ${updateStatus}`);
  }

  // Add comment
  const { status: commentStatus, body: commentBody } = await api(
    `/api/tasks/${taskId}/comments`,
    {
      method: "POST",
      body: JSON.stringify({ content: "Test comment from journey test" }),
    }
  );
  const commentData = commentBody?.data || commentBody;
  if (commentStatus === 201 && commentData?.id) {
    log("PASS", `Added comment to task`);
  } else {
    log("FAIL", `Add comment failed: ${commentStatus} ${JSON.stringify(commentBody)}`);
  }
}

async function testMessages() {
  console.log("\n── Messages ──");

  const { status, body } = await api("/api/messages", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      content: "Hello from journey test!",
    }),
  });

  const msgData = body?.data || body;
  if (status === 201 && msgData?.id) {
    log("PASS", `Sent message (${msgData.id.slice(0, 8)}...)`);
  } else {
    log("FAIL", `Send message failed: ${status} ${JSON.stringify(body)}`);
  }

  // List
  const { status: listStatus, body: listBody } = await api(
    `/api/messages?projectId=${projectId}`
  );
  if (listStatus === 200 && listBody?.data?.length > 0) {
    log("PASS", `Listed ${listBody.data.length} message(s)`);
  } else {
    log("FAIL", `List messages failed: ${listStatus}`);
  }
}

async function testActivityFeed() {
  console.log("\n── Activity Feed ──");

  const { status, body } = await api("/api/activity");
  if (status === 200 && body?.data) {
    log("PASS", `Got ${body.data.length} activity entries`);
  } else {
    log("FAIL", `Activity feed failed: ${status}`);
  }
}

async function testNotifications() {
  console.log("\n── Notifications ──");

  const { status, body } = await api("/api/notifications");
  if (status === 200 && body?.data !== undefined) {
    log("PASS", `Got ${body.data.length} notifications`);
  } else {
    log("FAIL", `Notifications failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function testBeeTemplates() {
  console.log("\n── Bee Templates ──");

  // List (should include system bees seeded during org creation or seed script)
  const { status: listStatus, body: listBody } = await api(
    "/api/bees/templates"
  );
  if (listStatus === 200 && listBody?.data) {
    log("PASS", `Got ${listBody.data.length} bee template(s)`);

    if (listBody.data.length === 0) {
      log("INFO", "No templates yet — creating system bees");
    }
  } else {
    log("FAIL", `List bee templates failed: ${listStatus}`);
  }

  // Create custom template
  const { status: createStatus, body: createBody } = await api(
    "/api/bees/templates",
    {
      method: "POST",
      body: JSON.stringify({
        name: "Test Analyst Bee",
        type: "operator",
        subtype: "analyst",
        systemPrompt: "You analyze project metrics and provide insights.",
      }),
    }
  );

  const tmplData = createBody?.data || createBody;
  if (createStatus === 201 && tmplData?.id) {
    log("PASS", `Created bee template: ${tmplData.name}`);

    // Get it
    const { status: getStatus } = await api(
      `/api/bees/templates/${tmplData.id}`
    );
    if (getStatus === 200) {
      log("PASS", `Got template by ID`);
    } else {
      log("FAIL", `Get template failed: ${getStatus}`);
    }

    // Update it
    const { status: updateStatus } = await api(
      `/api/bees/templates/${tmplData.id}`,
      {
        method: "PATCH",
        body: JSON.stringify({ name: "Updated Analyst Bee" }),
      }
    );
    if (updateStatus === 200) {
      log("PASS", `Updated template name`);
    } else {
      log("FAIL", `Update template failed: ${updateStatus}`);
    }

    // Delete it
    const { status: deleteStatus } = await api(
      `/api/bees/templates/${tmplData.id}`,
      { method: "DELETE" }
    );
    if (deleteStatus === 200) {
      log("PASS", `Deleted template`);
    } else {
      log("FAIL", `Delete template failed: ${deleteStatus}`);
    }
  } else {
    log("FAIL", `Create bee template failed: ${createStatus} ${JSON.stringify(createBody)}`);
  }
}

async function testBeeInstances() {
  console.log("\n── Bee Instances ──");

  const { status, body } = await api("/api/bees/instances");
  if (status === 200 && body?.data) {
    log("PASS", `Got ${body.data.length} bee instance(s)`);
  } else {
    log("FAIL", `List bee instances failed: ${status}`);
  }
}

async function testSwarms() {
  console.log("\n── Swarm Sessions ──");

  const { status, body } = await api("/api/bees/swarms");
  if (status === 200 && body?.data) {
    log("PASS", `Got ${body.data.length} swarm session(s)`);
  } else {
    log("FAIL", `List swarms failed: ${status}`);
  }
}

async function testPAProfile() {
  console.log("\n── PA Profile ──");

  // Get/create profile
  const { status, body } = await api("/api/pa/profile");
  const paData = body?.data || body;
  if (status === 200 && paData?.id) {
    log("PASS", `Got PA profile (verbosity: ${paData.verbosity}, formality: ${paData.formality})`);
  } else {
    log("FAIL", `Get PA profile failed: ${status} ${JSON.stringify(body)}`);
  }

  // Update preferences
  const { status: updateStatus } = await api("/api/pa/profile", {
    method: "PATCH",
    body: JSON.stringify({ verbosity: "detailed", formality: "casual" }),
  });
  if (updateStatus === 200) {
    log("PASS", `Updated PA preferences`);
  } else {
    log("FAIL", `Update PA profile failed: ${updateStatus}`);
  }
}

async function testPAChat() {
  console.log("\n── PA Chat ──");

  const { status, body } = await api("/api/pa/chat", {
    method: "POST",
    body: JSON.stringify({
      message: "What tasks do I have?",
    }),
  });

  if (status === 200 && body?.message) {
    log("PASS", `PA responded: "${body.message.slice(0, 80)}..."`);
    if (body.dispatchMode) {
      log("INFO", `Dispatch mode: ${body.dispatchMode}`);
    }
    if (body.intent) {
      log("INFO", `Intent: ${body.intent}`);
    }
  } else {
    log("FAIL", `PA chat failed: ${status} ${JSON.stringify(body)?.slice(0, 200)}`);
  }
}

async function testPAActions() {
  console.log("\n── PA Actions ──");

  const { status, body } = await api("/api/pa/actions");
  if (status === 200 && body?.data) {
    log("PASS", `Got ${body.data.length} PA action(s)`);
  } else {
    log("FAIL", `List PA actions failed: ${status}`);
  }
}

async function testIntegrations() {
  console.log("\n── Integrations ──");

  const { status, body } = await api("/api/integrations");
  if (status === 200 && body?.data) {
    log("PASS", `Got ${body.data.length} integration(s)`);
  } else {
    log("FAIL", `List integrations failed: ${status}`);
  }
}

async function testOrgMembers() {
  console.log("\n── Org Members ──");

  const { status, body } = await api(`/api/organizations/${orgId}/members`);
  if (status === 200 && body?.data?.length > 0) {
    log("PASS", `Got ${body.data.length} member(s), role: ${body.data[0].role}`);
  } else {
    log("FAIL", `List org members failed: ${status} ${JSON.stringify(body)}`);
  }
}

async function testCronAuth() {
  console.log("\n── Cron Auth ──");

  // Without secret
  const { status: noSecretStatus } = await api("/api/cron/swarm-cleanup", {
    method: "POST",
  });
  if (noSecretStatus === 401) {
    log("PASS", `Swarm cleanup rejects without secret`);
  } else {
    log("FAIL", `Expected 401, got ${noSecretStatus}`);
  }
}

async function cleanup() {
  console.log("\n── Cleanup ──");

  // Delete task
  if (taskId) {
    const { status } = await api(`/api/tasks/${taskId}`, {
      method: "DELETE",
    });
    log(status === 200 ? "PASS" : "FAIL", `Delete task: ${status}`);
  }

  // Delete project
  if (projectId) {
    const { status } = await api(`/api/projects/${projectId}`, {
      method: "DELETE",
    });
    log(status === 200 ? "PASS" : "FAIL", `Delete project: ${status}`);
  }

  // Delete org
  if (orgId) {
    const { status } = await api(`/api/organizations/${orgId}`, {
      method: "DELETE",
    });
    log(status === 200 ? "PASS" : "FAIL", `Delete org: ${status}`);
  }

  // Delete test user via Supabase admin
  try {
    const supabase = createClient(
      SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    // Find user by email
    const { data } = await supabase.auth.admin.listUsers();
    const testUser = data?.users?.find((u) => u.email === TEST_EMAIL);
    if (testUser) {
      await supabase.auth.admin.deleteUser(testUser.id);
      log("PASS", `Deleted test user`);
    }
  } catch (e: any) {
    log("FAIL", `Cleanup user failed: ${e.message}`);
  }
}

async function main() {
  console.log("╔══════════════════════════════════════════╗");
  console.log("║   Hive E2E User Journey Test Suite       ║");
  console.log("╚══════════════════════════════════════════╝");
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test user: ${TEST_EMAIL}`);

  await testHealthCheck();
  const authOk = await testSignUp();
  if (!authOk) {
    console.log("\n✗ Cannot continue without auth. Aborting.");
    process.exit(1);
  }

  const orgOk = await testCreateOrg();
  if (!orgOk) {
    console.log("\n✗ Cannot continue without org. Aborting.");
    process.exit(1);
  }

  // Onboarding
  await testSetPathway();
  await testSaveLayout();
  await testGetLayout();
  await testGetComponents();

  // CRUD
  await testProjectCRUD();
  await testTaskCRUD();
  await testMessages();
  await testActivityFeed();
  await testNotifications();
  await testOrgMembers();

  // PA
  await testPAProfile();
  await testPAChat();
  await testPAActions();

  // Bees
  await testBeeTemplates();
  await testBeeInstances();
  await testSwarms();

  // Integrations
  await testIntegrations();

  // Cron
  await testCronAuth();

  // Cleanup
  await cleanup();

  // Summary
  console.log("\n══════════════════════════════════════════");
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log("══════════════════════════════════════════\n");

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Journey test crashed:", err);
  process.exit(1);
});
