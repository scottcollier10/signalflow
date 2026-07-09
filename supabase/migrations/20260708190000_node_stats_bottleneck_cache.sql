-- Capture schema drift: these changes were applied ad-hoc to the local dev DB
-- but never recorded as a migration, so remote environments are missing them.
--
-- 1. node_stats doubles as a per-execution bottleneck cache written by
--    BottleneckAnalyzer._store_results and read by the RecommendationEngine.
--    Without these columns the insert fails silently and every execution
--    returns zero recommendations.
-- 2. error_clusters.execution_id links clusters to the execution that
--    produced them (used by error analysis).

ALTER TABLE node_stats
  ADD COLUMN IF NOT EXISTS execution_id UUID,
  ADD COLUMN IF NOT EXISTS bottleneck_score REAL,
  ADD COLUMN IF NOT EXISTS total_duration_ms INT,
  ADD COLUMN IF NOT EXISTS node_name TEXT,
  ADD COLUMN IF NOT EXISTS node_type TEXT,
  ADD COLUMN IF NOT EXISTS is_on_critical_path BOOLEAN DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_node_stats_execution'
  ) THEN
    ALTER TABLE node_stats
      ADD CONSTRAINT fk_node_stats_execution
      FOREIGN KEY (execution_id) REFERENCES executions(id);
  END IF;
END $$;

-- Cache rows are per-execution, so one row per (workflow, node) no longer holds
ALTER TABLE node_stats DROP CONSTRAINT IF EXISTS node_stats_workflow_id_node_id_key;

CREATE INDEX IF NOT EXISTS idx_node_stats_execution_id ON node_stats(execution_id);
CREATE INDEX IF NOT EXISTS idx_node_stats_bottleneck_score ON node_stats(bottleneck_score DESC);

ALTER TABLE error_clusters
  ADD COLUMN IF NOT EXISTS execution_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_error_clusters_execution'
  ) THEN
    ALTER TABLE error_clusters
      ADD CONSTRAINT fk_error_clusters_execution
      FOREIGN KEY (execution_id) REFERENCES executions(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_error_clusters_execution_id ON error_clusters(execution_id);
