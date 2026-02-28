import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { isProjectMember } from "@/lib/db/queries/projects";
import { getFilesByProject, createFile } from "@/lib/db/queries/files";
import { uploadFile } from "@/lib/storage/r2";
import { logActivity } from "@/lib/db/queries/activity";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

interface RouteParams {
  params: Promise<{ projectId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { projectId } = await params;

    const isMember = await isProjectMember(projectId, auth.userId);
    if (!isMember) {
      return Response.json(
        { error: "Not a member of this project" },
        { status: 403 }
      );
    }

    const files = await getFilesByProject(projectId);
    return Response.json({ data: files });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`files:upload:${auth.userId}`, 20, 60_000);
    if (!rl.success) return rateLimitResponse(rl);
    const { projectId } = await params;

    const isMember = await isProjectMember(projectId, auth.userId);
    if (!isMember) {
      return Response.json(
        { error: "Not a member of this project" },
        { status: 403 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const taskId = formData.get("taskId") as string | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        { error: "File too large (max 50 MB)" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const r2Key = await uploadFile(
      auth.orgId,
      projectId,
      buffer,
      file.name,
      file.type || "application/octet-stream"
    );

    const record = await createFile({
      orgId: auth.orgId,
      projectId,
      taskId: taskId ?? undefined,
      uploadedBy: auth.userId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      r2Key,
    });

    await logActivity({
      orgId: auth.orgId,
      projectId,
      userId: auth.userId,
      type: "project_updated",
      metadata: { action: "file_uploaded", fileName: file.name, fileSize: file.size },
    });

    return Response.json({ data: record }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
