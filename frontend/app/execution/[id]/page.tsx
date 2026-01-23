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

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch execution metadata
        const execResponse = await fetch(
          `http://localhost:8000/api/executions/${executionId}`
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
          'http://localhost:8000',
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
          apiBaseUrl="http://localhost:8000"
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
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-6">
              {/* Breadcrumb */}
              <div className="px-6 py-3 border-b border-gray-100">
                <button
                  onClick={() => router.back()}
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back
                </button>
              </div>

              {/* Title and metadata */}
              <div className="px-6 py-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
                      {executionMeta.workflow_name || 'Execution Analysis'}
                    </h1>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-gray-500">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        executionMeta.status === 'success'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {executionMeta.status}
                      </span>
                      {executionMeta.duration_ms && (
                        <span>Duration: {(executionMeta.duration_ms / 1000).toFixed(2)}s</span>
                      )}
                      <span>ID: {executionId.slice(0, 8)}...</span>
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                      {counts.criticalPath} critical nodes
                    </span>
                    <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
                      {counts.bottlenecks} bottlenecks
                    </span>
                    <span className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
                      {counts.recommendations} recommendations
                    </span>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <div className="px-6">
                <ExecutionTabs
                  activeTab={activeTab}
                  onTabChange={setActiveTab}
                  counts={counts}
                />
              </div>
            </div>

            {/* Tab Content */}
            <div className="mt-6">
              {activeTab === 'overview' && analysisData && (
                <AnalysisOverview data={analysisData} onViewEvidence={handleViewEvidence} />
              )}

              {activeTab === 'critical-path' && analysisData && (
                <CriticalPathView data={analysisData.criticalPath} />
              )}

              {activeTab === 'bottlenecks' && analysisData && (
                <BottleneckView data={analysisData.bottlenecks} />
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
