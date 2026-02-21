import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { transcribeAudio as deepgramTranscribe } from "@/lib/voice/deepgram";
import { transcribeAudio as gladiaTranscribe } from "@/lib/voice/gladia";
import { uploadAudio } from "@/lib/voice/r2";
import { createVoiceTranscript } from "@/lib/db/queries/pa-actions";
import { nanoid } from "nanoid";
import { createLogger } from "@/lib/logger";

const log = createLogger("voice-transcribe");

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = await rateLimit(`voice:${auth.userId}`, 10, 60_000);
    if (!rl.success) return rateLimitResponse(rl);

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return Response.json({ error: "Audio file is required" }, { status: 400 });
    }

    // Validate file size (max 25MB)
    const MAX_FILE_SIZE = 25 * 1024 * 1024;
    if (audioFile.size > MAX_FILE_SIZE) {
      return Response.json({ error: "Audio file too large (max 25MB)" }, { status: 400 });
    }

    // Validate MIME type
    const ALLOWED_AUDIO_TYPES = ["audio/webm", "audio/wav", "audio/mp3", "audio/mpeg", "audio/ogg", "audio/mp4", "audio/flac"];
    const mimeType = audioFile.type || "audio/webm";
    if (!ALLOWED_AUDIO_TYPES.includes(mimeType)) {
      return Response.json({ error: `Unsupported audio format: ${mimeType}` }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());

    // Validate magic bytes to ensure actual audio content
    const MAGIC_BYTES: Record<string, number[][]> = {
      "audio/wav": [[0x52, 0x49, 0x46, 0x46]], // RIFF
      "audio/mp3": [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2], [0x49, 0x44, 0x33]], // MP3 / ID3
      "audio/mpeg": [[0xFF, 0xFB], [0xFF, 0xF3], [0xFF, 0xF2], [0x49, 0x44, 0x33]],
      "audio/ogg": [[0x4F, 0x67, 0x67, 0x53]], // OggS
      "audio/flac": [[0x66, 0x4C, 0x61, 0x43]], // fLaC
      "audio/webm": [[0x1A, 0x45, 0xDF, 0xA3]], // EBML (WebM/Matroska)
      "audio/mp4": [[0x00, 0x00, 0x00]], // ftyp box (first 3 bytes are size)
    };
    const signatures = MAGIC_BYTES[mimeType];
    if (signatures && buffer.length >= 4) {
      const matches = signatures.some((sig) =>
        sig.every((byte, i) => buffer[i] === byte)
      );
      if (!matches) {
        return Response.json({ error: "File content does not match declared audio type" }, { status: 400 });
      }
    }
    const fileKey = `${auth.userId}/${nanoid()}.${mimeType.split("/")[1] ?? "webm"}`;

    // Upload to R2 in parallel with transcription
    const uploadPromise = uploadAudio(buffer, fileKey, mimeType).catch(() => null);

    // Try Deepgram first
    let result;
    let provider = "deepgram";
    try {
      result = await deepgramTranscribe(buffer, { mimeType });
    } catch {
      // Fallback to Gladia
      provider = "gladia";
      result = await gladiaTranscribe(buffer, { mimeType });
    }

    // If confidence is too low, retry with Gladia
    if (result.confidence < 0.7 && provider === "deepgram") {
      try {
        const gladiaResult = await gladiaTranscribe(buffer, { mimeType });
        if (gladiaResult.confidence > result.confidence) {
          result = gladiaResult;
          provider = "gladia";
        }
      } catch {
        // Keep Deepgram result
      }
    }

    const audioUrl = await uploadPromise;

    // Store transcript
    const transcript = await createVoiceTranscript({
      userId: auth.userId,
      orgId: auth.orgId,
      audioUrl: audioUrl ?? undefined,
      audioFormat: mimeType,
      transcript: result.transcript,
      language: result.language,
      confidence: result.confidence,
      provider,
      rawResponse: result as any,
    });

    return Response.json({
      id: transcript.id,
      transcript: result.transcript,
      language: result.language,
      confidence: result.confidence,
      durationMs: transcript.durationMs,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return Response.json({ error: error.message }, { status: error.statusCode });
    }
    log.error({ err: error }, "Voice transcribe error");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
