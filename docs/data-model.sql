-- SignalFlow V1 Data Model
-- PostgreSQL + pgvector (Supabase)
-- Version: 1.0
--
-- HISTORICAL DOCUMENT — original design sketch, not the live schema.
-- The live schema is defined by the migrations in supabase/migrations/.
-- Known divergence: this file shows an IVFFlat index on embeddings; the
-- live schema uses an HNSW index (20260111180000_error_clustering_tables.sql).

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- Core Workflow Storage
-- =====================================================

CREATE TABLE workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  n8n_workflow_id TEXT,
  raw_json JSONB NOT NULL,
  node_count INT NOT NULL,
  edge_count INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_workflows_n8n_id ON workflows(n8n_workflow_id);
CREATE INDEX idx_workflows_created ON workflows(created_at DESC);

-- =====================================================
-- Normalized Node Catalog
-- =====================================================

CREATE TABLE nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_name TEXT NOT NULL,
  node_type TEXT NOT NULL,
  position_x REAL,
  position_y REAL,
  config JSONB,
  UNIQUE(workflow_id, node_id)
);

CREATE INDEX idx_nodes_workflow ON nodes(workflow_id);
CREATE INDEX idx_nodes_type ON nodes(node_type);
CREATE INDEX idx_nodes_node_id ON nodes(node_id);

-- =====================================================
-- Edge Catalog (Workflow Structure)
-- =====================================================

CREATE TABLE edges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  from_node_id TEXT NOT NULL,
  to_node_id TEXT NOT NULL,
  edge_type TEXT DEFAULT 'main',
  condition TEXT,
  UNIQUE(workflow_id, from_node_id, to_node_id, edge_type)
);

CREATE INDEX idx_edges_workflow ON edges(workflow_id);
CREATE INDEX idx_edges_from ON edges(from_node_id);
CREATE INDEX idx_edges_to ON edges(to_node_id);

-- =====================================================
-- Execution Runs
-- =====================================================

CREATE TABLE executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  n8n_execution_id TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout', 'cancelled')),
  duration_ms INT,
  trigger_mode TEXT,
  raw_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_executions_workflow ON executions(workflow_id);
CREATE INDEX idx_executions_status ON executions(status);
CREATE INDEX idx_executions_started ON executions(started_at DESC);
CREATE INDEX idx_executions_n8n_id ON executions(n8n_execution_id);

-- =====================================================
-- Normalized Execution Events (THE GROUND TRUTH)
-- =====================================================

CREATE TABLE execution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('started', 'finished', 'retry', 'error', 'skipped')),
  timestamp TIMESTAMPTZ NOT NULL,
  duration_ms INT,
  status TEXT CHECK (status IN ('success', 'error', 'timeout')),
  error_message TEXT,
  retry_attempt INT DEFAULT 0,
  items_processed INT DEFAULT 0,
  metadata JSONB,
  sequence_order INT NOT NULL
);

CREATE INDEX idx_events_execution ON execution_events(execution_id);
CREATE INDEX idx_events_node ON execution_events(node_id);
CREATE INDEX idx_events_timestamp ON execution_events(timestamp);
CREATE INDEX idx_events_type ON execution_events(event_type);
CREATE INDEX idx_events_sequence ON execution_events(execution_id, sequence_order);

-- =====================================================
-- Computed Critical Paths (Cached)
-- =====================================================

CREATE TABLE critical_paths (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  path_nodes TEXT[] NOT NULL,
  total_duration_ms INT NOT NULL,
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(execution_id)
);

CREATE INDEX idx_critical_paths_execution ON critical_paths(execution_id);

-- =====================================================
-- Aggregated Node Statistics
-- =====================================================

CREATE TABLE node_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  execution_count INT DEFAULT 0,
  success_count INT DEFAULT 0,
  error_count INT DEFAULT 0,
  avg_duration_ms REAL,
  p50_duration_ms INT,
  p95_duration_ms INT,
  p99_duration_ms INT,
  max_duration_ms INT,
  critical_path_frequency REAL,
  wall_time_contribution_pct REAL,
  last_computed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, node_id)
);

CREATE INDEX idx_node_stats_workflow ON node_stats(workflow_id);
CREATE INDEX idx_node_stats_node_id ON node_stats(node_id);
CREATE INDEX idx_node_stats_cp_freq ON node_stats(critical_path_frequency DESC);

-- =====================================================
-- Error Signatures (Normalized and Clustered)
-- =====================================================

CREATE TABLE error_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  signature_hash TEXT NOT NULL,
  error_category TEXT NOT NULL,
  error_pattern TEXT NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL,
  last_seen TIMESTAMPTZ NOT NULL,
  occurrence_count INT DEFAULT 1,
  affected_nodes TEXT[],
  sample_message TEXT,
  embedding VECTOR(384),
  UNIQUE(workflow_id, signature_hash)
);

CREATE INDEX idx_error_sigs_workflow ON error_signatures(workflow_id);
CREATE INDEX idx_error_sigs_category ON error_signatures(error_category);
CREATE INDEX idx_error_sigs_last_seen ON error_signatures(last_seen DESC);
CREATE INDEX idx_error_sigs_embedding ON error_signatures USING ivfflat (embedding vector_cosine_ops);

-- =====================================================
-- Recommendations
-- =====================================================

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  rule_id TEXT NOT NULL,
  priority INT NOT NULL CHECK (priority IN (1, 2, 3, 4)),
  category TEXT NOT NULL CHECK (category IN ('performance', 'reliability', 'cost')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_nodes TEXT[] NOT NULL,
  evidence JSONB NOT NULL,
  estimated_impact_ms INT,
  confidence REAL NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('safe', 'review_required', 'risky')),
  suggested_diff TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'dismissed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  dismissed_at TIMESTAMPTZ
);

CREATE INDEX idx_recommendations_workflow ON recommendations(workflow_id);
CREATE INDEX idx_recommendations_status ON recommendations(status);
CREATE INDEX idx_recommendations_priority ON recommendations(priority);
CREATE INDEX idx_recommendations_category ON recommendations(category);
CREATE INDEX idx_recommendations_rule_id ON recommendations(rule_id);

-- =====================================================
-- Weekly Digests (Pre-computed Summaries)
-- =====================================================

CREATE TABLE weekly_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  total_executions INT NOT NULL,
  success_rate REAL NOT NULL,
  avg_duration_ms INT NOT NULL,
  p95_duration_ms INT NOT NULL,
  top_bottlenecks JSONB NOT NULL,
  new_errors JSONB NOT NULL,
  recommendations_added INT NOT NULL,
  summary_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(workflow_id, week_start)
);

CREATE INDEX idx_digests_workflow ON weekly_digests(workflow_id);
CREATE INDEX idx_digests_week ON weekly_digests(week_start DESC);

-- =====================================================
-- Views for Common Queries
-- =====================================================

-- View: Latest executions with key metrics
CREATE VIEW v_latest_executions AS
SELECT 
  e.id,
  e.workflow_id,
  e.started_at,
  e.finished_at,
  e.status,
  e.duration_ms,
  w.name AS workflow_name,
  cp.path_nodes AS critical_path,
  (SELECT COUNT(*) FROM execution_events WHERE execution_id = e.id AND event_type = 'error') AS error_count
FROM executions e
JOIN workflows w ON e.workflow_id = w.id
LEFT JOIN critical_paths cp ON e.id = cp.execution_id
ORDER BY e.started_at DESC;

-- View: Node performance summary
CREATE VIEW v_node_performance AS
SELECT 
  ns.workflow_id,
  ns.node_id,
  n.node_name,
  n.node_type,
  ns.execution_count,
  ns.success_count,
  ns.error_count,
  ROUND((ns.success_count::REAL / NULLIF(ns.execution_count, 0) * 100)::NUMERIC, 2) AS success_rate_pct,
  ns.avg_duration_ms,
  ns.p95_duration_ms,
  ns.critical_path_frequency,
  ns.wall_time_contribution_pct
FROM node_stats ns
JOIN nodes n ON ns.node_id = n.node_id AND ns.workflow_id = n.workflow_id
ORDER BY ns.wall_time_contribution_pct DESC NULLS LAST;

-- View: Active recommendations
CREATE VIEW v_active_recommendations AS
SELECT 
  r.id,
  r.workflow_id,
  w.name AS workflow_name,
  r.rule_id,
  r.priority,
  r.category,
  r.title,
  r.affected_nodes,
  r.estimated_impact_ms,
  r.confidence,
  r.risk_level,
  r.created_at
FROM recommendations r
JOIN workflows w ON r.workflow_id = w.id
WHERE r.status = 'pending'
ORDER BY r.priority, r.estimated_impact_ms DESC NULLS LAST;

-- =====================================================
-- Functions
-- =====================================================

-- Function: Update workflow updated_at timestamp
CREATE OR REPLACE FUNCTION update_workflow_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_workflow_timestamp
  BEFORE UPDATE ON workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_workflow_timestamp();

-- Function: Calculate workflow health score
CREATE OR REPLACE FUNCTION calculate_health_score(workflow_uuid UUID)
RETURNS INT AS $$
DECLARE
  health_score INT := 100;
  critical_recs INT;
  high_recs INT;
  error_rate REAL;
  avg_success_rate REAL;
BEGIN
  -- Deduct points for critical recommendations
  SELECT COUNT(*) INTO critical_recs 
  FROM recommendations 
  WHERE workflow_id = workflow_uuid AND priority = 1 AND status = 'pending';
  
  health_score := health_score - (critical_recs * 15);
  
  -- Deduct points for high-priority recommendations
  SELECT COUNT(*) INTO high_recs 
  FROM recommendations 
  WHERE workflow_id = workflow_uuid AND priority = 2 AND status = 'pending';
  
  health_score := health_score - (high_recs * 5);
  
  -- Deduct points for recent error rate
  SELECT 
    COALESCE(AVG(CASE WHEN status = 'success' THEN 1.0 ELSE 0.0 END), 1.0)
  INTO avg_success_rate
  FROM executions
  WHERE workflow_id = workflow_uuid 
    AND started_at > NOW() - INTERVAL '7 days';
  
  health_score := health_score - ROUND((1.0 - avg_success_rate) * 30);
  
  -- Clamp to 0-100
  RETURN GREATEST(0, LEAST(100, health_score));
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Initial Data / Seed (Optional)
-- =====================================================

-- Add any seed data here if needed

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE workflows IS 'Stores n8n workflow definitions';
COMMENT ON TABLE execution_events IS 'Normalized execution events - the ground truth for all analysis';
COMMENT ON TABLE critical_paths IS 'Cached critical path computations per execution';
COMMENT ON TABLE node_stats IS 'Aggregated node performance statistics';
COMMENT ON TABLE error_signatures IS 'Clustered and normalized error patterns with embeddings for similarity search';
COMMENT ON TABLE recommendations IS 'Generated optimization and reliability recommendations';
