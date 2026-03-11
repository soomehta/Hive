import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { getChannels, listChannelMessages } from "@/lib/db/queries/chat";
import { getNotices } from "@/lib/db/queries/notices";
import { errorResponse } from "@/lib/utils/errors";

/**
 * GET /api/sse — Server-Sent Events fallback for real-time updates.
 *
 * PRIMARY real-time mechanism: Supabase Realtime (see src/hooks/use-realtime.ts).
 * This SSE endpoint serves as a FALLBACK for environments where Supabase Realtime
 * is unavailable or for lightweight polling without WebSocket overhead.
 *
 * Delivers events for:
 * - chat:new_messages — new messages across user's channels
 * - notices:updated — new or changed notices
 * - pinboard:counters — channel/notice counts for pinboard cards
 *
 * Clients connect with EventSource. Poll interval: 5s (serverless-friendly).
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);

    const encoder = new TextEncoder();
    let closed = false;

    const stream = new ReadableStream({
      async start(controller) {
        function send(event: string, data: unknown) {
          if (closed) return;
          try {
            controller.enqueue(
              encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            closed = true;
          }
        }

        send("connected", { userId: auth.userId, orgId: auth.orgId });

        let lastPollTime = new Date().toISOString();

        const poll = async () => {
          if (closed) return;

          try {
            // 1. Check for new chat messages across org channels
            const channels = await getChannels(auth.orgId);
            let newMessageCount = 0;
            const updatedChannelIds: string[] = [];

            for (const ch of channels.slice(0, 10)) {
              const msgs = await listChannelMessages(auth.orgId, ch.id);
              const recent = msgs.filter(
                (m) => new Date(m.createdAt).toISOString() > lastPollTime
              );
              if (recent.length > 0) {
                newMessageCount += recent.length;
                updatedChannelIds.push(ch.id);
              }
            }

            if (newMessageCount > 0) {
              send("chat:new_messages", {
                count: newMessageCount,
                channels: updatedChannelIds,
              });
            }

            // 2. Check for new notices
            const allNotices = await getNotices(auth.orgId);
            const newNotices = allNotices.filter(
              (n) => new Date(n.createdAt).toISOString() > lastPollTime
            );
            if (newNotices.length > 0) {
              send("notices:updated", {
                count: newNotices.length,
                notices: newNotices.map((n) => ({ id: n.id, title: n.title })),
              });
            }

            // 3. Send pinboard counters
            send("pinboard:counters", {
              channels: channels.length,
              activeNotices: allNotices.filter((n) => n.status === "active").length,
            });

            lastPollTime = new Date().toISOString();
          } catch {
            // Swallow poll errors — stream stays alive
          }

          if (!closed) {
            setTimeout(poll, 5000);
          }
        };

        poll();

        // Keep-alive heartbeat every 30s
        const heartbeat = setInterval(() => {
          if (closed) {
            clearInterval(heartbeat);
            return;
          }
          send("heartbeat", { ts: Date.now() });
        }, 30000);

        req.signal.addEventListener("abort", () => {
          closed = true;
          clearInterval(heartbeat);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
