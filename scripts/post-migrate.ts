import "dotenv/config";
import postgres from "postgres";

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  // Use direct connection (port 5432) for DDL
  const directUrl = dbUrl.replace(":6543/", ":5432/");
  const sql = postgres(directUrl);

  console.log("Running post-migrate SQL...\n");

  // 1. Enable pgvector extension
  try {
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    console.log("✓ pgvector extension enabled");
  } catch (e: any) {
    console.log("pgvector:", e.message);
  }

  // 2. Create HNSW index for similarity search
  try {
    await sql`CREATE INDEX IF NOT EXISTS embeddings_vector_idx ON embeddings USING hnsw (embedding vector_cosine_ops)`;
    console.log("✓ HNSW index created on embeddings");
  } catch (e: any) {
    console.log("HNSW index:", e.message);
  }

  // 3. Create updated_at trigger function
  try {
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log("✓ update_updated_at() function created");
  } catch (e: any) {
    console.log("Trigger function:", e.message);
  }

  // 4. Apply triggers to all tables with updated_at
  const tables = [
    "organizations",
    "projects",
    "tasks",
    "messages",
    "task_comments",
    "pa_profiles",
    "integrations",
    // Phase 5 tables
    "bee_templates",
    "bee_instances",
    "bee_runs",
    "swarm_sessions",
    "dashboard_layouts",
  ];

  for (const table of tables) {
    const triggerName = `update_${table}_updated_at`;
    try {
      await sql.unsafe(`
        CREATE TRIGGER ${triggerName}
        BEFORE UPDATE ON ${table}
        FOR EACH ROW EXECUTE FUNCTION update_updated_at()
      `);
      console.log(`✓ Trigger ${triggerName}`);
    } catch (e: any) {
      if (e.message.includes("already exists")) {
        console.log(`~ Trigger ${triggerName} (already exists)`);
      } else {
        console.log(`✗ Trigger ${triggerName}: ${e.message}`);
      }
    }
  }

  await sql.end();
  console.log("\nPost-migrate SQL complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Post-migrate failed:", err);
  process.exit(1);
});
