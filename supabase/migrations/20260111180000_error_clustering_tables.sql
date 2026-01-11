-- Week 3 Day 3: Error Clustering & Pattern Detection
-- Migration: Create error_embeddings and error_clusters tables with pgvector support

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: error_embeddings
-- Stores error embeddings for similarity search and clustering
CREATE TABLE error_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Reference to original error event
    execution_id UUID NOT NULL,
    node_id TEXT NOT NULL,
    event_id UUID NOT NULL,

    -- Error details
    error_message TEXT NOT NULL,
    error_type TEXT,
    stack_trace TEXT,
    node_type TEXT,
    node_name TEXT,

    -- Embedding (384 dimensions for all-MiniLM-L6-v2)
    embedding vector(384) NOT NULL,

    -- Cluster assignment (filled during clustering)
    cluster_id UUID,
    cluster_label TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_execution FOREIGN KEY (execution_id)
        REFERENCES executions(id) ON DELETE CASCADE
);

-- Vector similarity index (HNSW for fast approximate search)
-- Uses cosine distance operator (<=>)
CREATE INDEX idx_error_embeddings_vector
    ON error_embeddings
    USING hnsw (embedding vector_cosine_ops);

-- Standard indexes for common queries
CREATE INDEX idx_error_embeddings_execution
    ON error_embeddings(execution_id);

CREATE INDEX idx_error_embeddings_cluster
    ON error_embeddings(cluster_id);

CREATE INDEX idx_error_embeddings_node_type
    ON error_embeddings(node_type);

-- Table: error_clusters
-- Stores error cluster metadata and statistics
CREATE TABLE error_clusters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Cluster identity
    workflow_id UUID NOT NULL,
    label TEXT NOT NULL,  -- e.g., "API Timeout Issues"

    -- Representative error (best example from cluster)
    representative_error_id UUID,
    representative_message TEXT NOT NULL,

    -- Cluster statistics
    member_count INT NOT NULL DEFAULT 0,
    avg_similarity FLOAT,  -- Average similarity within cluster

    -- Affected nodes
    affected_nodes JSONB,  -- Array of {node_id, node_name, occurrence_count}

    -- Pattern detection
    pattern_type TEXT,  -- e.g., "timeout", "auth_failure", "rate_limit"
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- Metadata
    first_seen TIMESTAMP WITH TIME ZONE,
    last_seen TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Foreign key constraints
    CONSTRAINT fk_workflow FOREIGN KEY (workflow_id)
        REFERENCES workflows(id) ON DELETE CASCADE,
    CONSTRAINT fk_representative_error FOREIGN KEY (representative_error_id)
        REFERENCES error_embeddings(id) ON DELETE SET NULL
);

-- Indexes for error_clusters
CREATE INDEX idx_error_clusters_workflow
    ON error_clusters(workflow_id);

CREATE INDEX idx_error_clusters_pattern
    ON error_clusters(pattern_type);

CREATE INDEX idx_error_clusters_severity
    ON error_clusters(severity);

-- Add updated_at trigger for error_clusters
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_error_clusters_updated_at
    BEFORE UPDATE ON error_clusters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE error_embeddings IS 'Stores semantic embeddings of error messages for similarity search and clustering';
COMMENT ON TABLE error_clusters IS 'Stores error cluster metadata including pattern types and severity levels';
COMMENT ON COLUMN error_embeddings.embedding IS '384-dimensional vector from sentence-transformers/all-MiniLM-L6-v2 model';
COMMENT ON COLUMN error_clusters.affected_nodes IS 'JSONB array of affected nodes with occurrence counts';
