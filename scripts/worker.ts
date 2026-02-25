import "dotenv/config";
import pino from "pino";

const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  timestamp: pino.stdTimeFunctions.isoTime,
}).child({ context: "worker" });

async function startWorker() {
  log.info("BullMQ worker process starting...");
  log.info({ NODE_ENV: process.env.NODE_ENV ?? "development" }, "Environment");
  log.info({ redisConfigured: !!process.env.REDIS_URL }, "Redis URL configured");

  const { transcriptionWorker } = await import(
    "../src/lib/queue/workers/transcription.worker"
  );
  log.info("Registered: transcription");

  const { aiProcessingWorker } = await import(
    "../src/lib/queue/workers/ai-processing.worker"
  );
  log.info("Registered: ai-processing");

  const { actionExecutionWorker } = await import(
    "../src/lib/queue/workers/action-execution.worker"
  );
  log.info("Registered: action-execution");

  const { embeddingWorker } = await import(
    "../src/lib/queue/workers/embedding.worker"
  );
  log.info("Registered: embedding");

  const { notificationWorker } = await import(
    "../src/lib/queue/workers/notification.worker"
  );
  log.info("Registered: notification");

  const { morningBriefingWorker } = await import(
    "../src/lib/queue/workers/morning-briefing.worker"
  );
  log.info("Registered: morning-briefing");

  const { weeklyDigestWorker } = await import(
    "../src/lib/queue/workers/weekly-digest.worker"
  );
  log.info("Registered: weekly-digest");

  const { profileLearningWorker } = await import(
    "../src/lib/queue/workers/profile-learning.worker"
  );
  log.info("Registered: profile-learning");

  const { swarmExecutionWorker } = await import(
    "../src/lib/queue/workers/swarm.worker"
  );
  log.info("Registered: swarm-execution");

  log.info("All 9 workers registered. Waiting for jobs...");

  const workers = [
    transcriptionWorker,
    aiProcessingWorker,
    actionExecutionWorker,
    embeddingWorker,
    notificationWorker,
    morningBriefingWorker,
    weeklyDigestWorker,
    profileLearningWorker,
    swarmExecutionWorker,
  ];

  async function shutdown(signal: string) {
    log.info({ signal }, "Received signal, shutting down gracefully...");
    try {
      await Promise.all(workers.map((w) => w.close()));
      log.info("All workers closed. Exiting.");
    } catch (err) {
      log.error({ err }, "Error during shutdown");
    }
    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

startWorker().catch((err) => {
  log.fatal({ err }, "Fatal error during startup");
  process.exit(1);
});
