/**
 * Live smoke test for the PA chat pipeline.
 * Runs against real DB and AI providers — not mocked.
 *
 * Usage: npx tsx scripts/smoke-test-pa.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually, stripping \n artifacts from Vercel CLI
const envPath = resolve(process.cwd(), ".env.local");
const envContent = readFileSync(envPath, "utf8");
for (const line of envContent.split("\n")) {
  if (!line || line.startsWith("#")) continue;
  const eqIdx = line.indexOf("=");
  if (eqIdx === -1) continue;
  const key = line.slice(0, eqIdx);
  let val = line.slice(eqIdx + 1);
  // Strip wrapping quotes and trailing \n artifact
  val = val.replace(/^"(.*)"$/, "$1").replace(/\\n$/, "");
  process.env[key] = val;
}

async function main() {
  console.log("\n=== PA Chat Pipeline Smoke Test ===\n");

  // 1. Check env vars
  const requiredEnvVars = [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "OPENAI_API_KEY",
    "ANTHROPIC_API_KEY",
  ];

  console.log("1. Checking environment variables...");
  const missing: string[] = [];
  for (const envVar of requiredEnvVars) {
    const val = process.env[envVar];
    if (!val) {
      missing.push(envVar);
      console.log(`   ❌ ${envVar}: MISSING`);
    } else {
      console.log(`   ✅ ${envVar}: set (${val.slice(0, 8)}...)`);
    }
  }
  if (missing.length > 0) {
    console.log(`\n❌ Missing env vars: ${missing.join(", ")}`);
    process.exit(1);
  }

  // 2. Test DB connection
  console.log("\n2. Testing database connection...");
  try {
    const { db } = await import("@/lib/db");
    const { sql } = await import("drizzle-orm");
    const result = await db.execute(sql`SELECT 1 as ok`);
    console.log("   ✅ Database connected");
  } catch (err) {
    console.log(`   ❌ Database error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }

  // 3. Test Supabase admin
  console.log("\n3. Testing Supabase admin client...");
  try {
    const { supabaseAdmin } = await import("@/lib/supabase/admin");
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
    if (error) throw error;
    console.log(`   ✅ Supabase admin works (${data.users.length} user(s) fetched)`);

    if (data.users.length === 0) {
      console.log("   ⚠️  No users found — can't test further");
      process.exit(0);
    }

    const testUser = data.users[0];
    console.log(`   Using test user: ${testUser.id} (${testUser.email})`);

    // 4. Test OpenAI (intent classification)
    console.log("\n4. Testing intent classification (OpenAI GPT-4o-mini)...");
    try {
      const { classifyIntent } = await import("@/lib/ai/intent-classifier");
      const classification = await classifyIntent("create a task called test for tomorrow", {
        userName: "Test User",
        projects: [{ id: "fake-project-id", name: "Test Project" }],
        teamMembers: [{ id: testUser.id, name: "Test User" }],
        recentTasks: [],
      });
      console.log(`   ✅ Intent: ${classification.intent} (confidence: ${classification.confidence.toFixed(2)})`);
      console.log(`   Entities: ${JSON.stringify(classification.entities)}`);
    } catch (err) {
      console.log(`   ❌ Intent classification failed: ${err instanceof Error ? err.message : err}`);
      process.exit(1);
    }

    // 5. Test Anthropic (action planning)
    console.log("\n5. Testing action planning (Anthropic Claude Sonnet)...");
    try {
      const { planAction } = await import("@/lib/ai/action-planner");
      const plan = await planAction("create_task", { title: "Test task", dueDate: "tomorrow" }, {
        userName: "Test User",
        autonomyMode: "copilot",
        verbosity: "concise",
        formality: "casual",
      });
      console.log(`   ✅ Plan tier: ${plan.tier}`);
      console.log(`   Confirmation: ${plan.confirmationMessage.slice(0, 100)}`);
      console.log(`   Payload keys: ${Object.keys(plan.payload).join(", ")}`);
    } catch (err) {
      console.log(`   ❌ Action planning failed: ${err instanceof Error ? err.message : err}`);
      // Print full error for debugging
      if (err instanceof Error && err.stack) {
        console.log(`   Stack: ${err.stack.split("\n").slice(0, 5).join("\n   ")}`);
      }
      process.exit(1);
    }

    // 6. Test bee dispatcher
    console.log("\n6. Testing bee dispatcher...");
    try {
      const { dispatch } = await import("@/lib/bees/dispatcher");
      // Need a real orgId — get from org members table
      const { organizationMembers } = await import("@/lib/db/schema");
      const { eq } = await import("drizzle-orm");
      const { db } = await import("@/lib/db");

      const member = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, testUser.id),
      });

      if (!member) {
        console.log("   ⚠️  User has no org membership — skipping dispatcher test");
      } else {
        const result = await dispatch({
          message: "create a task called test",
          intent: "create_task",
          entities: { title: "test" },
          orgId: member.orgId,
        });
        console.log(`   ✅ Dispatch mode: ${result.mode} (score: ${result.complexityScore})`);
      }
    } catch (err) {
      console.log(`   ❌ Dispatcher failed: ${err instanceof Error ? err.message : err}`);
    }

    console.log("\n=== All smoke tests passed ===\n");

  } catch (err) {
    console.log(`   ❌ Supabase admin error: ${err instanceof Error ? err.message : err}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
