import { createClient, type DeepgramClient } from "@deepgram/sdk";

let _deepgram: DeepgramClient | null = null;
function getDeepgram() {
  if (!_deepgram) {
    _deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
  }
  return _deepgram;
}

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
    keywords?: string[];
  }
): Promise<TranscriptionResult> {
  const { result } = await getDeepgram().listen.prerecorded.transcribeFile(
    audioBuffer,
    {
      model: "nova-3",
      smart_format: true,
      diarize: false,
      filler_words: false,
      language: options.languageHints?.[0] ?? "en",
      keywords: options.keywords,
      mimetype: options.mimeType,
    }
  );

  if (!result?.results?.channels?.[0]?.alternatives?.[0]) {
    return { transcript: "", confidence: 0, language: "en", words: [] };
  }
  const channel = result.results.channels[0];
  const alternative = channel.alternatives[0];

  return {
    transcript: alternative.transcript,
    confidence: alternative.confidence,
    language: channel.detected_language ?? "en",
    words: (alternative.words ?? []).map((w: any) => ({
      word: w.word,
      start: w.start,
      end: w.end,
      confidence: w.confidence,
    })),
  };
}
