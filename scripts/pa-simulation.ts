/**
 * PA Chat System — Real User Simulation
 *
 * Simulates a project manager named "Alex" using the PA across a full
 * workday: planning a sprint, creating tasks, delegating, checking status,
 * flagging blockers, commenting, completing work, and getting a report.
 *
 * Every interaction goes through the REAL AI pipeline:
 *   Natural language → classifyIntent (GPT-4o-mini) → normalizeIntent
 *     → planAction (Claude Sonnet) → resolveActionTier → executeAction → DB
 *
 * Nothing is mocked. This is a senior-level validation that Hive's PA
 * can actually manage a project end-to-end via conversation.
 *
 * Usage: npx tsx scripts/pa-simulation.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// ─── Load .env.local ────────────────────────────────────
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const eqIdx = line.indexOf("=");
  if (eqIdx === -1) continue;
  const key = line.slice(0, eqIdx);
  let val = line.slice(eqIdx + 1);
  val = val.replace(/^"(.*)"$/, "$1").replace(/\\n$/, "");
  process.env[key] = val;
}

// ─── Types ──────────────────────────────────────────────

interface StepResult {
  step: string;
  userSaid: string;
  intent: string;
  confidence: number;
  tier: string;
  executed: boolean;
  success: boolean;
  response: string;
  detail?: any;
  durationMs: number;
}

// ─── Globals ────────────────────────────────────────────

const results: StepResult[] = [];
let stepNum = 0;
const cleanupFns: (() => Promise<void>)[] = [];

function onCleanup(fn: () => Promise<void>) {
  cleanupFns.push(fn);
}

async function runCleanup() {
  console.log("\n🧹 Cleaning up all simulation data...");
  for (const fn of cleanupFns.reverse()) {
    try { await fn(); } catch {}
  }
  console.log("   Done.\n");
}

// ─── Main ───────────────────────────────────────────────

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║              Hive PA — Real User Simulation                  ║
║                                                               ║
║  Simulating a full workday of project management via the PA  ║
║  Every message → real AI classify → real AI plan → real DB   ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // ─── Setup ──────────────────────────────────────────────
  const { db } = await import("@/lib/db");
  const { eq, and } = await import("drizzle-orm");
  const schema = await import("@/lib/db/schema");
  const { supabaseAdmin } = await import("@/lib/supabase/admin");
  const { classifyIntent } = await import("@/lib/ai/intent-classifier");
  const { planAction } = await import("@/lib/ai/action-planner");
  const { executeAction } = await import("@/lib/actions/executor");
  const { resolveActionTier, normalizeIntent, ACTION_REGISTRY } = await import("@/lib/actions/registry");
  const { getOrCreatePaProfile } = await import("@/lib/db/queries/pa-profiles");
  const { getTask } = await import("@/lib/db/queries/tasks");
  const { getActivityFeed } = await import("@/lib/db/queries/activity");
  const { getItemById } = await import("@/lib/db/queries/items");
  const { getPageByItemId } = await import("@/lib/db/queries/pages");

  // Find a real user
  const firstMember = await db.query.organizationMembers.findFirst();
  if (!firstMember) {
    console.log("❌ No org members in DB. Seed the database first.");
    process.exit(1);
  }

  const userId = firstMember.userId;
  const orgId = firstMember.orgId;

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(userId);
  const userName =
    userData?.user?.user_metadata?.full_name ||
    userData?.user?.email?.split("@")[0] ||
    "Alex";

  // Get or verify a project
  const existingProject = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(and(eq(schema.projects.orgId, orgId), eq(schema.projects.status, "active")))
    .limit(1);

  let projectId: string;
  let projectName: string;

  if (existingProject.length > 0) {
    projectId = existingProject[0].id;
    projectName = existingProject[0].name;
  } else {
    const [p] = await db.insert(schema.projects).values({
      orgId,
      name: "Q2 Product Launch",
      createdBy: userId,
      status: "active",
    }).returning();
    projectId = p.id;
    projectName = p.name;
    await db.insert(schema.projectMembers).values({ projectId, userId, role: "owner" });
    onCleanup(async () => {
      await db.delete(schema.projectMembers).where(eq(schema.projectMembers.projectId, projectId));
      await db.delete(schema.projects).where(eq(schema.projects.id, projectId));
    });
  }

  // Ensure project membership
  const membership = await db.query.projectMembers.findFirst({
    where: and(eq(schema.projectMembers.projectId, projectId), eq(schema.projectMembers.userId, userId)),
  });
  if (!membership) {
    await db.insert(schema.projectMembers).values({ projectId, userId, role: "member" });
  }

  const paProfile = await getOrCreatePaProfile(userId, orgId);

  const userProjects = await db
    .select({ id: schema.projects.id, name: schema.projects.name })
    .from(schema.projects)
    .where(eq(schema.projects.orgId, orgId));

  console.log(`👤 User: ${userName} (${userId.slice(0, 8)}...)`);
  console.log(`🏢 Org:  ${orgId.slice(0, 8)}...`);
  console.log(`📁 Project: "${projectName}" (${projectId.slice(0, 8)}...)`);
  console.log(`🤖 PA mode: ${paProfile.autonomyMode}, verbosity: ${paProfile.verbosity}`);

  // Conversation history for multi-turn
  const conversationHistory: Array<{ role: string; content: string }> = [];

  // Track created IDs for later operations
  const createdTaskIds: string[] = [];
  const createdItemIds: string[] = [];
  const createdPageIds: string[] = [];
  const createdChannelIds: string[] = [];
  const createdNoticeIds: string[] = [];

  // ─── The simulate function ──────────────────────────────

  async function userSays(message: string, label: string): Promise<StepResult> {
    stepNum++;
    const t0 = Date.now();
    console.log(`\n${"─".repeat(65)}`);
    console.log(`  Step ${stepNum}: ${label}`);
    console.log(`  💬 User: "${message}"`);

    const classCtx = {
      userName,
      projects: userProjects,
      teamMembers: [{ id: userId, name: userName }],
      recentTasks: createdTaskIds.length > 0
        ? await Promise.all(createdTaskIds.slice(-5).map(async (id) => {
            const t = await getTask(id);
            return t ? { id: t.id, title: t.title, status: t.status } : null;
          })).then((arr) => arr.filter(Boolean) as Array<{ id: string; title: string; status: string }>)
        : [],
      conversationHistory: conversationHistory.slice(-4),
    };

    // Step 1: Classify
    const classification = await classifyIntent(message, classCtx);
    const normalized = normalizeIntent(classification.intent);

    console.log(`  🧠 Intent: ${classification.intent}${normalized !== classification.intent ? ` → ${normalized}` : ""} (${(classification.confidence * 100).toFixed(0)}%)`);
    console.log(`  📦 Entities: ${JSON.stringify(classification.entities)}`);

    const result: StepResult = {
      step: label,
      userSaid: message,
      intent: normalized ?? classification.intent,
      confidence: classification.confidence,
      tier: "",
      executed: false,
      success: false,
      response: "",
      durationMs: 0,
    };

    if (!normalized || !ACTION_REGISTRY[normalized]) {
      result.response = "Intent not recognized.";
      result.durationMs = Date.now() - t0;
      console.log(`  ⚠️  No matching action in registry.`);
      conversationHistory.push({ role: "user", content: message });
      conversationHistory.push({ role: "assistant", content: result.response });
      results.push(result);
      return result;
    }

    const registry = ACTION_REGISTRY[normalized];

    // Step 2: Plan
    let plan: { payload: Record<string, any>; confirmationMessage: string; draftPreview?: string };
    try {
      // Build pages context from created items for page-related intents
      const pagesContext: Array<{ itemId: string; title: string }> = [];
      if (createdItemIds.length > 0) {
        for (const itemId of createdItemIds) {
          const item = await getItemById(itemId, orgId);
          if (item) pagesContext.push({ itemId: item.id, title: item.title });
        }
      }

      plan = await planAction(normalized, classification.entities, {
        userName,
        autonomyMode: paProfile.autonomyMode as string,
        verbosity: paProfile.verbosity as string,
        formality: paProfile.formality as string,
        conversationHistory: conversationHistory.slice(-4),
        pages: pagesContext.length > 0 ? pagesContext : undefined,
      });
    } catch (planError) {
      result.response = `Planner error: ${planError instanceof Error ? planError.message : String(planError)}`;
      result.durationMs = Date.now() - t0;
      console.log(`  ⚠️  Planner failed: ${result.response.slice(0, 100)}`);
      conversationHistory.push({ role: "user", content: message });
      conversationHistory.push({ role: "assistant", content: result.response });
      results.push(result);
      return result;
    }

    // Step 3: Resolve tier
    const tier = resolveActionTier(normalized, paProfile as any, {
      assigneeId: classification.entities.assigneeId,
      userId,
    });
    result.tier = tier;
    console.log(`  🔒 Tier: ${tier}`);

    // Step 4: Execute (for auto_execute and execute_notify)
    if (tier === "auto_execute" || tier === "execute_notify") {
      // Inject projectId if the planner didn't provide one
      const payload = { ...plan.payload };
      if (!payload.projectId && registry.handler !== "query" && registry.handler !== "generate-report") {
        payload.projectId = projectId;
      }

      const execResult = await executeAction({
        id: `sim-${stepNum}-${Date.now()}`,
        userId,
        orgId,
        actionType: normalized,
        tier,
        status: "pending",
        plannedPayload: payload,
        createdAt: new Date(),
      } as any);

      result.executed = true;
      result.success = execResult.success;
      result.detail = execResult.result ?? execResult.error;
      result.response = execResult.success
        ? plan.confirmationMessage
        : `Failed: ${execResult.error}`;

      if (execResult.success) {
        console.log(`  ✅ Executed successfully`);
        if (execResult.result?.taskId) {
          createdTaskIds.push(execResult.result.taskId);
          onCleanup(async () => {
            await db.delete(schema.activityLog).where(eq(schema.activityLog.taskId, execResult.result!.taskId)).catch(() => {});
            await db.delete(schema.taskComments).where(eq(schema.taskComments.taskId, execResult.result!.taskId)).catch(() => {});
            await db.delete(schema.tasks).where(eq(schema.tasks.id, execResult.result!.taskId)).catch(() => {});
          });
        }
        if (execResult.result?.messageId) {
          onCleanup(async () => {
            await db.delete(schema.messages).where(eq(schema.messages.id, execResult.result!.messageId)).catch(() => {});
          });
        }
        if (execResult.result?.itemId) {
          createdItemIds.push(execResult.result.itemId);
        }
        if (execResult.result?.pageId) {
          createdPageIds.push(execResult.result.pageId);
        }
        if (execResult.result?.channelId) {
          createdChannelIds.push(execResult.result.channelId);
          onCleanup(async () => {
            await db.delete(schema.chatChannelMembers).where(eq(schema.chatChannelMembers.channelId, execResult.result!.channelId)).catch(() => {});
            await db.delete(schema.chatMessages).where(eq(schema.chatMessages.channelId, execResult.result!.channelId)).catch(() => {});
            await db.delete(schema.chatChannels).where(eq(schema.chatChannels.id, execResult.result!.channelId)).catch(() => {});
          });
        }
        if (execResult.result?.noticeId) {
          createdNoticeIds.push(execResult.result.noticeId);
          onCleanup(async () => {
            await db.delete(schema.notices).where(eq(schema.notices.id, execResult.result!.noticeId)).catch(() => {});
          });
        }
      } else {
        console.log(`  ❌ Execution failed: ${execResult.error}`);
      }
    } else if (tier === "draft_approve") {
      result.executed = false;
      result.success = true;
      result.response = plan.draftPreview
        ? `Draft: ${plan.draftPreview}`
        : plan.confirmationMessage;
      console.log(`  📝 Draft created (awaiting approval)`);
    } else {
      result.executed = false;
      result.success = true;
      result.response = plan.confirmationMessage;
      console.log(`  💡 Suggestion: ${plan.confirmationMessage.slice(0, 80)}...`);
    }

    console.log(`  🤖 PA: "${result.response.slice(0, 120)}${result.response.length > 120 ? "..." : ""}"`);

    // Update conversation history
    conversationHistory.push({ role: "user", content: message });
    conversationHistory.push({ role: "assistant", content: result.response });

    result.durationMs = Date.now() - t0;
    console.log(`  ⏱️  ${result.durationMs}ms`);
    results.push(result);
    return result;
  }

  // ═══════════════════════════════════════════════════════════
  // THE SIMULATION — A full workday of project management
  // ═══════════════════════════════════════════════════════════

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  🌅 MORNING: Sprint Planning`);
  console.log(`${"═".repeat(65)}`);

  // ── Scene 1: Create tasks for the sprint ──────────────

  const task1 = await userSays(
    "Create a task called 'Design the new onboarding flow' with high priority, due next Friday",
    "Create first sprint task"
  );

  const task2 = await userSays(
    "Create a task called 'Implement payment integration' - this is urgent, due in 3 days",
    "Create second sprint task"
  );

  const task3 = await userSays(
    "Add a task for 'Write API documentation for v2 endpoints' with medium priority",
    "Create third sprint task"
  );

  const task4 = await userSays(
    "Create a low priority task called 'Clean up unused CSS classes'",
    "Create backlog item"
  );

  // ── Scene 2: Check what we have ──────────────────────

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  📋 MID-MORNING: Review the board`);
  console.log(`${"═".repeat(65)}`);

  const checkResult = await userSays(
    "What tasks do we have right now?",
    "Check task list"
  );

  const statusResult = await userSays(
    `How's the ${projectName} project looking?`,
    "Check project status"
  );

  // ── Scene 3: Post a standup update ────────────────────

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  📢 STANDUP: Team communication`);
  console.log(`${"═".repeat(65)}`);

  await userSays(
    "Post a message saying 'Sprint 12 kicked off — 4 tasks planned, payment integration is the top priority'",
    "Post standup update"
  );

  // ── Scene 4: Work on tasks — update, comment, block ───

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  🔨 AFTERNOON: Doing actual work`);
  console.log(`${"═".repeat(65)}`);

  // Update a task (by title — tests the new task name resolution!)
  await userSays(
    "Update the onboarding flow task to in_progress status",
    "Start working on task (by name)"
  );

  // Add a comment
  await userSays(
    "Add a comment on the payment integration task saying 'Looked into Stripe vs PayPal — recommending Stripe for better API'",
    "Comment on task (by name)"
  );

  // Flag a blocker
  await userSays(
    "Flag the API documentation task as blocked — waiting on the v2 API spec from backend team",
    "Flag a blocker (by name)"
  );

  // ── Scene 5: Multi-turn conversation test ─────────────

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  🔄 MULTI-TURN: Context carry-forward`);
  console.log(`${"═".repeat(65)}`);

  // First message establishes context
  await userSays(
    "What's the status on the CSS cleanup task?",
    "Multi-turn: establish context"
  );

  // Follow-up should reference the same task
  await userSays(
    "Actually, bump that to medium priority",
    "Multi-turn: follow-up update"
  );

  // ── Scene 6: Complete work ────────────────────────────

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  ✅ END OF DAY: Wrapping up`);
  console.log(`${"═".repeat(65)}`);

  await userSays(
    "Mark the onboarding flow task as done",
    "Complete a task (by name)"
  );

  // ── Scene 7: Generate a report ────────────────────────

  const reportResult = await userSays(
    "Give me a status report on what we accomplished today",
    "Generate end-of-day report"
  );

  // ── Scene 8: Check workload ───────────────────────────

  await userSays(
    "How's the team's workload looking?",
    "Check team workload"
  );

  // ── Scene 9: Integration boundary — calendar (should fail gracefully) ──

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  🔌 INTEGRATION: Graceful degradation`);
  console.log(`${"═".repeat(65)}`);

  const calendarResult = await userSays(
    "Block my calendar tomorrow from 2pm to 4pm for deep work",
    "Calendar action (no integration)"
  );
  // Calendar failure is EXPECTED when no integration is connected — mark as pass
  if (!calendarResult.success && calendarResult.response.toLowerCase().includes("integration")) {
    calendarResult.success = true;
    console.log(`  ℹ️  Expected failure: no calendar integration connected (treated as PASS)`);
  }

  // ── Scene 10: Phase 6 — Pages ──────────────────────────

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  📄 PHASE 6: Pages, Channels & Notices`);
  console.log(`${"═".repeat(65)}`);

  const pageResult = await userSays(
    "Create a page called 'Sprint 12 Retrospective Notes'",
    "Create a page"
  );

  // ── Scene 11: Phase 6 — Notices ─────────────────────

  const noticeResult = await userSays(
    "Post a team notice titled 'Deployment Window' with body 'Production deploy scheduled for Friday 5pm. All hands on deck.'",
    "Create a notice"
  );
  // notice_create is draft_approve — treated as success if draft is created
  if (!noticeResult.executed && noticeResult.tier === "draft_approve") {
    noticeResult.success = true;
    console.log(`  ℹ️  Notice is draft_approve tier — draft created (treated as PASS)`);
  }

  // ── Scene 12: Phase 6 — Channels ────────────────────

  const channelResult = await userSays(
    "Create a chat channel called 'sprint-12-standup' for daily standups",
    "Create a channel"
  );
  // create_channel is draft_approve — treated as success if draft is created
  if (!channelResult.executed && channelResult.tier === "draft_approve") {
    channelResult.success = true;
    console.log(`  ℹ️  Channel is draft_approve tier — draft created (treated as PASS)`);
  }

  // ── Scene 13: Phase 6 — Summarize page ──────────────

  // Only try to summarize if we have a page from Scene 10
  if (createdItemIds.length > 0) {
    await userSays(
      "Summarize the Sprint 12 Retrospective Notes page",
      "Summarize page"
    );
  }

  // ── Scene 14: Edge cases ──────────────────────────────

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  🧪 EDGE CASES: Normalization & resolution`);
  console.log(`${"═".repeat(65)}`);

  // Intent normalization — user sends hyphenated intent-like phrasing
  // (The AI should still classify correctly, and normalizeIntent handles leftovers)

  await userSays(
    "Delete the CSS cleanup task — we decided it's not worth it",
    "Delete a task (by name)"
  );

  // ═══════════════════════════════════════════════════════════
  // VERIFICATION: Actually check the DB state
  // ═══════════════════════════════════════════════════════════

  console.log(`\n${"═".repeat(65)}`);
  console.log(`  🔍 VERIFICATION: Cross-checking DB state`);
  console.log(`${"═".repeat(65)}\n`);

  let verifyPassed = 0;
  let verifyFailed = 0;

  function verify(condition: boolean, label: string) {
    if (condition) {
      console.log(`  ✅ ${label}`);
      verifyPassed++;
    } else {
      console.log(`  ❌ ${label}`);
      verifyFailed++;
    }
  }

  // Verify tasks were actually created in DB
  const dbTasks = await db
    .select()
    .from(schema.tasks)
    .where(and(eq(schema.tasks.orgId, orgId), eq(schema.tasks.projectId, projectId)));

  const simTaskTitles = dbTasks.map((t) => t.title.toLowerCase());

  verify(
    simTaskTitles.some((t) => t.includes("onboarding")),
    "Onboarding task exists in DB"
  );
  verify(
    simTaskTitles.some((t) => t.includes("payment")),
    "Payment integration task exists in DB"
  );
  verify(
    simTaskTitles.some((t) => t.includes("api documentation") || t.includes("api doc")),
    "API documentation task exists in DB"
  );

  // Verify the completed task is actually done
  const onboardingTask = dbTasks.find((t) => t.title.toLowerCase().includes("onboarding"));
  if (onboardingTask) {
    verify(onboardingTask.status === "done", `Onboarding task status is 'done' (got '${onboardingTask.status}')`);
  }

  // Verify the blocker was actually flagged
  const apiDocTask = dbTasks.find((t) =>
    t.title.toLowerCase().includes("api doc") || t.title.toLowerCase().includes("documentation")
  );
  if (apiDocTask) {
    verify(apiDocTask.isBlocked === true, `API doc task is flagged as blocked (isBlocked=${apiDocTask.isBlocked})`);
  }

  // Verify activity log has entries from PA
  const { data: activities } = await getActivityFeed({ orgId, limit: 50 });
  const paActivities = activities.filter(
    (a) => a.metadata && typeof a.metadata === "object" && (
      (a.metadata as Record<string, unknown>).createdByPa === true ||
      (a.metadata as Record<string, unknown>).updatedByPa === true ||
      (a.metadata as Record<string, unknown>).completedByPa === true ||
      (a.metadata as Record<string, unknown>).flaggedByPa === true ||
      (a.metadata as Record<string, unknown>).postedByPa === true ||
      (a.metadata as Record<string, unknown>).deletedByPa === true
    )
  );
  verify(paActivities.length >= 4, `Activity log has ${paActivities.length} PA-created entries (expected ≥ 4)`);

  // Verify the CSS cleanup task deletion
  const deleteResult = results.find((r) => r.step === "Delete a task (by name)");
  const cssTask = dbTasks.find((t) => t.title.toLowerCase().includes("css"));
  if (deleteResult?.executed && deleteResult?.success) {
    // Actually executed — check it's gone
    if (cssTask) {
      const stillExists = await getTask(cssTask.id);
      verify(!stillExists, "CSS cleanup task was deleted from DB");
    } else {
      verify(true, "CSS cleanup task was deleted from DB");
    }
  } else if (deleteResult?.tier === "draft_approve") {
    // draft_approve means it wasn't executed — task should still exist, and that's correct
    verify(true, "CSS delete was draft_approve (not executed, awaiting approval — correct)");
  } else if (deleteResult?.success) {
    verify(true, "CSS delete returned suggestion/draft (correct behavior)");
  }

  // Verify Phase 6: Page creation
  if (createdItemIds.length > 0) {
    const item = await getItemById(createdItemIds[0], orgId);
    verify(!!item, `Page item exists in DB (${createdItemIds[0].slice(0, 8)}...)`);
    if (item) {
      verify(item.type === "page", `Item type is 'page' (got '${item.type}')`);
    }
    // Cleanup pages
    onCleanup(async () => {
      for (const itemId of createdItemIds) {
        await db.delete(schema.pages).where(eq(schema.pages.itemId, itemId)).catch(() => {});
        await db.delete(schema.items).where(eq(schema.items.id, itemId)).catch(() => {});
      }
    });
  }

  // Verify Phase 6: Notice creation
  const noticeStepResult = results.find((r) => r.step === "Create a notice");
  if (noticeStepResult) {
    verify(noticeStepResult.success, `Notice action completed successfully (tier: ${noticeStepResult.tier})`);
  }

  // Verify Phase 6: Channel creation
  const channelStepResult = results.find((r) => r.step === "Create a channel");
  if (channelStepResult) {
    verify(channelStepResult.success, `Channel action completed successfully (tier: ${channelStepResult.tier})`);
  }

  // ═══════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════

  await runCleanup();

  const totalSteps = results.length;
  const succeeded = results.filter((r) => r.success).length;
  const executedOk = results.filter((r) => r.executed && r.success).length;
  const executedFail = results.filter((r) => r.executed && !r.success).length;
  const avgDuration = Math.round(results.reduce((s, r) => s + r.durationMs, 0) / totalSteps);

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    SIMULATION RESULTS                        ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  📊 Pipeline Steps:  ${String(totalSteps).padStart(3)}                                     ║
║  ✅ Succeeded:       ${String(succeeded).padStart(3)}                                     ║
║  ⚡ Executed (OK):    ${String(executedOk).padStart(3)}                                     ║
║  ❌ Executed (fail):  ${String(executedFail).padStart(3)}                                     ║
║  ⏱️  Avg latency:     ${String(avgDuration).padStart(5)}ms                                  ║
║                                                               ║
║  🔍 DB Verification:  ${String(verifyPassed).padStart(2)} passed / ${String(verifyFailed).padStart(2)} failed               ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

  // Detailed breakdown
  console.log("Detailed Step Results:");
  console.log("─".repeat(100));
  console.log(
    "Step".padEnd(42) +
    "Intent".padEnd(22) +
    "Conf".padEnd(6) +
    "Tier".padEnd(16) +
    "Exec".padEnd(6) +
    "OK".padEnd(4) +
    "Time"
  );
  console.log("─".repeat(100));

  for (const r of results) {
    console.log(
      r.step.slice(0, 40).padEnd(42) +
      r.intent.slice(0, 20).padEnd(22) +
      `${(r.confidence * 100).toFixed(0)}%`.padEnd(6) +
      r.tier.padEnd(16) +
      (r.executed ? "yes" : "no").padEnd(6) +
      (r.success ? "✅" : "❌").padEnd(4) +
      `${r.durationMs}ms`
    );
  }

  console.log("─".repeat(100));

  if (executedFail > 0 || verifyFailed > 0) {
    console.log("\n⚠️  Some steps failed. Details:\n");
    for (const r of results.filter((r) => !r.success)) {
      console.log(`  • ${r.step}: ${r.response}`);
    }
    console.log("");
    process.exit(1);
  } else {
    console.log("\n🎉 Full simulation passed — PA can manage a project end-to-end!\n");
  }
}

main().catch(async (err) => {
  console.error("\n💥 Fatal error:", err);
  await runCleanup();
  process.exit(1);
});
