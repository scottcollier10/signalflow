'use client';

/**
 * Bottleneck View component
 * Shows detailed bottleneck analysis with severity color coding
 * Includes severity tabs for filtering and scoring explanations
 */

import { useState } from 'react';
import { BottlenecksResponse, Bottleneck, formatDuration, getSeverityColors } from '@/lib/api/analysis';

type SeverityFilter = 'all' | 'severe' | 'high' | 'medium' | 'low';

interface BottleneckViewProps {
  data: BottlenecksResponse;
  onTabChange?: (tab: 'overview' | 'critical-path' | 'bottlenecks' | 'errors' | 'recommendations') => void;
  onNodeFilter?: (nodeName: string) => void;
}

export function BottleneckView({ data, onTabChange, onNodeFilter }: BottleneckViewProps) {
  const { bottlenecks, summary } = data;

  // Debug: Log props at render time
  console.log('[BottleneckView] Component render - props received:', {
    hasData: !!data,
    hasOnTabChange: !!onTabChange,
    hasOnNodeFilter: !!onNodeFilter,
    onTabChangeType: typeof onTabChange,
    onNodeFilterType: typeof onNodeFilter
  });

  // Handle "View Fix" button click
  const handleViewFix = (nodeName: string) => {
    console.log('[BottleneckView] handleViewFix called:', {
      nodeName,
      hasOnNodeFilter: !!onNodeFilter,
      hasOnTabChange: !!onTabChange
    });

    if (onNodeFilter) {
      console.log('[BottleneckView] Calling onNodeFilter with:', nodeName);
      onNodeFilter(nodeName);
    }
    if (onTabChange) {
      console.log('[BottleneckView] Calling onTabChange with: recommendations');
      onTabChange('recommendations');
    }
  };
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('all');
  const [showScoringInfo, setShowScoringInfo] = useState(false);

  // Calculate counts directly from the actual bottlenecks array (single source of truth)
  const severityCounts = {
    all: bottlenecks.length,
    severe: bottlenecks.filter(b => b.severity === 'severe').length,
    high: bottlenecks.filter(b => b.severity === 'high').length,
    medium: bottlenecks.filter(b => b.severity === 'medium').length,
    low: bottlenecks.filter(b => b.severity === 'low').length,
  };

  // Filter bottlenecks based on active filter
  const filteredBottlenecks = activeFilter === 'all'
    ? bottlenecks
    : bottlenecks.filter(b => b.severity === activeFilter);

  const getTabCount = (severity: SeverityFilter) => severityCounts[severity];

  return (
    <div className="space-y-6">
      {/* Summary Cards - Clickable to filter (use calculated counts from actual data) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SeverityCard
          severity="severe"
          count={severityCounts.severe}
          label="Severe"
          isActive={activeFilter === 'severe'}
          onClick={() => setActiveFilter(activeFilter === 'severe' ? 'all' : 'severe')}
        />
        <SeverityCard
          severity="high"
          count={severityCounts.high}
          label="High"
          isActive={activeFilter === 'high'}
          onClick={() => setActiveFilter(activeFilter === 'high' ? 'all' : 'high')}
        />
        <SeverityCard
          severity="medium"
          count={severityCounts.medium}
          label="Medium"
          isActive={activeFilter === 'medium'}
          onClick={() => setActiveFilter(activeFilter === 'medium' ? 'all' : 'medium')}
        />
        <SeverityCard
          severity="low"
          count={severityCounts.low}
          label="Low"
          isActive={activeFilter === 'low'}
          onClick={() => setActiveFilter(activeFilter === 'low' ? 'all' : 'low')}
        />
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'severe', 'high', 'medium', 'low'] as const).map((severity) => {
          const count = getTabCount(severity);
          const isActive = activeFilter === severity;
          const baseStyles = "px-4 py-2 rounded-lg text-sm font-medium transition-all";

          let colorStyles = '';
          if (isActive) {
            colorStyles = severity === 'all' ? 'bg-gray-900 text-white' :
                         severity === 'severe' ? 'bg-red-600 text-white' :
                         severity === 'high' ? 'bg-orange-500 text-white' :
                         severity === 'medium' ? 'bg-yellow-500 text-white' :
                         'bg-green-500 text-white';
          } else {
            colorStyles = severity === 'all' ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' :
                         severity === 'severe' ? 'bg-red-50 text-red-700 hover:bg-red-100' :
                         severity === 'high' ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' :
                         severity === 'medium' ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' :
                         'bg-green-50 text-green-700 hover:bg-green-100';
          }

          return (
            <button
              key={severity}
              onClick={() => setActiveFilter(severity)}
              className={`${baseStyles} ${colorStyles}`}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                isActive ? 'bg-white/20' : 'bg-black/5'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Scoring Info Toggle */}
        <button
          onClick={() => setShowScoringInfo(!showScoringInfo)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          title="How scores are calculated"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How scores work
        </button>
      </div>

      {/* Scoring Explanation Panel */}
      {showScoringInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 mb-2">Bottleneck Score Formula</h4>
              <p className="text-sm text-blue-800 mb-3">
                Each bottleneck score (0-100) is calculated using 4 weighted factors:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white/60 rounded p-2">
                  <div className="font-medium text-blue-900">Duration (40%)</div>
                  <div className="text-blue-700">How long the node takes relative to the workflow</div>
                </div>
                <div className="bg-white/60 rounded p-2">
                  <div className="font-medium text-blue-900">Criticality (30%)</div>
                  <div className="text-blue-700">Position impact—nodes on critical path score higher</div>
                </div>
                <div className="bg-white/60 rounded p-2">
                  <div className="font-medium text-blue-900">Frequency (20%)</div>
                  <div className="text-blue-700">How often the node executes (loops increase score)</div>
                </div>
                <div className="bg-white/60 rounded p-2">
                  <div className="font-medium text-blue-900">Variance (10%)</div>
                  <div className="text-blue-700">Inconsistent execution times indicate problems</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-sm text-blue-800 font-medium mb-1">Severity Thresholds:</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded">Severe: 90-100</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded">High: 70-89</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Medium: 50-69</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">Low: 0-49</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowScoringInfo(false)}
              className="text-blue-400 hover:text-blue-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bottleneck Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {activeFilter === 'all' ? 'All Bottlenecks' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Severity Bottlenecks`}
          </h2>
          <div className="text-sm text-gray-500">
            Showing {filteredBottlenecks.length} of {bottlenecks.length} • {summary.total_nodes_analyzed} nodes analyzed
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBottlenecks.map((bottleneck) => (
            <BottleneckCard
              key={bottleneck.node_id}
              bottleneck={bottleneck}
              onViewFix={bottleneck.has_recommendations ? () => handleViewFix(bottleneck.node_name) : undefined}
            />
          ))}
        </div>

        {filteredBottlenecks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {activeFilter === 'all'
                ? 'No bottlenecks detected'
                : `No ${activeFilter} severity bottlenecks found`}
            </p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="mt-2 text-sm text-blue-600 hover:text-blue-800"
              >
                View all bottlenecks
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottleneck Factors Breakdown */}
      {filteredBottlenecks.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Bottleneck Analysis Details</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                    Node
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Score
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Duration
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Position
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Frequency
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-gray-500 uppercase">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBottlenecks.slice(0, 10).map((bottleneck) => {
                  const colors = getSeverityColors(bottleneck.severity);
                  return (
                    <tr key={bottleneck.node_id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate max-w-[200px]">
                            {bottleneck.node_name}
                          </span>
                          {bottleneck.is_on_critical_path && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                              CP
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-sm font-medium ${colors.badge}`}>
                          {bottleneck.bottleneck_score}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {(bottleneck.factors.duration_factor * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {(bottleneck.factors.position_factor * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {(bottleneck.factors.frequency_factor * 100).toFixed(0)}%
                      </td>
                      <td className="py-3 px-4 text-center text-sm text-gray-600">
                        {(bottleneck.factors.variance_factor * 100).toFixed(0)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="font-medium text-gray-900 mb-3">Understanding Bottleneck Scores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Duration Factor:</strong> How long the node takes relative to others
          </div>
          <div>
            <strong>Position Factor:</strong> Impact based on node position in the workflow
          </div>
          <div>
            <strong>Frequency Factor:</strong> How often the node is executed
          </div>
          <div>
            <strong>Variance Factor:</strong> Consistency of execution time
          </div>
        </div>
      </div>
    </div>
  );
}

function SeverityCard({
  severity,
  count,
  label,
  isActive,
  onClick,
}: {
  severity: string;
  count: number;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  const colors = getSeverityColors(severity);

  return (
    <button
      onClick={onClick}
      className={`
        ${colors.bg} ${colors.border} border-2 rounded-lg p-4 text-left w-full
        transition-all hover:scale-105 cursor-pointer
        ${isActive ? 'ring-2 ring-offset-2 ring-gray-900 scale-105' : ''}
      `}
    >
      <div className={`text-2xl font-bold ${colors.text}`}>{count}</div>
      <div className={`text-sm ${colors.text} flex items-center gap-1`}>
        {label}
        {isActive && (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </button>
  );
}

function BottleneckCard({ bottleneck, onViewFix }: { bottleneck: Bottleneck; onViewFix?: () => void }) {
  const colors = getSeverityColors(bottleneck.severity);

  // Debug logging
  if (bottleneck.has_recommendations) {
    console.log('[BottleneckCard] Card with recommendations:', {
      nodeName: bottleneck.node_name,
      hasRecommendations: bottleneck.has_recommendations,
      hasOnViewFix: !!onViewFix
    });
  }

  return (
    <div className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-gray-900 truncate">{bottleneck.node_name}</h3>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{bottleneck.node_type}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${colors.badge}`}>
          {bottleneck.bottleneck_score}/100
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Duration</span>
          <span className="font-medium text-gray-900">{formatDuration(bottleneck.total_duration_ms)}</span>
        </div>

        {/* Score bar */}
        <div className="bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              bottleneck.severity === 'severe' ? 'bg-red-500' :
              bottleneck.severity === 'high' ? 'bg-orange-500' :
              bottleneck.severity === 'medium' ? 'bg-yellow-500' :
              'bg-green-500'
            }`}
            style={{ width: `${bottleneck.bottleneck_score}%` }}
          />
        </div>
      </div>

      {/* View Fix Button - only shown when has_recommendations is true */}
      {onViewFix && (
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              console.log('[BottleneckCard] View Fix button clicked for:', bottleneck.node_name);
              onViewFix();
            }}
            className="w-full px-3 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View Fix
          </button>
        </div>
      )}

      {bottleneck.is_on_critical_path && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded font-medium">
            On Critical Path
          </span>
        </div>
      )}
    </div>
  );
}
