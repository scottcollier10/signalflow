-- Vector similarity search over error embeddings.
--
-- Orders by `embedding <=> query_embedding` (cosine distance) so Postgres
-- can satisfy the query with the HNSW index idx_error_embeddings_vector.
-- Results are scoped to a single workflow via the executions join and
-- capped by max_distance (distance = 1 - cosine similarity).

CREATE OR REPLACE FUNCTION match_error_embeddings(
    query_embedding vector(384),
    target_workflow_id uuid,
    match_count int DEFAULT 10,
    max_distance float DEFAULT 0.25
)
RETURNS TABLE (
    id uuid,
    execution_id uuid,
    node_id text,
    event_id uuid,
    error_message text,
    error_type text,
    node_type text,
    node_name text,
    embedding vector(384),
    distance float
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        ee.id,
        ee.execution_id,
        ee.node_id,
        ee.event_id,
        ee.error_message,
        ee.error_type,
        ee.node_type,
        ee.node_name,
        ee.embedding,
        ee.embedding <=> query_embedding AS distance
    FROM error_embeddings ee
    JOIN executions e ON e.id = ee.execution_id
    WHERE e.workflow_id = target_workflow_id
      AND ee.embedding <=> query_embedding <= max_distance
    ORDER BY ee.embedding <=> query_embedding
    LIMIT match_count;
$$;
