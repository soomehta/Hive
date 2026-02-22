import { getEmbeddingProvider, getRoleConfig } from "./providers";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { eq, and, inArray } from "drizzle-orm";

const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for the given text.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate extremely long text to avoid token limits
  const truncated = text.slice(0, 8000);
  const config = getRoleConfig("embedding");
  const provider = getEmbeddingProvider("embedding");

  const result = await provider.embed({
    model: config.model,
    input: truncated,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = result.embeddings[0];
  if (!embedding) {
    throw new Error("Empty embedding response");
  }

  return embedding;
}

/**
 * Generate an embedding for the given content and store/upsert it in the
 * embeddings table. If an embedding for the same sourceType + sourceId already
 * exists, it is replaced.
 */
export async function storeEmbedding(
  orgId: string,
  sourceType: string,
  sourceId: string,
  content: string
): Promise<void> {
  const vector = await generateEmbedding(content);

  // Wrap delete + insert in a transaction to avoid a partial-update window
  await db.transaction(async (tx) => {
    await tx
      .delete(embeddings)
      .where(
        and(
          eq(embeddings.sourceType, sourceType),
          eq(embeddings.sourceId, sourceId)
        )
      );

    await tx.insert(embeddings).values({
      orgId,
      sourceType,
      sourceId,
      content,
      embedding: vector,
    });
  });
}

/**
 * Delete the embedding for a given sourceType + sourceId.
 */
export async function deleteEmbedding(
  sourceType: string,
  sourceId: string
): Promise<void> {
  await db
    .delete(embeddings)
    .where(
      and(
        eq(embeddings.sourceType, sourceType),
        eq(embeddings.sourceId, sourceId)
      )
    );
}

/**
 * Generate embeddings for multiple items in batch.
 * More efficient than calling storeEmbedding in a loop because it batches
 * the API calls.
 */
export async function storeBatchEmbeddings(
  items: Array<{
    orgId: string;
    sourceType: string;
    sourceId: string;
    content: string;
  }>
): Promise<void> {
  if (items.length === 0) return;

  // Generate all embeddings in a single API call (up to 2048 inputs)
  const texts = items.map((item) => item.content.slice(0, 8000));
  const config = getRoleConfig("embedding");
  const provider = getEmbeddingProvider("embedding");

  const result = await provider.embed({
    model: config.model,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const values = items.map((item, i) => ({
    orgId: item.orgId,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    content: item.content,
    embedding: result.embeddings[i],
  }));

  // Delete existing embeddings in a single query, then batch insert — all in one transaction
  const sourceIds = items.map((item) => item.sourceId);
  await db.transaction(async (tx) => {
    await tx
      .delete(embeddings)
      .where(inArray(embeddings.sourceId, sourceIds));

    await tx.insert(embeddings).values(values);
  });
}
