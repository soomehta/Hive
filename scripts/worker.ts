import "dotenv/config";

async function startWorker() {
  console.log("[worker] BullMQ worker process starting...");
  console.log(`[worker] NODE_ENV=${process.env.NODE_ENV ?? "development"}`);
  console.log(`[worker] Redis URL configured: ${process.env.REDIS_URL ? "yes" : "NO — set REDIS_URL"}`);

  // Import all workers — each module registers itself with BullMQ on import.
  // Failures during import are fatal and will be caught by the outer catch.

  const { transcriptionWorker } = await import(
    "../src/lib/queue/workers/transcription.worker"
  );
  console.log("[worker] Registered: transcription");

  const { aiProcessingWorker } = await import(
    "../src/lib/queue/workers/ai-processing.worker"
  );
  console.log("[worker] Registered: ai-processing");

  const { actionExecutionWorker } = await import(
    "../src/lib/queue/workers/action-execution.worker"
  );
  console.log("[worker] Registered: action-execution");

  const { embeddingWorker } = await import(
    "../src/lib/queue/workers/embedding.worker"
  );
  console.log("[worker] Registered: embedding");

  const { notificationWorker } = await import(
    "../src/lib/queue/workers/notification.worker"
  );
  console.log("[worker] Registered: notification");

  const { morningBriefingWorker } = await import(
    "../src/lib/queue/workers/morning-briefing.worker"
  );
  console.log("[worker] Registered: morning-briefing");

  const { weeklyDigestWorker } = await import(
    "../src/lib/queue/workers/weekly-digest.worker"
  );
  console.log("[worker] Registered: weekly-digest");

  const { profileLearningWorker } = await import(
    "../src/lib/queue/workers/profile-learning.worker"
  );
  console.log("[worker] Registered: profile-learning");

  console.log("[worker] All 8 workers registered. Waiting for jobs...");

  // Collect all workers for graceful shutdown
  const workers = [
    transcriptionWorker,
    aiProcessingWorker,
    actionExecutionWorker,
    embeddingWorker,
    notificationWorker,
    morningBriefingWorker,
    weeklyDigestWorker,
    profileLearningWorker,
  ];

  // Graceful shutdown handler
  async function shutdown(signal: string) {
    console.log(`[worker] Received ${signal}, shutting down gracefully...`);
    try {
      await Promise.all(workers.map((w) => w.close()));
      console.log("[worker] All workers closed. Exiting.");
    } catch (err) {
      console.error("[worker] Error during shutdown:", err);
    }
    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startWorker().catch((err) => {
  console.error("[worker] Fatal error during startup:", err);
  process.exit(1);
});
