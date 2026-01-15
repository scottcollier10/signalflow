'use client';

/**
 * Filter controls for recommendations list
 */

import { Filters, SortOption } from './AnalysisDashboard';

interface FilterControlsProps {
  filters: Filters;
  sortBy: SortOption;
  onFilterChange: (filters: Filters) => void;
  onSortChange: (sortBy: SortOption) => void;
  counts: {
    total: number;
    filtered: number;
  };
}

export function FilterControls({
  filters,
  sortBy,
  onFilterChange,
  onSortChange,
  counts,
}: FilterControlsProps) {
  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Category Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange({ ...filters, category: e.target.value as Filters['category'] })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            <option value="performance">Performance</option>
            <option value="reliability">Reliability</option>
          </select>
        </div>

        {/* Impact Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Impact
          </label>
          <select
            value={filters.impact}
            onChange={(e) => onFilterChange({ ...filters, impact: e.target.value as Filters['impact'] })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Impact Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
        </div>

        {/* Effort Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Effort
          </label>
          <select
            value={filters.effort}
            onChange={(e) => onFilterChange({ ...filters, effort: e.target.value as Filters['effort'] })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Effort Levels</option>
            <option value="LOW">Low Effort</option>
            <option value="MEDIUM">Medium Effort</option>
            <option value="HIGH">High Effort</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="priority">Priority Score</option>
            <option value="impact">Impact Level</option>
            <option value="effort">Effort Level</option>
            <option value="time_saved">Time Saved</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
        <span className="text-sm text-gray-500">
          Showing {counts.filtered} of {counts.total} recommendations
        </span>

        {counts.filtered !== counts.total && (
          <button
            onClick={() => onFilterChange({ category: 'all', impact: 'all', effort: 'all' })}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}
