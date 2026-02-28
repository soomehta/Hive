import { Job } from "bullmq";
import { QUEUE_NAMES, getAIProcessingQueue } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { TranscriptionJob, AIProcessingJob } from "@/lib/queue/jobs";
import { transcribeAudio } from "@/lib/voice/deepgram";
import { createVoiceTranscript } from "@/lib/db/queries/pa-actions";

const { worker, log } = createTypedWorker<TranscriptionJob>(
  "transcription",
  QUEUE_NAMES.TRANSCRIPTION,
  async (job: Job<TranscriptionJob>) => {
    const { audioUrl, userId, orgId, format } = job.data;

    log.info(
      { jobId: job.id, userId, orgId },
      "Processing transcription job"
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

    log.info(
      { jobId: job.id, bytes: audioBuffer.length, confidence: result.confidence.toFixed(2) },
      "Transcription complete"
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

    log.info(
      { jobId: job.id, transcriptId: transcript.id },
      "Completed, enqueued AI processing"
    );

    return { transcriptId: transcript.id, text: result.transcript };
  },
  { concurrency: 3 }
);

export { worker as transcriptionWorker };
