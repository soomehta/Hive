import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { getOrCreatePaProfile } from "@/lib/db/queries/pa-profiles";
import { generateReport } from "@/lib/ai/report-generator";
import { errorResponse } from "@/lib/utils/errors";
import { aggregateReportData } from "@/lib/data/report-data";
import { reportQuerySchema } from "@/lib/utils/validation";
import { hasPermission } from "@/lib/auth/permissions";
import { getProject } from "@/lib/db/queries/projects";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`report:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const body = await req.json();
    const parsed = reportQuerySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { question, projectId, format = "narrative" } = parsed.data;

    // If projectId is provided, verify the user has access
    if (projectId) {
      const project = await getProject(projectId);
      if (!project || project.orgId !== auth.orgId) {
        return Response.json({ error: "Project not found" }, { status: 404 });
      }
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
