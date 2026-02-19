'use client';

/**
 * Unified Execution Page
 * Tab-based view combining playback and analysis
 */

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '@/components/layout';
import { ExecutionTabs, TabId } from '@/components/execution/ExecutionTabs';
import { ExecutionVisualizer } from '@/components/execution-visualizer';
import { AnalysisOverview } from '@/components/analysis/AnalysisOverview';
import { CriticalPathView } from '@/components/analysis/CriticalPathView';
import { BottleneckView } from '@/components/analysis/BottleneckView';
import { ErrorClustersSection } from '@/components/analysis/ErrorClustersSection';
import { RecommendationsView } from '@/components/analysis/RecommendationsView';
import { EvidenceDrawer } from '@/components/analysis/EvidenceDrawer';
import { LoadingState } from '@/components/analysis/LoadingState';
import { ErrorState } from '@/components/analysis/ErrorState';
import {
  AnalysisData,
  Recommendation,
  fetchAnalysisData,
} from '@/lib/api/analysis';

interface ExecutionPageProps {
  params: Promise<{ id: string }>;
}

interface ExecutionMetadata {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  n8n_execution_id?: string;
  status: string;
  duration_ms?: number;
  started_at?: string;
}

export interface Filters {
  category: 'all' | 'performance' | 'reliability';
  impact: 'all' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  effort: 'all' | 'LOW' | 'MEDIUM' | 'HIGH';
}

export type SortOption = 'priority' | 'impact' | 'effort' | 'time_saved';

export default function ExecutionPage({ params }: ExecutionPageProps) {
  const { id: executionId } = use(params);
  const router = useRouter();

  // Data state
  const [executionMeta, setExecutionMeta] = useState<ExecutionMetadata | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedRecommendation, setSelectedRecommendation] = useState<Recommendation | null>(null);
  const [evidenceDrawerOpen, setEvidenceDrawerOpen] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    category: 'all',
    impact: 'all',
    effort: 'all',
  });
  const [sortBy, setSortBy] = useState<SortOption>('priority');
  const [nodeFilter, setNodeFilter] = useState<string | null>(null);

  // Handle node filter from bottleneck "View Fix" button
  const handleNodeFilter = (nodeName: string) => {
    setNodeFilter(nodeName);
  };

  // Handle tab change - clears node filter when leaving recommendations
  const handleTabChange = (tab: TabId) => {
    if (tab !== 'recommendations') {
      setNodeFilter(null);
    }
    setActiveTab(tab);
  };

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch execution metadata
        const execResponse = await fetch(
          `http://localhost:8001/api/executions/${executionId}`
        );

        if (!execResponse.ok) {
          throw new Error('Failed to fetch execution');
        }

        const execData = await execResponse.json();
        setExecutionMeta({
          id: execData.id,
          workflow_id: execData.workflow_id,
          workflow_name: execData.workflow?.name,
          n8n_execution_id: execData.n8n_execution_id,
          status: execData.status,
          duration_ms: execData.duration_ms,
          started_at: execData.started_at,
        });

        // Fetch analysis data
        const analysis = await fetchAnalysisData(
          'http://localhost:8001',
          execData.workflow_id,
          executionId
        );
        setAnalysisData(analysis);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load execution');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [executionId]);

  // Handlers
  const handleViewEvidence = (recommendation: Recommendation) => {
    setSelectedRecommendation(recommendation);
    setEvidenceDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setEvidenceDrawerOpen(false);
    setSelectedRecommendation(null);
  };

  // Loading state
  if (loading) {
    return (
      <AppLayout>
        <LoadingState />
      </AppLayout>
    );
  }

  // Error state
  if (error || !executionMeta) {
    return (
      <AppLayout>
        <ErrorState error={error || 'Execution not found'} />
      </AppLayout>
    );
  }

  // Calculate counts for tabs
  const counts = {
    criticalPath: analysisData?.criticalPath?.path_nodes?.length || 0,
    bottlenecks: analysisData?.bottlenecks?.bottlenecks?.length || 0,
    errors: analysisData?.errors?.summary?.total_errors || 0,
    recommendations: analysisData?.recommendations?.recommendations?.length || 0,
  };

  return (
    <>
      {/* Playback tab uses full viewport - ExecutionVisualizer handles its own layout */}
      {activeTab === 'playback' ? (
        <ExecutionVisualizer
          workflowId={executionMeta.workflow_id}
          executionId={executionId}
          apiBaseUrl="http://localhost:8001"
          onBack={() => setActiveTab('overview')}
          // Pass analysis data to avoid re-fetching
          initialBottlenecks={analysisData?.bottlenecks?.bottlenecks}
          initialRecommendations={analysisData?.recommendations?.recommendations}
          workflowName={executionMeta.workflow_name}
        />
      ) : (
        <AppLayout>
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="neu-raised mb-6">
              {/* Breadcrumb */}
              <div className="px-6 py-3 border-b border-neu-shadow-light/30">
                <button
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-2 text-sm text-neu-text-muted hover:text-neu-accent transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>

              {/* Title and metadata */}
              <div className="px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="font-display text-2xl sm:text-3xl font-bold text-neu-text">
                      {executionMeta.workflow_name || 'Execution Analysis'}
                    </h1>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-neu-text-muted">
                      <span className={executionMeta.status === 'success' ? 'badge-success' : 'badge-error'}>
                        {executionMeta.status === 'success' ? (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        )}
                        {executionMeta.status.charAt(0).toUpperCase() + executionMeta.status.slice(1)}
                      </span>
                      {executionMeta.duration_ms && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {(executionMeta.duration_ms / 1000).toFixed(2)}s
                        </span>
                      )}
                      <span className="font-mono text-xs bg-neu-shadow-dark/30 px-2 py-0.5 rounded">
                        {executionId.slice(0, 8)}...
                      </span>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex flex-wrap gap-2">
                    <span className="badge-info">
                      {counts.criticalPath} critical nodes
                    </span>
                    <span className="badge-warning">
                      {counts.bottlenecks} bottlenecks
                    </span>
                    <span className="px-3 py-1 bg-neu-accent/15 text-neu-accent rounded-full text-xs font-medium">
                      {counts.recommendations} recommendations
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6">
                <ExecutionTabs
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  counts={counts}
                />
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'overview' && analysisData && (
                <AnalysisOverview
                  data={analysisData}
                  onViewEvidence={handleViewEvidence}
                  onTabChange={handleTabChange}
                />
              )}

              {activeTab === 'critical-path' && analysisData && (
                <CriticalPathView data={analysisData.criticalPath} />
              )}

              {activeTab === 'bottlenecks' && analysisData && (
                <BottleneckView
                  data={analysisData.bottlenecks}
                  onTabChange={handleTabChange}
                  onNodeFilter={handleNodeFilter}
                />
              )}

              {activeTab === 'errors' && analysisData && (
                <ErrorClustersSection data={analysisData.errors} />
              )}

              {activeTab === 'recommendations' && analysisData && (
                <RecommendationsView
                  data={analysisData.recommendations}
                  filters={filters}
                  sortBy={sortBy}
                  onFilterChange={setFilters}
                  onSortChange={setSortBy}
                  onViewEvidence={handleViewEvidence}
                  nodeFilter={nodeFilter}
                  onClearNodeFilter={() => setNodeFilter(null)}
                  exportData={{
                    workflowName: executionMeta?.workflow_name || `Workflow ${executionMeta?.workflow_id?.slice(0, 8) || 'Unknown'}`,
                    workflowId: executionMeta?.workflow_id || '',
                    executionId: executionId,
                    durationMs: executionMeta?.duration_ms || analysisData.criticalPath.summary.total_duration_ms,
                    nodeCount: analysisData.criticalPath.summary.node_count,
                    criticalPathNodes: analysisData.criticalPath.summary.node_count,
                    criticalPathDurationMs: analysisData.criticalPath.summary.total_duration_ms,
                    bottlenecks: analysisData.bottlenecks.bottlenecks,
                    errors: analysisData.errors.clusters,
                  }}
                />
              )}
            </div>

            {/* Evidence Drawer */}
            <EvidenceDrawer
              open={evidenceDrawerOpen}
              recommendation={selectedRecommendation}
              onClose={handleCloseDrawer}
            />
          </div>
        </AppLayout>
      )}
    </>
  );
}
