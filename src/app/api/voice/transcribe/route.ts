import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { rateLimit, rateLimitResponse } from "@/lib/utils/rate-limit";
import { transcribeAudio as deepgramTranscribe } from "@/lib/voice/deepgram";
import { transcribeAudio as gladiaTranscribe } from "@/lib/voice/gladia";
import { uploadAudio } from "@/lib/voice/r2";
import { createVoiceTranscript } from "@/lib/db/queries/pa-actions";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const rl = rateLimit(`voice:${auth.userId}`, 10, 60_000);
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
    console.error("Voice transcribe error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
