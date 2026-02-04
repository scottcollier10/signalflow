'use client';

/**
 * Recommendations View component
 * Shows filterable and sortable list of recommendations
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
  getImpactColors,
  getCategoryColors,
  getEffortColors,
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
}

const CATEGORY_INFO: Record<string, { label: string; icon: string; description: string; color: string }> = {
  performance: {
    label: 'Performance',
    icon: 'M13 10V3L4 14h7v7l9-11h-7z',
    description: 'Speed up execution and reduce latency',
    color: 'blue',
  },
  reliability: {
    label: 'Reliability',
    icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
    description: 'Improve error handling and stability',
    color: 'purple',
  },
  cost: {
    label: 'Cost Optimization',
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    description: 'Reduce resource usage and costs',
    color: 'green',
  },
  maintainability: {
    label: 'Maintainability',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
    description: 'Improve code quality and maintainability',
    color: 'gray',
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
  // Validates that we have the minimum required data for export
  const isExportReady = Boolean(
    exportData &&
    exportData.executionId &&
    exportData.executionId.length > 0
  );

  // Debug: Log export data status when not ready (can be removed after confirming fix)
  if (typeof window !== 'undefined' && !isExportReady && exportDropdownOpen) {
    console.log('[RecommendationsView] Export data debug:', {
      hasExportData: !!exportData,
      executionId: exportData?.executionId || 'missing',
      bottlenecksCount: exportData?.bottlenecks?.length ?? 'n/a',
      isExportReady,
    });
  }

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

      // Fetch workflow JSON from API
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

      // Sanitize before download
      const sanitized = sanitizeWorkflowJSON(workflowData);

      // Download
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
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-green-500 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Workflow Performance: Excellent</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          This execution ran efficiently with no detected issues.
          No optimization recommendations are needed at this time.
        </p>
        <div className="mt-6 flex justify-center gap-4">
          <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
            ✓ No bottlenecks detected
          </div>
          <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
            ✓ No errors found
          </div>
          <div className="px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
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
      if (filters.category !== 'all' && rec.category !== filters.category) return false;
      if (filters.impact !== 'all' && rec.impact !== filters.impact) return false;
      if (filters.effort !== 'all' && rec.effort !== filters.effort) return false;
      return true;
    });

    // Sort
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
  }, [recommendations, filters, sortBy]);

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
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{summary.total_recommendations}</div>
          <div className="text-sm text-gray-500">Total Recommendations</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{summary.by_category?.performance || 0}</div>
          <div className="text-sm text-gray-500">Performance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{summary.by_category?.reliability || 0}</div>
          <div className="text-sm text-gray-500">Reliability</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{summary.by_impact?.CRITICAL || 0}</div>
          <div className="text-sm text-gray-500">Critical Impact</div>
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
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('grouped')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              viewMode === 'grouped'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
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
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            List
          </button>
        </div>

        {/* Export Dropdown */}
        <div className="relative">
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Export
            <svg className={`w-4 h-4 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {exportDropdownOpen && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setExportDropdownOpen(false)}
              />

              {/* Menu */}
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-20 overflow-hidden">
                {/* Claude Code Section */}
                <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h4 className="font-semibold text-gray-900">Optimize with Claude Code</h4>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Generate a prompt with all analysis data to implement fixes
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyPrompt}
                      disabled={!isExportReady}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy Prompt
                    </button>
                    <button
                      onClick={handleDownloadPrompt}
                      disabled={!isExportReady}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Download as Markdown"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                    </button>
                  </div>
                  {!isExportReady && (
                    <p className="text-xs text-amber-600 mt-2">
                      {exportData
                        ? `Preparing export data... (ID: ${exportData.executionId ? 'yes' : 'missing'})`
                        : 'Export data not passed from parent component'}
                    </p>
                  )}
                </div>

                {/* Workflow JSON Download */}
                <div className="p-2 border-t border-gray-200">
                  <button
                    onClick={handleDownloadWorkflowJSON}
                    disabled={workflowJSONLoading || !exportData?.workflowId}
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span className="text-lg">📦</span>
                    <div className="flex-1">
                      <div className="font-medium text-gray-700">
                        {workflowJSONLoading ? 'Downloading...' : 'Download Workflow JSON'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Attach to Claude Code for context
                      </div>
                    </div>
                  </button>
                </div>

                {/* Other Export Options */}
                <div className="p-2 border-t border-gray-100">
                  <button
                    disabled
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-400 rounded-lg cursor-not-allowed"
                  >
                    <span>📄</span>
                    <span>Export as PDF</span>
                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">Coming soon</span>
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm text-gray-400 rounded-lg cursor-not-allowed"
                  >
                    <span>📊</span>
                    <span>Export as CSV</span>
                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">Coming soon</span>
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
          <div className="bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm">{copySuccess}</span>
          </div>
        </div>
      )}

      {/* Recommendations - Grouped View */}
      {viewMode === 'grouped' && (
        <div className="space-y-4">
          {categoriesWithCounts.length > 0 ? (
            categoriesWithCounts.map(({ key, label, icon, description, color, count, criticalCount }) => {
              const isExpanded = expandedCategories.has(key);
              const categoryRecs = groupedRecommendations[key] || [];
              const colorClasses = {
                blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-700' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
                green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', badge: 'bg-green-100 text-green-700' },
                gray: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' },
              }[color] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-700' };

              return (
                <div key={key} className={`rounded-lg border ${colorClasses.border} overflow-hidden`}>
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(key)}
                    className={`w-full ${colorClasses.bg} px-6 py-4 flex items-center justify-between hover:brightness-95 transition-all`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg ${colorClasses.badge} flex items-center justify-center`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                        </svg>
                      </div>
                      <div className="text-left">
                        <h3 className={`font-semibold ${colorClasses.text}`}>{label}</h3>
                        <p className="text-sm text-gray-500">{description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {criticalCount > 0 && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded">
                          {criticalCount} critical
                        </span>
                      )}
                      <span className={`px-2.5 py-1 rounded-full text-sm font-medium ${colorClasses.badge}`}>
                        {count}
                      </span>
                      <svg
                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
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
                    <div className="bg-white divide-y divide-gray-100">
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No recommendations match your filters</p>
              <button
                onClick={() => onFilterChange({ category: 'all', impact: 'all', effort: 'all' })}
                className="mt-4 text-blue-600 hover:text-blue-700"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No recommendations match your filters</p>
              <button
                onClick={() => onFilterChange({ category: 'all', impact: 'all', effort: 'all' })}
                className="mt-4 text-blue-600 hover:text-blue-700"
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
        className="px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
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
            <h4 className="font-medium text-gray-900 truncate">{recommendation.title}</h4>
            <p className="text-sm text-gray-500 truncate">{recommendation.description}</p>
          </div>
          <div className="flex items-center gap-4 flex-shrink-0">
            <div className="text-right">
              <div className="text-lg font-bold text-gray-900">{recommendation.priority_score}</div>
              <div className="text-xs text-gray-500">priority</div>
            </div>
            {recommendation.time_saved_ms && (
              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  {formatDuration(recommendation.time_saved_ms)}
                </div>
                <div className="text-xs text-gray-500">savings</div>
              </div>
            )}
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow"
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
          <h3 className="text-lg font-semibold text-gray-900">{recommendation.title}</h3>
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">{recommendation.description}</p>

          {/* Evidence preview */}
          {recommendation.evidence && recommendation.evidence.length > 0 && (
            <div className="mt-3">
              <span className="text-xs font-medium text-gray-500">Evidence:</span>
              <ul className="mt-1 space-y-1">
                {recommendation.evidence.slice(0, 2).map((ev, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {ev.description}
                  </li>
                ))}
                {recommendation.evidence.length > 2 && (
                  <li className="text-xs text-blue-600">
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
            <div className="text-xs text-gray-500">Priority Score</div>
            <div className="text-xl font-bold text-gray-900">{recommendation.priority_score}</div>
          </div>

          {recommendation.time_saved_ms && (
            <div>
              <div className="text-xs text-gray-500">Potential Savings</div>
              <div className="text-lg font-semibold text-green-600">
                {formatDuration(recommendation.time_saved_ms)}
              </div>
            </div>
          )}

          {recommendation.code_example && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
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
        <div className="mt-4 pt-4 border-t border-gray-100">
          <span className="text-xs text-gray-500">
            Affects {recommendation.affected_node_ids.length} node{recommendation.affected_node_ids.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* Click hint */}
      <div className="mt-2 text-xs text-blue-600">
        Click to view details and code example
      </div>
    </div>
  );
}
