import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { getFile, deleteFile } from "@/lib/db/queries/files";
import { getSignedDownloadUrl, deleteR2File } from "@/lib/voice/r2";
import { createLogger } from "@/lib/logger";

const log = createLogger("files");

interface RouteParams {
  params: Promise<{ projectId: string; fileId: string }>;
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { fileId } = await params;

    const file = await getFile(fileId);
    if (!file || file.orgId !== auth.orgId) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    const downloadUrl = await getSignedDownloadUrl(file.r2Key);
    return Response.json({ data: { ...file, downloadUrl } });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "GET /api/projects/[projectId]/files/[fileId] error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const auth = await authenticateRequest(req);
    const { fileId } = await params;

    const file = await getFile(fileId);
    if (!file || file.orgId !== auth.orgId) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    // Only uploader or admin/owner can delete
    const isUploader = file.uploadedBy === auth.userId;
    const isAdminOrOwner =
      auth.memberRole === "admin" || auth.memberRole === "owner";

    if (!isUploader && !isAdminOrOwner) {
      return Response.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    await deleteR2File(file.r2Key);
    const deleted = await deleteFile(fileId);

    return Response.json({ data: { id: deleted.id } });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    log.error({ err: error }, "DELETE /api/projects/[projectId]/files/[fileId] error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
