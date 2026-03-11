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
  val = val.replace(/^"(.*)"$/, "$1");
  process.env[key] = val;
}

async function main() {
  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");

  try {
    const result = await db.execute(
      sql`SELECT column_name FROM information_schema.columns WHERE table_name = 'items' ORDER BY ordinal_position`
    );
    console.log("items table columns:", JSON.stringify(result));
  } catch (e: any) {
    console.error("Error:", e.message);
  }

  // Also try a simple insert + rollback to see the exact error
  try {
    const schema = await import("@/lib/db/schema");
    const testResult = await db
      .insert(schema.items)
      .values({
        orgId: "00000000-0000-0000-0000-000000000000",
        type: "page",
        title: "test",
        ownerId: "test",
        attributes: {},
      })
      .returning();
    console.log("Insert succeeded (will clean up):", testResult[0]?.id);
    // Clean up
    if (testResult[0]?.id) {
      const { eq } = await import("drizzle-orm");
      await db.delete(schema.items).where(eq(schema.items.id, testResult[0].id));
    }
  } catch (e: any) {
    console.error("Insert error:", e.message);
  }

  process.exit();
}

main();
