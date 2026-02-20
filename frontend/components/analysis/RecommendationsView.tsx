'use client';

/**
 * Recommendations View component
 * Shows filterable and sortable list of recommendations with neumorphic design
 * Supports both list and grouped-by-category views
 * Includes export functionality for Claude Code prompt generation
 */

import { useMemo, useState, useCallback } from 'react';
import {
  RecommendationsResponse,
  Recommendation,
  Bottleneck,
  ErrorCluster,
  formatDuration,
} from '@/lib/api/analysis';
import { Filters, SortOption } from './AnalysisDashboard';
import { FilterControls } from './FilterControls';
import { generateClaudeCodePrompt, generatePromptSummary, PromptGeneratorInput } from '@/lib/promptGenerator';
import { sanitizeWorkflowJSON } from '@/lib/workflowSanitizer';

type ViewMode = 'list' | 'grouped';

export interface ExportData {
  workflowName: string;
  workflowId: string;
  executionId: string;
  durationMs: number;
  nodeCount: number;
  criticalPathNodes: number;
  criticalPathDurationMs: number;
  bottlenecks: Bottleneck[];
  errors?: ErrorCluster[];
}

interface RecommendationsViewProps {
  data: RecommendationsResponse;
  filters: Filters;
  sortBy: SortOption;
  onFilterChange: (filters: Filters) => void;
  onSortChange: (sortBy: SortOption) => void;
  onViewEvidence: (recommendation: Recommendation) => void;
  exportData?: ExportData;
  nodeFilter?: string | null;
  onClearNodeFilter?: () => void;
}

const CATEGORY_INFO: Record<string, { label: string; icon: string; description: string; colorClass: string }> = {
  performance: {
    label: 'Performance',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    description: 'Speed up execution and reduce latency',
    colorClass: 'neu-teal',
  },
  reliability: {
    label: 'Reliability',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    description: 'Improve error handling and stability',
    colorClass: 'neu-accent',
  },
  cost: {
    label: 'Cost Optimization',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    description: 'Reduce resource usage and costs',
    colorClass: 'neu-green',
  },
  maintainability: {
    label: 'Maintainability',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    description: 'Improve code quality and maintainability',
    colorClass: 'neu-text-muted',
  },
};

export function RecommendationsView({
  data,
  filters,
  sortBy,
  onFilterChange,
  onSortChange,
  onViewEvidence,
  exportData,
  nodeFilter,
  onClearNodeFilter,
}: RecommendationsViewProps) {
  const { recommendations, summary } = data;
  const [viewMode, setViewMode] = useState<ViewMode>('grouped');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['performance', 'reliability', 'cost', 'maintainability'])
  );
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [workflowJSONLoading, setWorkflowJSONLoading] = useState(false);

  // Check if export data is available (prop passed from parent)
  const isExportReady = Boolean(
    exportData &&
    exportData.executionId &&
    exportData.executionId.length > 0
  );

  // Export handlers
  const handleCopyPrompt = useCallback(async () => {
    if (!exportData || !isExportReady) {
      setCopySuccess('Export data not available');
      setTimeout(() => setCopySuccess(null), 3000);
      return;
    }

    const promptInput: PromptGeneratorInput = {
      ...exportData,
      recommendations,
    };

    const prompt = generateClaudeCodePrompt(promptInput);

    try {
      await navigator.clipboard.writeText(prompt);
      const summary = generatePromptSummary(promptInput);
      setCopySuccess(`Copied! ${summary}`);
      setTimeout(() => setCopySuccess(null), 4000);
    } catch (err) {
      setCopySuccess('Failed to copy - try again');
      setTimeout(() => setCopySuccess(null), 3000);
    }
    setExportDropdownOpen(false);
  }, [exportData, recommendations, isExportReady]);

  const handleDownloadPrompt = useCallback(() => {
    if (!exportData || !isExportReady) return;

    const promptInput: PromptGeneratorInput = {
      ...exportData,
      recommendations,
    };

    const prompt = generateClaudeCodePrompt(promptInput);
    const blob = new Blob([prompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `signalflow-prompt-${exportData.executionId.slice(0, 8)}.md`;
    a.click();
    URL.revokeObjectURL(url);

    setCopySuccess('Prompt downloaded!');
    setTimeout(() => setCopySuccess(null), 3000);
    setExportDropdownOpen(false);
  }, [exportData, recommendations, isExportReady]);

  const handleDownloadWorkflowJSON = useCallback(async () => {
    if (!exportData?.workflowId) {
      setCopySuccess('Workflow ID not available');
      setTimeout(() => setCopySuccess(null), 3000);
      return;
    }

    try {
      setWorkflowJSONLoading(true);

      const response = await fetch(
        `http://localhost:8001/api/workflows/${exportData.workflowId}/raw-json`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setCopySuccess('Workflow JSON not available');
        } else {
          setCopySuccess('Failed to fetch workflow JSON');
        }
        setTimeout(() => setCopySuccess(null), 3000);
        return;
      }

      const result = await response.json();
      const workflowData = result.data?.workflow;

      if (!workflowData) {
        setCopySuccess('Workflow JSON not available');
        setTimeout(() => setCopySuccess(null), 3000);
        return;
      }

      const sanitized = sanitizeWorkflowJSON(workflowData);

      const blob = new Blob([JSON.stringify(sanitized, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `workflow-${exportData.workflowId.slice(0, 8)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setCopySuccess('Workflow JSON downloaded! Attach to Claude Code session');
      setTimeout(() => setCopySuccess(null), 4000);
      setExportDropdownOpen(false);
    } catch (error) {
      console.error('Download failed:', error);
      setCopySuccess('Failed to download workflow JSON');
      setTimeout(() => setCopySuccess(null), 3000);
    } finally {
      setWorkflowJSONLoading(false);
    }
  }, [exportData]);

  // Handle case when there are no recommendations at all
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="neu-flat p-12 text-center">
        <div className="text-neu-green mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-neu-text mb-2">Workflow Performance: Excellent</h2>
        <p className="text-neu-text-muted max-w-md mx-auto font-body">
          This execution ran efficiently with no detected issues.
          No optimization recommendations are needed at this time.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-4">
          <div className="px-4 py-2 bg-neu-green/10 text-neu-green rounded-lg text-sm font-medium">
            ✓ No bottlenecks detected
          </div>
          <div className="px-4 py-2 bg-neu-green/10 text-neu-green rounded-lg text-sm font-medium">
            ✓ No errors found
          </div>
          <div className="px-4 py-2 bg-neu-green/10 text-neu-green rounded-lg text-sm font-medium">
            ✓ Optimal performance
          </div>
        </div>
      </div>
    );
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  // Filter and sort recommendations
  const filteredRecommendations = useMemo(() => {
    let filtered = recommendations.filter((rec) => {
      if (nodeFilter) {
        const affectsNode = rec.affected_node_ids?.some(nodeId =>
          nodeId.toLowerCase().includes(nodeFilter.toLowerCase())
        ) || rec.title.toLowerCase().includes(nodeFilter.toLowerCase());
        if (!affectsNode) return false;
      }

      if (filters.category !== 'all' && rec.category !== filters.category) return false;
      if (filters.impact !== 'all' && rec.impact !== filters.impact) return false;
      if (filters.effort !== 'all' && rec.effort !== filters.effort) return false;
      return true;
    });

    const impactOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
    const effortOrder = { LOW: 3, MEDIUM: 2, HIGH: 1 };

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          return b.priority_score - a.priority_score;
        case 'impact':
          return impactOrder[b.impact] - impactOrder[a.impact];
        case 'effort':
          return effortOrder[b.effort] - effortOrder[a.effort];
        case 'time_saved':
          return (b.time_saved_ms || 0) - (a.time_saved_ms || 0);
        default:
          return 0;
      }
    });
  }, [recommendations, filters, sortBy, nodeFilter]);

  // Group recommendations by category
  const groupedRecommendations = useMemo(() => {
    const groups: Record<string, Recommendation[]> = {};
    filteredRecommendations.forEach(rec => {
      const category = rec.category.toLowerCase();
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(rec);
    });
    return groups;
  }, [filteredRecommendations]);

  // Get categories with counts for display
  const categoriesWithCounts = useMemo(() => {
    const categories = Object.keys(CATEGORY_INFO);
    return categories.map(cat => ({
      key: cat,
      ...CATEGORY_INFO[cat],
      count: groupedRecommendations[cat]?.length || 0,
      criticalCount: groupedRecommendations[cat]?.filter(r => r.impact === 'CRITICAL').length || 0,
    })).filter(c => c.count > 0);
  }, [groupedRecommendations]);

  return (
    <div className="space-y-6">
      {/* Node Filter Banner */}
      {nodeFilter && (
        <div className="neu-flat p-4 border-l-4 border-neu-accent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-neu-accent/20 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-medium text-neu-text">
                Showing recommendations for: <span className="font-semibold text-neu-accent">{nodeFilter}</span>
              </div>
              <div className="text-xs text-neu-text-muted">
                {filteredRecommendations.length} recommendation{filteredRecommendations.length !== 1 ? 's' : ''} found
              </div>
            </div>
          </div>
          {onClearNodeFilter && (
            <button
              onClick={onClearNodeFilter}
              className="btn-primary flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear Filter
            </button>
          )}
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-metric">
          <div className="text-2xl font-display font-bold text-neu-text">{summary.total_recommendations}</div>
          <div className="text-sm text-neu-text-muted">Total Recommendations</div>
        </div>
        <div className="card-metric border-l-4 border-neu-teal">
          <div className="text-2xl font-display font-bold text-neu-teal">{summary.by_category?.performance || 0}</div>
          <div className="text-sm text-neu-text-muted">Performance</div>
        </div>
        <div className="card-metric border-l-4 border-neu-accent">
          <div className="text-2xl font-display font-bold text-neu-accent">{summary.by_category?.reliability || 0}</div>
          <div className="text-sm text-neu-text-muted">Reliability</div>
        </div>
        <div className="card-metric border-l-4 border-neu-coral">
          <div className="text-2xl font-display font-bold text-neu-coral">{summary.by_impact?.CRITICAL || 0}</div>
          <div className="text-sm text-neu-text-muted">Critical Impact</div>
        </div>
      </div>

      {/* Filter Controls + View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <FilterControls
          filters={filters}
          sortBy={sortBy}
          onFilterChange={onFilterChange}
          onSortChange={onSortChange}
          counts={{
            total: recommendations.length,
            filtered: filteredRecommendations.length,
          }}
        />

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2 neu-inset rounded-lg p-1">
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'neu-raised text-neu-accent'
                : 'text-neu-text-muted hover:text-neu-text'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Grouped
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'neu-raised text-neu-accent'
                : 'text-neu-text-muted hover:text-neu-text'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </button>
        </div>

        {/* Optimize Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-2 px-6 py-3 bg-neu-orange text-neu-bg rounded-neu text-sm font-semibold shadow-neu-raised-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-neu-raised"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M1 4v6h6M23 20v-6h-6" />
              <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
            </svg>
            Optimize
            <svg className={`w-4 h-4 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {exportDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setExportDropdownOpen(false)}
              />

              <div className="absolute right-0 mt-2 w-80 neu-raised rounded-lg z-20 overflow-hidden">
                {/* Claude Code Section */}
                <div className="p-4 bg-gradient-to-r from-neu-accent/10 to-neu-accent-light/10 border-b border-neu-shadow-light/30">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h4 className="font-semibold text-neu-text">Optimize with Claude Code</h4>
                      <p className="text-xs text-neu-text-muted mt-0.5">
                        Generate a prompt with all analysis data to implement fixes
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyPrompt}
                      disabled={!isExportReady}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 neu-flat rounded-lg text-sm font-medium text-neu-text hover:bg-neu-shadow-light/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Prompt
                    </button>
                    <button
                      onClick={handleDownloadPrompt}
                      disabled={!isExportReady}
                      className="flex items-center justify-center gap-2 px-3 py-2 neu-flat rounded-lg text-sm font-medium text-neu-text hover:bg-neu-shadow-light/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Download as Markdown"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                  {!isExportReady && (
                    <p className="text-xs text-neu-orange mt-2">
                      {exportData
                        ? `Preparing export data...`
                        : 'Export data not passed from parent component'}
                    </p>
                  )}
                </div>

                {/* Workflow JSON Download */}
                <div className="p-2 border-t border-neu-shadow-light/30">
                  <button
                    onClick={handleDownloadWorkflowJSON}
                    disabled={workflowJSONLoading || !exportData?.workflowId}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-lg hover:bg-neu-shadow-light/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-lg">📦</span>
                    <div className="flex-1">
                      <div className="font-medium text-neu-text">
                        {workflowJSONLoading ? 'Downloading...' : 'Download Workflow JSON'}
                      </div>
                      <div className="text-xs text-neu-text-muted">
                        Attach to Claude Code for context
                      </div>
                    </div>
                  </button>
                </div>

                {/* Other Export Options */}
                <div className="p-2 border-t border-neu-shadow-light/20">
                  <button
                    disabled
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-neu-text-muted rounded-lg cursor-not-allowed"
                  >
                    <span>📄</span>
                    <span>Export as PDF</span>
                    <span className="ml-auto text-xs bg-neu-shadow-dark/30 px-2 py-0.5 rounded">Coming soon</span>
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-neu-text-muted rounded-lg cursor-not-allowed"
                  >
                    <span>📊</span>
                    <span>Export as CSV</span>
                    <span className="ml-auto text-xs bg-neu-shadow-dark/30 px-2 py-0.5 rounded">Coming soon</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Copy Success Toast */}
      {copySuccess && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="neu-raised px-4 py-3 flex items-center gap-3">
            <svg className="w-5 h-5 text-neu-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-neu-text">{copySuccess}</span>
          </div>
        </div>
      )}

      {/* Recommendations - Grouped View */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {categoriesWithCounts.length > 0 ? (
            categoriesWithCounts.map(({ key, label, icon, description, colorClass, count, criticalCount }) => {
              const isExpanded = expandedCategories.has(key);
              const categoryRecs = groupedRecommendations[key] || [];

              return (
                <div key={key} className="neu-raised overflow-hidden">
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(key)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-neu-shadow-light/5 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg bg-${colorClass}/20 text-${colorClass} flex items-center justify-center`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className="font-display font-semibold text-neu-text">{label}</h3>
                        <p className="text-sm text-neu-text-muted">{description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {criticalCount > 0 && (
                        <span className="px-2 py-1 bg-neu-coral/15 text-neu-coral text-xs font-medium rounded">
                          {criticalCount} critical
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-sm font-medium bg-${colorClass}/15 text-${colorClass}`}>
                        {count}
                      </span>
                      <svg
                        className={`w-5 h-5 text-neu-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Category Recommendations */}
                  {isExpanded && (
                    <div className="divide-y divide-neu-shadow-light/20">
                      {categoryRecs.map((rec) => (
                        <RecommendationCard
                          key={rec.id}
                          recommendation={rec}
                          onClick={() => onViewEvidence(rec)}
                          compact
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className="neu-flat p-12 text-center">
              <p className="text-neu-text-muted">No recommendations match your filters</p>
              <button
                onClick={() => onFilterChange({ category: 'all', impact: 'all', effort: 'all' })}
                className="mt-4 text-neu-accent hover:text-neu-accent-light transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Recommendations - List View */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          {filteredRecommendations.length > 0 ? (
            filteredRecommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                onClick={() => onViewEvidence(rec)}
              />
            ))
          ) : (
            <div className="neu-flat p-12 text-center">
              <p className="text-neu-text-muted">No recommendations match your filters</p>
              <button
                onClick={() => onFilterChange({ category: 'all', impact: 'all', effort: 'all' })}
                className="mt-4 text-neu-accent hover:text-neu-accent-light transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getImpactColors(impact: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-neu-coral/15 text-neu-coral border-neu-coral/30',
    HIGH: 'bg-neu-orange/15 text-neu-orange border-neu-orange/30',
    MEDIUM: 'bg-neu-yellow/15 text-neu-yellow border-neu-yellow/30',
    LOW: 'bg-neu-teal/15 text-neu-teal border-neu-teal/30',
  };
  return colors[impact] || colors.MEDIUM;
}

function getCategoryColors(category: string): string {
  const colors: Record<string, string> = {
    performance: 'bg-neu-teal/15 text-neu-teal',
    reliability: 'bg-neu-accent/15 text-neu-accent',
    cost: 'bg-neu-green/15 text-neu-green',
    maintainability: 'bg-neu-shadow-light/30 text-neu-text-muted',
  };
  return colors[category.toLowerCase()] || colors.maintainability;
}

function getEffortColors(effort: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-neu-green/15 text-neu-green',
    MEDIUM: 'bg-neu-yellow/15 text-neu-yellow',
    HIGH: 'bg-neu-coral/15 text-neu-coral',
  };
  return colors[effort] || colors.MEDIUM;
}

function RecommendationCard({
  recommendation,
  onClick,
  compact = false,
}: {
  recommendation: Recommendation;
  onClick: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div
        className="px-6 py-4 cursor-pointer hover:bg-neu-shadow-light/5 transition-colors"
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getImpactColors(recommendation.impact)}`}>
                {recommendation.impact}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getEffortColors(recommendation.effort)}`}>
                {recommendation.effort}
              </span>
            </div>
            <h4 className="font-medium text-neu-text truncate">{recommendation.title}</h4>
            <p className="text-sm text-neu-text-muted truncate">{recommendation.description}</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-lg font-display font-bold text-neu-text">{recommendation.priority_score}</div>
              <div className="text-xs text-neu-text-muted">priority</div>
            </div>
            {recommendation.time_saved_ms && (
              <div className="text-right">
                <div className="text-sm font-semibold text-neu-green">
                  {formatDuration(recommendation.time_saved_ms)}
                </div>
                <div className="text-xs text-neu-text-muted">savings</div>
              </div>
            )}
            <svg className="w-5 h-5 text-neu-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="neu-raised p-6 cursor-pointer hover:shadow-xl transition-shadow"
      onClick={onClick}
    >
      <div className="flex flex-col lg:flex-row lg:items-start gap-4">
        {/* Main content */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium border ${getImpactColors(recommendation.impact)}`}>
              {recommendation.impact}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColors(recommendation.category)}`}>
              {recommendation.category}
            </span>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getEffortColors(recommendation.effort)}`}>
              {recommendation.effort} effort
            </span>
          </div>

          {/* Title and description */}
          <h3 className="font-display text-lg font-semibold text-neu-text">{recommendation.title}</h3>
          <p className="mt-1 text-sm text-neu-text-muted line-clamp-2">{recommendation.description}</p>

          {/* Evidence preview */}
          {recommendation.evidence && recommendation.evidence.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-medium text-neu-text-muted">Evidence:</span>
              <ul className="mt-1 space-y-1">
                {recommendation.evidence.slice(0, 2).map((ev, idx) => (
                  <li key={idx} className="text-xs text-neu-text-muted flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-neu-accent rounded-full" />
                    {ev.description}
                  </li>
                ))}
                {recommendation.evidence.length > 2 && (
                  <li className="text-xs text-neu-accent">
                    +{recommendation.evidence.length - 2} more
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>

        {/* Right side - metrics */}
        <div className="flex flex-row lg:flex-col gap-4 lg:gap-2 lg:text-right lg:min-w-[140px]">
          <div>
            <div className="text-xs text-neu-text-muted">Priority Score</div>
            <div className="text-xl font-display font-bold text-neu-text">{recommendation.priority_score}</div>
          </div>

          {recommendation.time_saved_ms && (
            <div>
              <div className="text-xs text-neu-text-muted">Potential Savings</div>
              <div className="text-lg font-semibold text-neu-green">
                {formatDuration(recommendation.time_saved_ms)}
              </div>
            </div>
          )}

          {recommendation.code_example && (
            <div className="flex items-center gap-1 text-xs text-neu-accent">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              Code example
            </div>
          )}
        </div>
      </div>

      {/* Affected nodes */}
      {recommendation.affected_node_ids && recommendation.affected_node_ids.length > 0 && (
        <div className="mt-4 pt-4 border-t border-neu-shadow-light/20">
          <span className="text-xs text-neu-text-muted">
            Affects {recommendation.affected_node_ids.length} node{recommendation.affected_node_ids.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Click hint */}
      <div className="mt-2 text-xs text-neu-accent">
        Click to view details and code example
      </div>
    </div>
  );
}
