CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS rag_chunks (
  id         bigserial PRIMARY KEY,
  doc_id     text NOT NULL,
  chunk_id   text NOT NULL,
  content    text NOT NULL,
  metadata   jsonb DEFAULT '{}'::jsonb,
  embedding  vector(1536)
);

-- HNSW (cosine)
DO $$ BEGIN
  CREATE INDEX rag_chunks_hnsw_cosine
    ON rag_chunks USING hnsw (embedding vector_cosine_ops);
EXCEPTION WHEN duplicate_table THEN
  NULL;
END $$;
