import { NextRequest } from "next/server";
import { authenticateRequest, AuthError } from "@/lib/auth/api-auth";
import { transcribeAudio as deepgramTranscribe } from "@/lib/voice/deepgram";
import { transcribeAudio as gladiaTranscribe } from "@/lib/voice/gladia";
import { uploadAudio } from "@/lib/voice/r2";
import { createVoiceTranscript } from "@/lib/db/queries/pa-actions";
import { nanoid } from "nanoid";

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticateRequest(req);
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return Response.json({ error: "Audio file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || "audio/webm";
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
