import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import {
  getSwarmSession,
  getSwarmRuns,
} from "@/lib/db/queries/swarm-sessions";
import { getSwarmContext } from "@/lib/bees/context";
import { getSwarmSignals } from "@/lib/bees/signals";
import { getSwarmHandovers } from "@/lib/bees/handover";
import { createLogger } from "@/lib/logger";
import { errorResponse } from "@/lib/utils/errors";

const log = createLogger("swarm-stream");

interface RouteParams {
  params: Promise<{ swarmId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { swarmId } = await params;

    const session = await getSwarmSession(swarmId);
    if (!session || session.orgId !== auth.orgId) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

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

        // Poll for updates (SSE polling pattern for serverless)
        let lastRunCount = 0;
        let lastContextCount = 0;
        let lastSignalCount = 0;
        let lastHandoverCount = 0;

        const poll = async () => {
          if (closed) return;

          try {
            const [currentSession, runs, context, signals, handovers] =
              await Promise.all([
                getSwarmSession(swarmId),
                getSwarmRuns(swarmId),
                getSwarmContext(swarmId),
                getSwarmSignals(swarmId),
                getSwarmHandovers(swarmId),
              ]);

            // Emit new bee run status changes
            if (runs.length > lastRunCount) {
              for (let i = lastRunCount; i < runs.length; i++) {
                send("bee_run_status", runs[i]);
              }
              lastRunCount = runs.length;
            } else {
              // Check for status changes in existing runs
              for (const run of runs) {
                send("bee_run_progress", {
                  runId: run.id,
                  status: run.status,
                  statusText: run.statusText,
                });
              }
            }

            // Emit new context entries
            if (context.length > lastContextCount) {
              for (let i = lastContextCount; i < context.length; i++) {
                send("hive_context_update", context[i]);
              }
              lastContextCount = context.length;
            }

            // Emit new signals
            if (signals.length > lastSignalCount) {
              for (let i = lastSignalCount; i < signals.length; i++) {
                send("bee_signal", signals[i]);
              }
              lastSignalCount = signals.length;
            }

            // Emit new handovers
            if (handovers.length > lastHandoverCount) {
              for (let i = lastHandoverCount; i < handovers.length; i++) {
                send("bee_handover", handovers[i]);
              }
              lastHandoverCount = handovers.length;
            }

            // Check if swarm is done
            if (
              currentSession &&
              (currentSession.status === "completed" ||
                currentSession.status === "failed")
            ) {
              send("swarm_completed", {
                status: currentSession.status,
                result: currentSession.result,
              });
              closed = true;
              controller.close();
              return;
            }

            // Continue polling
            if (!closed) {
              setTimeout(poll, 1000);
            }
          } catch (err) {
            log.error({ err }, "SSE poll error");
            if (!closed) {
              closed = true;
              controller.close();
            }
          }
        };

        // Start polling
        await poll();
      },
      cancel() {
        closed = true;
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
