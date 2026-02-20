import OpenAI from "openai";
import { db } from "@/lib/db";
import { embeddings } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

let _openai: OpenAI | null = null;
function getOpenAI() {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
  }
  return _openai;
}

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/**
 * Generate an embedding vector for the given text.
 * Uses OpenAI text-embedding-3-small (1536 dimensions).
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Truncate extremely long text to avoid token limits
  const truncated = text.slice(0, 8000);

  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: truncated,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error("Empty embedding response from OpenAI");
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

  // Delete existing embedding for this source if it exists (upsert behavior)
  await db
    .delete(embeddings)
    .where(
      and(
        eq(embeddings.sourceType, sourceType),
        eq(embeddings.sourceId, sourceId)
      )
    );

  // Insert the new embedding
  await db.insert(embeddings).values({
    orgId,
    sourceType,
    sourceId,
    content,
    embedding: vector,
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
 * the OpenAI API calls.
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
  const response = await getOpenAI().embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
    dimensions: EMBEDDING_DIMENSIONS,
  });

  // Delete existing embeddings for these sources
  for (const item of items) {
    await db
      .delete(embeddings)
      .where(
        and(
          eq(embeddings.sourceType, item.sourceType),
          eq(embeddings.sourceId, item.sourceId)
        )
      );
  }

  // Insert all new embeddings
  const values = items.map((item, i) => ({
    orgId: item.orgId,
    sourceType: item.sourceType,
    sourceId: item.sourceId,
    content: item.content,
    embedding: response.data[i].embedding,
  }));

  await db.insert(embeddings).values(values);
}
