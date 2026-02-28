import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import { generateReport } from "@/lib/ai/report-generator";
import { errorResponse } from "@/lib/utils/errors";
import { aggregateReportData } from "@/lib/data/report-data";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`report:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();

    const {
      question,
      projectId,
      format = "narrative",
    } = body as {
      question: string;
      projectId?: string;
      format?: "narrative" | "structured" | "data_only";
    };

    if (!question || typeof question !== "string") {
      return Response.json(
        { error: "question is required" },
        { status: 400 }
      );
    }

    const now = new Date();
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [reportData, paProfile] = await Promise.all([
      aggregateReportData(auth.orgId, { start: oneMonthAgo, end: now }, projectId),
      getOrCreatePaProfile(auth.userId, auth.orgId),
    ]);

    // ── Data-only mode ───────────────────────────────────
    if (format === "data_only") {
      return Response.json({
        narrative: null,
        data: reportData,
        generatedAt: new Date().toISOString(),
      });
    }

    // ── Generate narrative via Claude ────────────────────
    const result = await generateReport(question, reportData, {
      role: paProfile.autonomyMode ?? "copilot",
      name: auth.userId,
      date: now.toISOString().split("T")[0],
    });

    return Response.json({
      narrative: result.narrative,
      data: format === "structured" ? reportData : undefined,
      generatedAt: result.generatedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
