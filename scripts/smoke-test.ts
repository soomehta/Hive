import "dotenv/config";
import postgres from "postgres";

async function smokeTest() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const sql = postgres(dbUrl);
  console.log("Running database smoke tests...\n");

  // Test: Count records in key tables
  const tables = [
    "organizations",
    "organization_members",
    "projects",
    "tasks",
    "bee_templates",
    "bee_instances",
    "component_registry",
    "notifications",
    "pa_profiles",
    "embeddings",
    "dashboard_layouts",
  ];

  for (const t of tables) {
    try {
      const [row] = await sql.unsafe(
        `SELECT COUNT(*)::int as count FROM ${t}`
      );
      console.log(`✓ ${t}: ${row.count} rows`);
    } catch (e: any) {
      console.log(`✗ ${t}: ${e.message}`);
    }
  }

  // Test: Verify pgvector extension
  console.log("");
  try {
    const [ext] = await sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector'`;
    console.log(`✓ pgvector: v${ext.extversion}`);
  } catch {
    console.log("✗ pgvector extension not found");
  }

  // Test: Verify HNSW index exists
  try {
    const [idx] = await sql`SELECT indexname FROM pg_indexes WHERE indexname = 'embeddings_vector_idx'`;
    console.log(`✓ HNSW index: ${idx.indexname}`);
  } catch {
    console.log("✗ HNSW index not found");
  }

  // Test: Verify trigger function exists
  try {
    const [fn] = await sql`SELECT routine_name FROM information_schema.routines WHERE routine_name = 'update_updated_at'`;
    console.log(`✓ Trigger function: ${fn.routine_name}`);
  } catch {
    console.log("✗ update_updated_at function not found");
  }

  // Test: Count triggers
  try {
    const [triggers] = await sql`SELECT COUNT(*)::int as count FROM information_schema.triggers WHERE trigger_name LIKE 'update_%_updated_at'`;
    console.log(`✓ updated_at triggers: ${triggers.count}`);
  } catch {
    console.log("✗ Could not count triggers");
  }

  // Test: Verify all enums exist
  console.log("");
  const expectedEnums = [
    "org_role",
    "project_status",
    "task_status",
    "task_priority",
    "activity_type",
    "notification_type",
    "autonomy_tier",
    "action_status",
    "integration_provider",
    "bee_type",
    "bee_subtype",
    "bee_run_status",
    "swarm_status",
    "handover_type",
    "signal_type",
    "pathway",
    "dashboard_component_type",
  ];

  for (const e of expectedEnums) {
    try {
      const rows = await sql`SELECT 1 FROM pg_type WHERE typname = ${e}`;
      if (rows.length > 0) {
        console.log(`✓ enum: ${e}`);
      } else {
        console.log(`✗ enum missing: ${e}`);
      }
    } catch {
      console.log(`✗ enum check failed: ${e}`);
    }
  }

  await sql.end();
  console.log("\nSmoke test complete.");
}

smokeTest().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
