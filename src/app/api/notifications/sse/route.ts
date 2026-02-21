import { createClient } from "@/lib/supabase/server";
import { sseManager } from "@/lib/notifications/sse";
import { nanoid } from "nanoid";
import { db } from "@/lib/db";
import { organizationMembers } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // EventSource API doesn't support custom headers, so accept orgId via query param as fallback
  const url = new URL(req.url);
  const orgId = req.headers.get("x-org-id") ?? url.searchParams.get("orgId");
  if (!orgId) {
    return Response.json({ error: "Missing organization" }, { status: 400 });
  }

  if (!UUID_REGEX.test(orgId)) {
    return Response.json({ error: "Invalid organization ID" }, { status: 400 });
  }

  // Verify org membership
  const member = await db.query.organizationMembers.findFirst({
    where: and(
      eq(organizationMembers.orgId, orgId),
      eq(organizationMembers.userId, user.id)
    ),
  });
  if (!member) {
    return Response.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  const clientId = nanoid();

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": connected\n\n"));

      sseManager.addClient(clientId, controller, user.id, orgId);
    },
    cancel() {
      sseManager.removeClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
