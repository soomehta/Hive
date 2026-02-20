import { Job } from "bullmq";
import { createWorker, QUEUE_NAMES } from "@/lib/queue";
import type { EmbeddingJob } from "@/lib/queue/jobs";
import { storeEmbedding } from "@/lib/ai/embeddings";

const worker = createWorker<EmbeddingJob>(
  QUEUE_NAMES.EMBEDDING,
  async (job: Job<EmbeddingJob>) => {
    const { orgId, sourceType, sourceId, content } = job.data;

    console.log(
      `[embedding] Processing job ${job.id}: source=${sourceType}/${sourceId} org=${orgId}`
    );

    // Validate content is non-empty before generating embeddings
    if (!content || content.trim().length === 0) {
      console.log(
        `[embedding] Skipping job ${job.id}: empty content`
      );
      return { skipped: true, reason: "Empty content" };
    }

    // Truncate extremely long content to avoid exceeding model token limits
    // OpenAI text-embedding-3-small has an 8191 token limit (~32K chars)
    const truncatedContent =
      content.length > 30_000 ? content.slice(0, 30_000) : content;

    await storeEmbedding(orgId, sourceType, sourceId, truncatedContent);

    console.log(
      `[embedding] Completed job ${job.id}: stored embedding for ${sourceType}/${sourceId}`
    );

    return { sourceType, sourceId };
  },
  {
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`[embedding] Job ${job.id} completed successfully`);
});

worker.on("failed", (job, err) => {
  console.error(
    `[embedding] Job ${job?.id} failed: ${err.message}`,
    err.stack
  );
});

export { worker as embeddingWorker };
