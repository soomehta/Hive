import { Job, type WorkerOptions } from "bullmq";
import { createWorker } from "@/lib/queue";
import { createLogger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

/**
 * Factory that creates a BullMQ worker with standardized boilerplate:
 * - Logger creation using the provided name
 * - "completed" event handler that logs success
 * - "failed" event handler that logs the error and reports it to Sentry
 *
 * Returns both the worker instance and the logger so the processor
 * function can emit structured log lines without creating a second logger.
 */
export function createTypedWorker<T>(
  name: string,
  queueName: string,
  processor: (job: Job<T>) => Promise<any>,
  options?: { concurrency?: number } & Omit<Partial<WorkerOptions>, "concurrency">
) {
  const log = createLogger(name);

  const { concurrency, ...restOptions } = options ?? {};

  const worker = createWorker<T>(queueName, processor, {
    concurrency: concurrency ?? 1,
    ...restOptions,
  });

  worker.on("completed", (job) => {
    log.info({ jobId: job.id }, "Job completed successfully");
  });

  worker.on("failed", (job, err) => {
    log.error({ jobId: job?.id, err }, "Job failed");
    Sentry.captureException(err);
  });

  return { worker, log };
}
