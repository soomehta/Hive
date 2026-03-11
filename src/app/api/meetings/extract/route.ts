import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { handleExtractTasks } from "@/lib/actions/handlers/extract-tasks";
import { createLogger } from "@/lib/logger";

const log = createLogger("meetings-extract");

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`meetings-extract:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const { transcript, voiceTranscriptId } = body;

    if (
      !transcript ||
      typeof transcript !== "string" ||
      transcript.trim().length < 10
    ) {
      return Response.json(
        { error: "Transcript must be at least 10 characters" },
        { status: 400 }
      );
    }

    log.info(
      { voiceTranscriptId, len: transcript.length },
      "Extracting tasks from meeting transcript"
    );

    const result = await handleExtractTasks({
      orgId: auth.orgId,
      plannedPayload: { notes: transcript },
    } as any);

    if (!result.success) {
      return Response.json(
        { error: result.error ?? "Failed to extract tasks" },
        { status: 500 }
      );
    }

    return Response.json({ data: result.result });
  } catch (error) {
    return errorResponse(error);
  }
}
