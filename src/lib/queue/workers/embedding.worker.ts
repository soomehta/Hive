import { Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { createTypedWorker } from "@/lib/queue/create-typed-worker";
import type { EmbeddingJob } from "@/lib/queue/jobs";
import { storeEmbedding } from "@/lib/ai/embeddings";

const { worker, log } = createTypedWorker<EmbeddingJob>(
  "embedding",
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
  { concurrency: 5 }
);

export { worker as embeddingWorker };
