import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";

export async function getFilesByProject(projectId: string) {
  return db
    .select()
    .from(files)
    .where(eq(files.projectId, projectId))
    .orderBy(desc(files.createdAt));
}

export async function getFile(fileId: string) {
  return db.query.files.findFirst({
    where: eq(files.id, fileId),
  });
}

export async function createFile(data: {
  orgId: string;
  projectId: string;
  taskId?: string;
  uploadedBy: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  r2Key: string;
}) {
  const [file] = await db
    .insert(files)
    .values({
      orgId: data.orgId,
      projectId: data.projectId,
      taskId: data.taskId ?? null,
      uploadedBy: data.uploadedBy,
      fileName: data.fileName,
      fileSize: data.fileSize,
      mimeType: data.mimeType,
      r2Key: data.r2Key,
    })
    .returning();

  return file;
}

export async function deleteFile(fileId: string) {
  const [deleted] = await db
    .delete(files)
    .where(eq(files.id, fileId))
    .returning();

  return deleted;
}
