import { NextRequest } from "next/server";
import { authenticateRequest } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { errorResponse } from "@/lib/utils/errors";
import { transcribeAudio as deepgramTranscribe } from "@/lib/voice/deepgram";
import { transcribeAudio as gladiaTranscribe } from "@/lib/voice/gladia";
import { uploadAudio } from "@/lib/storage/r2";
import { createVoiceTranscript } from "@/lib/db/queries/pa-actions";
import { createLogger } from "@/lib/logger";
import { randomUUID } from "crypto";

const log = createLogger("meetings-upload");

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB for meeting recordings
const ALLOWED_AUDIO_TYPES = [
  "audio/webm",
  "audio/wav",
  "audio/mp3",
  "audio/mpeg",
  "audio/ogg",
  "audio/mp4",
  "audio/flac",
  "audio/x-m4a",
  "audio/aac",
];
const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-matroska",
];
const ALLOWED_TYPES = [...ALLOWED_AUDIO_TYPES, ...ALLOWED_VIDEO_TYPES];

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`meetings:${auth.userId}`, 5, 300_000); // 5 per 5 min
    if (!rl.success) return rateLimitResponse(rl);

    const formData = await req.formData();
    const file = formData.get("recording") as File | null;
    if (!file) {
      return Response.json(
        { error: "No recording file provided" },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return Response.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return Response.json(
        {
          error: `Unsupported file type: ${file.type}. Supported: ${ALLOWED_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const fileId = randomUUID();
    const ext = file.name.split(".").pop() ?? "webm";

    // Upload to R2 in parallel with transcription
    const r2Key = `meetings/${auth.orgId}/${fileId}.${ext}`;
    const uploadPromise = uploadAudio(buffer, r2Key, file.type).catch((err) => {
      log.warn({ err }, "R2 upload failed (non-blocking)");
      return null;
    });

    // For video files, Deepgram and Gladia accept video and extract audio
    // server-side. Map to audio/mp4 so the provider uses the correct decoder.
    const mimeType = file.type.startsWith("video/") ? "audio/mp4" : file.type;

    // Transcribe: Deepgram first, Gladia fallback
    let transcript: string;
    let confidence: number;
    let language: string;
    let provider: string;
    let rawResponse: unknown;

    try {
      const result = await deepgramTranscribe(buffer, { mimeType });
      transcript = result.transcript;
      confidence = result.confidence;
      language = result.language;
      provider = "deepgram";
      rawResponse = result;

      // Fallback if low confidence
      if (confidence < 0.7) {
        log.info({ confidence }, "Low Deepgram confidence, trying Gladia");
        try {
          const gladiaResult = await gladiaTranscribe(buffer, { mimeType });
          if (gladiaResult.confidence > confidence) {
            transcript = gladiaResult.transcript;
            confidence = gladiaResult.confidence;
            language = gladiaResult.language;
            provider = "gladia";
            rawResponse = gladiaResult;
          }
        } catch (gladiaErr) {
          log.warn(
            { err: gladiaErr },
            "Gladia fallback failed, using Deepgram result"
          );
        }
      }
    } catch (deepgramErr) {
      log.warn({ err: deepgramErr }, "Deepgram failed, trying Gladia");
      try {
        const gladiaResult = await gladiaTranscribe(buffer, { mimeType });
        transcript = gladiaResult.transcript;
        confidence = gladiaResult.confidence;
        language = gladiaResult.language;
        provider = "gladia";
        rawResponse = gladiaResult;
      } catch (gladiaErr) {
        log.error({ err: gladiaErr }, "Both transcription providers failed");
        return Response.json(
          {
            error:
              "Transcription failed. Please try again or use a different file format.",
          },
          { status: 502 }
        );
      }
    }

    // Wait for R2 upload
    const audioUrl = await uploadPromise;

    // Store transcript in DB
    const voiceTranscript = await createVoiceTranscript({
      userId: auth.userId,
      orgId: auth.orgId,
      audioUrl: audioUrl ?? undefined,
      audioFormat: file.type,
      durationMs: undefined,
      transcript,
      language,
      confidence,
      provider,
      rawResponse: rawResponse as any,
    });

    return Response.json({
      data: {
        id: voiceTranscript.id,
        transcript,
        confidence,
        language,
        provider,
        fileName: file.name,
        fileSize: file.size,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
