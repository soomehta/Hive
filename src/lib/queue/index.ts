import { Queue, Worker, type Processor, type WorkerOptions } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import IORedis from "ioredis";

// ─── Lazy Redis Connection ──────────────────────────────

let _connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!_connection) {
    _connection = new IORedis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      retryStrategy(times: number) {
        const delay = Math.min(times * 200, 5000);
        return delay;
      },
    });

    _connection.on("error", (err) => {
      console.error("[BullMQ] Redis connection error:", err.message);
    });

    _connection.on("connect", () => {
      console.log("[BullMQ] Redis connected");
    });
  }
  return _connection;
}

// ─── Queue & Worker Factories ───────────────────────────

export function createQueue(name: string): Queue {
  return new Queue(name, {
    connection: getConnection() as unknown as ConnectionOptions,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  });
}

export function createWorker<T = any>(
  name: string,
  processor: Processor<T>,
  opts?: Partial<WorkerOptions>
): Worker<T> {
  return new Worker<T>(name, processor, {
    connection: getConnection() as unknown as ConnectionOptions,
    concurrency: 5,
    ...opts,
  });
}

// ─── Queue Names ────────────────────────────────────────

export const QUEUE_NAMES = {
  TRANSCRIPTION: "transcription",
  AI_PROCESSING: "ai-processing",
  ACTION_EXECUTION: "action-execution",
  EMBEDDING: "embedding",
  NOTIFICATION: "notification",
  BRIEFING: "morning-briefing",
  DIGEST: "weekly-digest",
  LEARNING: "profile-learning",
} as const;

// ─── Pre-defined Queues (lazy getters) ──────────────────

let _transcriptionQueue: Queue | null = null;
let _aiProcessingQueue: Queue | null = null;
let _actionExecutionQueue: Queue | null = null;
let _embeddingQueue: Queue | null = null;
let _notificationQueue: Queue | null = null;
let _briefingQueue: Queue | null = null;
let _digestQueue: Queue | null = null;
let _learningQueue: Queue | null = null;

export function getTranscriptionQueue(): Queue {
  if (!_transcriptionQueue) {
    _transcriptionQueue = createQueue(QUEUE_NAMES.TRANSCRIPTION);
  }
  return _transcriptionQueue;
}

export function getAIProcessingQueue(): Queue {
  if (!_aiProcessingQueue) {
    _aiProcessingQueue = createQueue(QUEUE_NAMES.AI_PROCESSING);
  }
  return _aiProcessingQueue;
}

export function getActionExecutionQueue(): Queue {
  if (!_actionExecutionQueue) {
    _actionExecutionQueue = createQueue(QUEUE_NAMES.ACTION_EXECUTION);
  }
  return _actionExecutionQueue;
}

export function getEmbeddingQueue(): Queue {
  if (!_embeddingQueue) {
    _embeddingQueue = createQueue(QUEUE_NAMES.EMBEDDING);
  }
  return _embeddingQueue;
}

export function getNotificationQueue(): Queue {
  if (!_notificationQueue) {
    _notificationQueue = createQueue(QUEUE_NAMES.NOTIFICATION);
  }
  return _notificationQueue;
}

export function getBriefingQueue(): Queue {
  if (!_briefingQueue) {
    _briefingQueue = createQueue(QUEUE_NAMES.BRIEFING);
  }
  return _briefingQueue;
}

export function getDigestQueue(): Queue {
  if (!_digestQueue) {
    _digestQueue = createQueue(QUEUE_NAMES.DIGEST);
  }
  return _digestQueue;
}

export function getLearningQueue(): Queue {
  if (!_learningQueue) {
    _learningQueue = createQueue(QUEUE_NAMES.LEARNING);
  }
  return _learningQueue;
}

// ─── Graceful Shutdown Helper ───────────────────────────

export async function closeAllQueues(): Promise<void> {
  const queues = [
    _transcriptionQueue,
    _aiProcessingQueue,
    _actionExecutionQueue,
    _embeddingQueue,
    _notificationQueue,
    _briefingQueue,
    _digestQueue,
    _learningQueue,
  ].filter(Boolean) as Queue[];

  await Promise.all(queues.map((q) => q.close()));

  if (_connection) {
    _connection.disconnect();
    _connection = null;
  }
}
