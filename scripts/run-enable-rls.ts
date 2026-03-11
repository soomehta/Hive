/**
 * Enable Row Level Security on all Hive tables.
 * Usage: npx tsx scripts/run-enable-rls.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local
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

const ALL_TABLES = [
  // Organizations
  "organizations",
  "organization_members",
  "invitations",
  // Projects
  "projects",
  "project_members",
  // Tasks
  "tasks",
  "task_comments",
  // Messages
  "messages",
  // Activity
  "activity_log",
  // Notifications
  "notifications",
  // Files
  "files",
  // PA
  "pa_profiles",
  "pa_chat_sessions",
  "pa_conversations",
  "pa_actions",
  "pa_corrections",
  "scheduled_reports",
  "voice_transcripts",
  // Integrations
  "integrations",
  "calendar_subscriptions",
  // Embeddings
  "embeddings",
  // Bees
  "bee_templates",
  "bee_instances",
  "swarm_sessions",
  "bee_runs",
  "hive_context",
  "bee_handovers",
  "bee_signals",
  "agent_schedules",
  "agent_reports",
  "agent_checkins",
  "checkin_preferences",
  // Dashboard
  "dashboard_layouts",
  "component_registry",
  // Collaboration (Phase 6+)
  "items",
  "item_relations",
  "pages",
  "page_revisions",
  "pinboard_layouts_user",
  "notices",
  "chat_channels",
  "chat_channel_members",
  "chat_messages",
  "chat_threads",
  "chat_thread_messages",
  "mentions",
  "message_reactions",
  // Workspaces
  "workspaces",
  "workspace_members",
  // Guests
  "project_guests",
];

async function main() {
  console.log("\n=== Enabling RLS on all tables ===\n");

  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  let enabled = 0;
  let errors = 0;

  for (const table of ALL_TABLES) {
    try {
      // Enable RLS
      await db.execute(sql.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));

      // Force RLS even for table owner
      await db.execute(sql.raw(`ALTER TABLE "${table}" FORCE ROW LEVEL SECURITY`));

      // Remove any previous blanket-allow policies
      await db.execute(
        sql.raw(
          `DROP POLICY IF EXISTS "Allow authenticated access" ON "${table}"`
        )
      );
      await db.execute(
        sql.raw(
          `DROP POLICY IF EXISTS "Allow service_role access" ON "${table}"`
        )
      );

      // Deny-all policy for authenticated role: blocks direct PostgREST access.
      // All legitimate data access goes through Drizzle ORM using the postgres
      // role (connection pooler), which bypasses RLS as table owner.
      await db.execute(
        sql.raw(
          `CREATE POLICY "Deny authenticated direct access" ON "${table}" FOR ALL TO authenticated USING (false) WITH CHECK (false)`
        )
      );

      // Deny-all policy for anon role: blocks unauthenticated PostgREST access.
      await db.execute(
        sql.raw(
          `CREATE POLICY "Deny anon direct access" ON "${table}" FOR ALL TO anon USING (false) WITH CHECK (false)`
        )
      );

      console.log(`   ✅ ${table}`);
      enabled++;
    } catch (err) {
      console.log(
        `   ❌ ${table}: ${err instanceof Error ? err.message : err}`
      );
      errors++;
    }
  }

  // Verify
  console.log("\n--- Verification ---\n");
  const result = await db.execute(
    sql`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );

  let rlsOff = 0;
  for (const row of result.rows as any[]) {
    const status = row.rowsecurity ? "✅ ON" : "❌ OFF";
    if (!row.rowsecurity) rlsOff++;
    console.log(`   ${status}  ${row.tablename}`);
  }

  console.log(`\n=== Results: ${enabled} enabled, ${errors} errors, ${rlsOff} still off ===\n`);

  if (errors > 0 || rlsOff > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
