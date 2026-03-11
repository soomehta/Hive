-- Drop the existing btree index on the vector column if it exists
DROP INDEX IF EXISTS idx_embeddings_embedding;

-- Create HNSW index for sub-millisecond approximate nearest neighbor search
CREATE INDEX IF NOT EXISTS idx_embeddings_vector_hnsw
  ON embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
