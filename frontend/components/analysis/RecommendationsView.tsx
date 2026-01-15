'use client';

/**
 * Recommendations View component
 * Shows filterable and sortable list of recommendations
 */

import { useMemo } from 'react';
import {
  RecommendationsResponse,
  Recommendation,
  formatDuration,
  getImpactColors,
  getCategoryColors,
  getEffortColors,
} from '@/lib/api/analysis';
import { Filters, SortOption } from './AnalysisDashboard';
import { FilterControls } from './FilterControls';

interface RecommendationsViewProps {
  data: RecommendationsResponse;
  filters: Filters;
  sortBy: SortOption;
  onFilterChange: (filters: Filters) => void;
  onSortChange: (sortBy: SortOption) => void;
  onViewEvidence: (recommendation: Recommendation) => void;
}

export function RecommendationsView({
  data,
  filters,
  sortBy,
  onFilterChange,
  onSortChange,
  onViewEvidence,
}: RecommendationsViewProps) {
  const { recommendations, summary } = data;

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

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-900">{summary.total_recommendations}</div>
          <div className="text-sm text-gray-500">Total Recommendations</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{summary.by_category.performance || 0}</div>
          <div className="text-sm text-gray-500">Performance</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">{summary.by_category.reliability || 0}</div>
          <div className="text-sm text-gray-500">Reliability</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{summary.by_impact.CRITICAL || 0}</div>
          <div className="text-sm text-gray-500">Critical Impact</div>
        </div>
      </div>

      {/* Filter Controls */}
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

      {/* Recommendations List */}
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
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onClick,
}: {
  recommendation: Recommendation;
  onClick: () => void;
}) {
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
          {recommendation.evidence.length > 0 && (
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
      {recommendation.affected_node_ids.length > 0 && (
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
