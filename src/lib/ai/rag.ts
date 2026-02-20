import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { generateEmbedding } from "./embeddings";

export interface RAGResult {
  sourceType: string;
  sourceId: string;
  content: string;
  similarity: number;
}

export interface RAGOptions {
  /** Maximum number of results to return. Default: 5 */
  limit?: number;
  /** Filter by source types (e.g., ["task", "message", "comment"]) */
  sourceTypes?: string[];
  /** Minimum similarity threshold (0-1). Default: 0.5 */
  minSimilarity?: number;
}

/**
 * Query the embeddings table for content semantically similar to the given
 * query text. Uses pgvector cosine similarity search.
 *
 * @param orgId - Organization ID to scope the search
 * @param queryText - Natural language query to find similar content
 * @param options - Search options (limit, sourceTypes, minSimilarity)
 * @returns Array of matching results sorted by similarity (highest first)
 */
export async function queryContext(
  orgId: string,
  queryText: string,
  options?: RAGOptions
): Promise<RAGResult[]> {
  const limit = options?.limit ?? 5;
  const minSimilarity = options?.minSimilarity ?? 0.5;
  const sourceTypes = options?.sourceTypes;

  // Generate embedding for the query text
  const queryVector = await generateEmbedding(queryText);
  const vectorStr = `[${queryVector.join(",")}]`;

  // Build the source type filter clause
  let sourceTypeFilter = sql``;
  if (sourceTypes && sourceTypes.length > 0) {
    const placeholders = sourceTypes.map((t) => sql`${t}`);
    sourceTypeFilter = sql` AND source_type IN (${sql.join(placeholders, sql`, `)})`;
  }

  // Execute pgvector cosine similarity query
  // Using the <=> operator: cosine distance (1 - similarity)
  // So similarity = 1 - (embedding <=> query_vector)
  const results = await db.execute<{
    source_type: string;
    source_id: string;
    content: string;
    similarity: number;
  }>(
    sql`SELECT
          source_type,
          source_id,
          content,
          1 - (embedding <=> ${vectorStr}::vector) AS similarity
        FROM embeddings
        WHERE org_id = ${orgId}
          AND 1 - (embedding <=> ${vectorStr}::vector) >= ${minSimilarity}
          ${sourceTypeFilter}
        ORDER BY similarity DESC
        LIMIT ${limit}`
  );

  return (results as unknown as Array<{ source_type: string; source_id: string; content: string; similarity: number }>).map((row) => ({
    sourceType: row.source_type,
    sourceId: row.source_id,
    content: row.content,
    similarity: Number(row.similarity),
  }));
}

/**
 * Query context and format it as a string suitable for inclusion in an
 * LLM prompt. Useful for enriching PA responses with relevant project context.
 */
export async function getContextForPrompt(
  orgId: string,
  queryText: string,
  options?: RAGOptions
): Promise<string> {
  const results = await queryContext(orgId, queryText, options);

  if (results.length === 0) {
    return "No relevant context found.";
  }

  return results
    .map(
      (r, i) =>
        `[${i + 1}] (${r.sourceType}, similarity: ${r.similarity.toFixed(2)})\n${r.content}`
    )
    .join("\n\n");
}
