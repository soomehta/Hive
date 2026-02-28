import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

let _r2: S3Client | null = null;
function getR2() {
  if (!_r2) {
    _r2 = new S3Client({
      region: "auto",
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _r2;
}

const BUCKET = process.env.R2_BUCKET_NAME ?? "hive-uploads";

export async function uploadAudio(
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  await getR2().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `audio/${key}`,
      Body: buffer,
      ContentType: contentType,
    })
  );

  const publicUrl = process.env.R2_PUBLIC_URL;
  if (publicUrl) {
    return `${publicUrl}/audio/${key}`;
  }
  return `audio/${key}`;
}

// ─── File Storage ───────────────────────────────────────

export async function uploadFile(
  orgId: string,
  projectId: string,
  buffer: Buffer,
  fileName: string,
  contentType: string
): Promise<string> {
  const timestamp = Date.now();
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const r2Key = `files/${orgId}/${projectId}/${timestamp}-${safeFileName}`;

  await getR2().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return r2Key;
}

export async function getSignedDownloadUrl(r2Key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: r2Key,
  });

  return getSignedUrl(getR2(), command, { expiresIn: 3600 });
}

export async function deleteR2File(r2Key: string): Promise<void> {
  await getR2().send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: r2Key,
    })
  );
}
