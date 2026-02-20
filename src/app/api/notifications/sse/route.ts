import { createClient } from "@/lib/supabase/server";
import { sseManager } from "@/lib/notifications/sse";
import { nanoid } from "nanoid";

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
