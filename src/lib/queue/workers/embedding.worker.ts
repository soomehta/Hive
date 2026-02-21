import { Job } from "bullmq";
import { createWorker, QUEUE_NAMES } from "@/lib/queue";
import type { EmbeddingJob } from "@/lib/queue/jobs";
import { storeEmbedding } from "@/lib/ai/embeddings";
import { createLogger } from "@/lib/logger";
import * as Sentry from "@sentry/nextjs";

const log = createLogger("embedding");

const worker = createWorker<EmbeddingJob>(
  QUEUE_NAMES.EMBEDDING,
  async (job: Job<EmbeddingJob>) => {
    const { orgId, sourceType, sourceId, content } = job.data;

    log.info(
      { jobId: job.id, sourceType, sourceId, orgId },
      "Processing embedding job"
    );

    // Validate content is non-empty before generating embeddings
    if (!content || content.trim().length === 0) {
      log.info({ jobId: job.id }, "Skipping: empty content");
      return { skipped: true, reason: "Empty content" };
    }

    // Truncate extremely long content to avoid exceeding model token limits
    // OpenAI text-embedding-3-small has an 8191 token limit (~32K chars)
    const truncatedContent =
      content.length > 30_000 ? content.slice(0, 30_000) : content;

    await storeEmbedding(orgId, sourceType, sourceId, truncatedContent);

    log.info(
      { jobId: job.id, sourceType, sourceId },
      "Stored embedding"
    );

    return { sourceType, sourceId };
  },
  {
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  log.info({ jobId: job.id }, "Job completed successfully");
});

worker.on("failed", (job, err) => {
  log.error({ jobId: job?.id, err }, "Job failed");
  Sentry.captureException(err);
});

export { worker as embeddingWorker };
