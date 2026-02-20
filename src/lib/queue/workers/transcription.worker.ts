import { Job } from "bullmq";
import { createWorker, QUEUE_NAMES, getAIProcessingQueue } from "@/lib/queue";
import type { TranscriptionJob, AIProcessingJob } from "@/lib/queue/jobs";
import { transcribeAudio } from "@/lib/voice/deepgram";
import { createVoiceTranscript } from "@/lib/db/queries/pa-actions";

const worker = createWorker<TranscriptionJob>(
  QUEUE_NAMES.TRANSCRIPTION,
  async (job: Job<TranscriptionJob>) => {
    const { audioUrl, userId, orgId, format } = job.data;

    console.log(
      `[transcription] Processing job ${job.id} for user=${userId} org=${orgId}`
    );

    // 1. Fetch the audio from the URL
    const response = await fetch(audioUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch audio from ${audioUrl}: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    // 2. Transcribe via Deepgram
    const result = await transcribeAudio(audioBuffer, {
      mimeType: format,
    });

    console.log(
      `[transcription] Transcribed ${audioBuffer.length} bytes, confidence=${result.confidence.toFixed(2)}`
    );

    // 3. Store the transcript in the database
    const transcript = await createVoiceTranscript({
      userId,
      orgId,
      audioUrl,
      audioFormat: format,
      transcript: result.transcript,
      language: result.language,
      confidence: result.confidence,
      provider: "deepgram",
      rawResponse: { words: result.words },
    });

    // 4. Enqueue AI processing to classify intent and plan action
    const aiJob: AIProcessingJob = {
      transcript: result.transcript,
      userId,
      orgId,
      voiceTranscriptId: transcript.id,
    };

    await getAIProcessingQueue().add("process-transcript", aiJob, {
      priority: 1,
    });

    console.log(
      `[transcription] Completed job ${job.id}, enqueued AI processing for transcript=${transcript.id}`
    );

    return { transcriptId: transcript.id, text: result.transcript };
  },
  {
    concurrency: 3,
  }
);

worker.on("completed", (job) => {
  console.log(`[transcription] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[transcription] Job ${job?.id} failed: ${err.message}`,
    err.stack
  );
});

export { worker as transcriptionWorker };
