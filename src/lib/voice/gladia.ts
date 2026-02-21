export interface TranscriptionResult {
  transcript: string;
  confidence: number;
  language: string;
  words: Array<{ word: string; start: number; end: number; confidence: number }>;
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  options: {
    mimeType: string;
    languageHints?: string[];
  }
): Promise<TranscriptionResult> {
  // Upload audio
  const uploadRes = await fetch("https://api.gladia.io/v2/upload", {
    method: "POST",
    headers: {
      "x-gladia-key": process.env.GLADIA_API_KEY!,
      "Content-Type": options.mimeType,
    },
    body: new Uint8Array(audioBuffer),
  });

  if (!uploadRes.ok) {
    throw new Error(`Gladia upload failed: ${uploadRes.statusText}`);
  }

  const { audio_url } = await uploadRes.json();

  // Request transcription
  const transcribeRes = await fetch("https://api.gladia.io/v2/transcription", {
    method: "POST",
    headers: {
      "x-gladia-key": process.env.GLADIA_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      audio_url,
      language_config: {
        languages: options.languageHints ?? ["en"],
      },
    }),
  });

  if (!transcribeRes.ok) {
    throw new Error(`Gladia transcription failed: ${transcribeRes.statusText}`);
  }

  const { id, result_url } = await transcribeRes.json();

  // Validate result_url to prevent SSRF — must be a Gladia API URL
  const ALLOWED_GLADIA_ORIGINS = ["https://api.gladia.io"];
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(result_url);
  } catch {
    throw new Error("Gladia returned an invalid result URL");
  }
  if (!ALLOWED_GLADIA_ORIGINS.some((origin) => parsedUrl.origin === origin)) {
    throw new Error(`Gladia result_url has unexpected origin: ${parsedUrl.origin}`);
  }

  // Poll for result
  let result;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(result_url, {
      headers: { "x-gladia-key": process.env.GLADIA_API_KEY! },
    });
    const pollData = await pollRes.json();
    if (pollData.status === "done") {
      result = pollData.result;
      break;
    }
    if (pollData.status === "error") {
      throw new Error(`Gladia transcription error: ${pollData.error}`);
    }
  }

  if (!result) {
    throw new Error("Gladia transcription timed out");
  }

  const utterance = result.transcription.utterances[0];
  return {
    transcript: result.transcription.full_transcript,
    confidence: utterance?.confidence ?? 0.8,
    language: result.transcription.languages?.[0] ?? "en",
    words: (utterance?.words ?? []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
  };
}
