/**
 * Verify RLS status on all tables.
 * Usage: npx tsx scripts/verify-rls.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

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

async function main() {
  console.log("\n=== RLS Verification ===\n");

  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  // Check RLS status
  const result = await db.execute(
    sql`SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`
  );

  let rlsOn = 0;
  let rlsOff = 0;
  const rows = Array.isArray(result) ? result : (result as any).rows ?? Object.values(result);

  for (const row of rows) {
    const name = (row as any).tablename;
    const enabled = (row as any).rowsecurity;
    const status = enabled ? "✅ ON " : "❌ OFF";
    if (enabled) rlsOn++;
    else rlsOff++;
    console.log(`   ${status}  ${name}`);
  }

  // Check policies
  console.log("\n--- Policies ---\n");
  const policies = await db.execute(
    sql`SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname`
  );
  const policyRows = Array.isArray(policies) ? policies : (policies as any).rows ?? Object.values(policies);

  for (const row of policyRows) {
    console.log(`   ${(row as any).tablename}: ${(row as any).policyname}`);
  }

  console.log(`\n=== ${rlsOn} tables with RLS ON, ${rlsOff} tables with RLS OFF ===\n`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
