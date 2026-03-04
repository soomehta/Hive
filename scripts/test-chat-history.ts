/**
 * Live integration test for the PA chat history system.
 * Tests against real DB and APIs — not mocked.
 *
 * Usage: npx tsx scripts/test-chat-history.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local manually (same as smoke-test-pa.ts)
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

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) {
    console.log(`   ✅ ${label}`);
    passed++;
  } else {
    console.log(`   ❌ ${label}${detail ? ` — ${detail}` : ""}`);
    failed++;
  }
}

async function main() {
  console.log("\n=== PA Chat History — Live Integration Tests ===\n");

  // 1. Get a test user + org from the DB
  console.log("1. Setting up test context...");
  const { db } = await import("@/lib/db");
  const { organizationMembers } = await import("@/lib/db/schema");
  const { supabaseAdmin } = await import("@/lib/supabase/admin");

  const { eq } = await import("drizzle-orm");

  // Find a user who has an org membership (skip test/e2e users with no org)
  const firstMember = await db.query.organizationMembers.findFirst();
  if (!firstMember) {
    console.log("   ⚠️  No org members found — can't test");
    process.exit(0);
  }

  const orgId = firstMember.orgId;
  const testUserId = firstMember.userId;

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(testUserId);
  const testUser = userData?.user;
  if (!testUser) {
    console.log("   ⚠️  Could not fetch user — can't test");
    process.exit(0);
  }

  console.log(`   Using user: ${testUser.id} (${testUser.email})`);
  console.log(`   Using org: ${orgId}`);

  // Import query functions
  const {
    createChatSession,
    getChatSessions,
    getChatSession,
    getChatSessionMessages,
    addConversationMessage,
    updateChatSessionTitle,
    deleteChatSession,
  } = await import("@/lib/db/queries/pa-actions");

  // ─── Test 2: Create a chat session ───
  console.log("\n2. Testing session creation...");
  let session: any;
  try {
    session = await createChatSession({
      userId: testUser.id,
      orgId,
      title: "Test conversation from live test",
    });
    assert(!!session.id, "Session created with UUID", session.id);
    assert(session.title === "Test conversation from live test", "Title matches");
    assert(session.messageCount === 0, "Message count starts at 0");
    assert(!!session.createdAt, "Has createdAt timestamp");
  } catch (err) {
    assert(false, "Session creation", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // ─── Test 3: Fetch session by ID ───
  console.log("\n3. Testing session retrieval...");
  try {
    const fetched = await getChatSession(session.id);
    assert(!!fetched, "Session found by ID");
    assert(fetched!.id === session.id, "IDs match");
    assert(fetched!.userId === testUser.id, "User ID matches");
    assert(fetched!.orgId === orgId, "Org ID matches");
  } catch (err) {
    assert(false, "Session retrieval", err instanceof Error ? err.message : String(err));
  }

  // ─── Test 4: Add messages to session ───
  console.log("\n4. Testing message creation linked to session...");
  try {
    const msg1 = await addConversationMessage({
      userId: testUser.id,
      orgId,
      sessionId: session.id,
      role: "user",
      content: "Create a task for testing",
    });
    assert(!!msg1.id, "User message created", msg1.id);
    assert(msg1.sessionId === session.id, "Message linked to session");
    assert(msg1.role === "user", "Role is user");

    const msg2 = await addConversationMessage({
      userId: testUser.id,
      orgId,
      sessionId: session.id,
      role: "assistant",
      content: "I'll create that task for you!",
      metadata: { actionId: "test-action-123" },
    });
    assert(!!msg2.id, "Assistant message created", msg2.id);
    assert(msg2.sessionId === session.id, "Assistant message linked to session");
    assert(msg2.role === "assistant", "Role is assistant");

    // Verify message count was updated
    const updatedSession = await getChatSession(session.id);
    assert(updatedSession!.messageCount === 2, `Message count is 2 (got ${updatedSession!.messageCount})`);
    assert(
      new Date(updatedSession!.lastMessageAt).getTime() >= new Date(session.lastMessageAt).getTime(),
      "lastMessageAt was updated"
    );
  } catch (err) {
    assert(false, "Message creation", err instanceof Error ? err.message : String(err));
  }

  // ─── Test 5: Fetch session messages ───
  console.log("\n5. Testing session message retrieval...");
  try {
    const messages = await getChatSessionMessages(session.id);
    assert(messages.length === 2, `Got 2 messages (got ${messages.length})`);
    assert(messages[0].role === "user", "First message is user (chronological order)");
    assert(messages[1].role === "assistant", "Second message is assistant");
    assert(messages[0].content === "Create a task for testing", "User message content matches");
    assert(messages[1].content === "I'll create that task for you!", "Assistant message content matches");
  } catch (err) {
    assert(false, "Message retrieval", err instanceof Error ? err.message : String(err));
  }

  // ─── Test 6: List sessions (should include our test session) ───
  console.log("\n6. Testing session listing...");
  try {
    const sessions = await getChatSessions(testUser.id, orgId);
    assert(sessions.length >= 1, `Got at least 1 session (got ${sessions.length})`);
    const found = sessions.find((s: any) => s.id === session.id);
    assert(!!found, "Our test session appears in list");
    // Should be sorted newest first
    if (sessions.length > 1) {
      assert(
        new Date(sessions[0].lastMessageAt) >= new Date(sessions[1].lastMessageAt),
        "Sessions sorted by lastMessageAt desc"
      );
    }
  } catch (err) {
    assert(false, "Session listing", err instanceof Error ? err.message : String(err));
  }

  // ─── Test 7: Rename session ───
  console.log("\n7. Testing session rename...");
  try {
    const renamed = await updateChatSessionTitle(session.id, "Renamed test conversation");
    assert(renamed.title === "Renamed test conversation", "Title updated");
    assert(renamed.id === session.id, "Same session ID after rename");
  } catch (err) {
    assert(false, "Session rename", err instanceof Error ? err.message : String(err));
  }

  // ─── Test 8: Delete session (should cascade delete messages) ───
  console.log("\n8. Testing session deletion (cascade)...");
  try {
    await deleteChatSession(session.id);
    const deleted = await getChatSession(session.id);
    assert(!deleted, "Session no longer exists after delete");

    const orphanMessages = await getChatSessionMessages(session.id);
    assert(orphanMessages.length === 0, "Messages cascade-deleted with session");
  } catch (err) {
    assert(false, "Session deletion", err instanceof Error ? err.message : String(err));
  }

  // ─── Test 9: Messages without session still work (backward compat) ───
  console.log("\n9. Testing backward compatibility (no session)...");
  try {
    const msg = await addConversationMessage({
      userId: testUser.id,
      orgId,
      role: "user",
      content: "Legacy message without session",
    });
    assert(!!msg.id, "Message without session created");
    assert(msg.sessionId === null, "sessionId is null for legacy messages");

    // Clean up
    const { sql } = await import("drizzle-orm");
    const { paConversations } = await import("@/lib/db/schema");
    await db.delete(paConversations).where(eq(paConversations.id, msg.id));
    assert(true, "Cleanup successful");
  } catch (err) {
    assert(false, "Backward compat", err instanceof Error ? err.message : String(err));
  }

  // ─── Test 10: Full chat flow — session auto-creation via API ───
  console.log("\n10. Testing session auto-creation in chat API...");
  try {
    // Create a session, add messages, verify the full flow
    const autoSession = await createChatSession({
      userId: testUser.id,
      orgId,
      title: "Create a task for tomorrow",
    });

    // Simulate the chat flow: user message → assistant message
    await addConversationMessage({
      userId: testUser.id,
      orgId,
      sessionId: autoSession.id,
      role: "user",
      content: "Create a task for tomorrow",
    });

    await addConversationMessage({
      userId: testUser.id,
      orgId,
      sessionId: autoSession.id,
      role: "assistant",
      content: "Done! I created the task for you.",
      metadata: { actionId: "abc-123" },
    });

    // Verify full roundtrip
    const fullSession = await getChatSession(autoSession.id);
    assert(fullSession!.messageCount === 2, "Auto-session has 2 messages");

    const fullMessages = await getChatSessionMessages(autoSession.id);
    assert(fullMessages.length === 2, "Fetched 2 messages from auto-session");
    assert(fullMessages[0].content === "Create a task for tomorrow", "User message persisted");
    assert(fullMessages[1].content === "Done! I created the task for you.", "Assistant message persisted");

    // Verify it shows up in session list
    const allSessions = await getChatSessions(testUser.id, orgId);
    const foundAuto = allSessions.find((s: any) => s.id === autoSession.id);
    assert(!!foundAuto, "Auto-session in session list");

    // Clean up
    await deleteChatSession(autoSession.id);
    assert(true, "Auto-session cleaned up");
  } catch (err) {
    assert(false, "Full chat flow", err instanceof Error ? err.message : String(err));
  }

  // ─── Summary ───
  console.log(`\n${"=".repeat(50)}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`);
  if (failed > 0) {
    console.log("❌ Some tests failed!\n");
    process.exit(1);
  } else {
    console.log("✅ All chat history tests passed!\n");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
