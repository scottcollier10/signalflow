'use client';

/**
 * Overview tab showing executive summary of all analyses
 * Includes scoring explanations for bottlenecks and recommendations
 */

import { useState } from 'react';
import {
  AnalysisData,
  Recommendation,
  OptimizationVerdict,
  formatDuration,
  getSeverityColors,
  getImpactColors,
} from '@/lib/api/analysis';

interface AnalysisOverviewProps {
  data: AnalysisData;
  onViewEvidence: (recommendation: Recommendation) => void;
  onTabChange?: (tab: 'overview' | 'critical-path' | 'bottlenecks' | 'errors' | 'recommendations') => void;
}

export function AnalysisOverview({ data, onViewEvidence, onTabChange }: AnalysisOverviewProps) {
  const { criticalPath, bottlenecks, errors, recommendations } = data;
  const [showScoringLegend, setShowScoringLegend] = useState(false);

  // Get optimization verdict
  const verdict = bottlenecks.verdict;

  // Get top severity bottlenecks
  const severeBottlenecks = bottlenecks.bottlenecks.filter(b => b.severity === 'severe' || b.severity === 'high');

  // Get top priority recommendation
  const topRecommendation = recommendations.summary.top_priority || recommendations.recommendations[0];

  // Handle verdict banner click - navigate to relevant tab
  const handleVerdictClick = () => {
    if (!onTabChange || !verdict) return;

    switch (verdict.status) {
      case 'critical':
      case 'needs_optimization':
        // Has recommendations - go to recommendations tab
        onTabChange('recommendations');
        break;
      case 'minor_improvements':
        // Minor issues - go to bottlenecks tab
        onTabChange('bottlenecks');
        break;
      default:
        // Well optimized - no action needed
        break;
    }
  };

  // Determine if verdict banner should be clickable
  const isVerdictClickable = verdict && verdict.status !== 'well_optimized' && onTabChange;
  
  // Debug logging
  console.log('[AnalysisOverview] Debug:', {
    hasVerdict: !!verdict,
    verdictStatus: verdict?.status,
    isNotWellOptimized: verdict?.status !== 'well_optimized',
    hasOnTabChange: !!onTabChange,
    isVerdictClickable
  });

  return (
    <div className="space-y-6">
      {/* Optimization Verdict Banner */}
      {verdict && (
        <div
          className={`rounded-lg border-2 p-4 ${
            verdict.color === 'green'
              ? 'border-green-300 bg-green-50'
              : verdict.color === 'yellow'
              ? 'border-yellow-300 bg-yellow-50'
              : 'border-red-300 bg-red-50'
          } ${isVerdictClickable ? 'cursor-pointer hover:brightness-95 transition-all' : ''}`}
          onClick={isVerdictClickable ? handleVerdictClick : undefined}
          role={isVerdictClickable ? 'button' : undefined}
          tabIndex={isVerdictClickable ? 0 : undefined}
          onKeyDown={isVerdictClickable ? (e) => e.key === 'Enter' && handleVerdictClick() : undefined}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">
              {verdict.color === 'green' ? '\u2705' : verdict.color === 'yellow' ? '\u26A0\uFE0F' : '\u{1F534}'}
            </span>
            <div className="flex-1">
              <h3 className={`font-semibold text-lg ${
                verdict.color === 'green' ? 'text-green-800' :
                verdict.color === 'yellow' ? 'text-yellow-800' : 'text-red-800'
              }`}>
                {verdict.status === 'well_optimized' ? 'Well Optimized' :
                 verdict.status === 'minor_improvements' ? 'Minor Improvements Available' :
                 verdict.status === 'needs_optimization' ? 'Optimization Recommended' :
                 'Critical Optimization Needed'}
              </h3>
              <p className={`text-sm ${
                verdict.color === 'green' ? 'text-green-700' :
                verdict.color === 'yellow' ? 'text-yellow-700' : 'text-red-700'
              }`}>
                {verdict.message}
              </p>
            </div>
            {isVerdictClickable && (
              <div className={`flex items-center gap-1 text-sm ${
                verdict.color === 'green' ? 'text-green-600' :
                verdict.color === 'yellow' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                <span>View</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
          <button
            onClick={() => setShowScoringLegend(!showScoringLegend)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showScoringLegend ? 'Hide' : 'Show'} scoring legend
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Critical Path */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {criticalPath.summary.path_percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-blue-600">of total execution</div>
            <div className="mt-2 text-xs text-blue-500">
              {criticalPath.summary.node_count} nodes on critical path
            </div>
          </div>

          {/* Bottlenecks */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">
              {bottlenecks.summary.bottlenecks_by_severity.severe + bottlenecks.summary.bottlenecks_by_severity.high}
            </div>
            <div className="text-sm text-orange-600">high-impact bottlenecks</div>
            <div className="mt-2 text-xs text-orange-500">
              {bottlenecks.summary.total_nodes_analyzed} total nodes analyzed
            </div>
          </div>

          {/* Errors */}
          <div className={`p-4 rounded-lg ${errors.summary.total_errors > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className={`text-2xl font-bold ${errors.summary.total_errors > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {errors.summary.total_errors}
            </div>
            <div className={`text-sm ${errors.summary.total_errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {errors.summary.total_errors > 0 ? 'errors detected' : 'clean execution'}
            </div>
            {errors.summary.total_clusters > 0 && (
              <div className="mt-2 text-xs text-red-500">
                {errors.summary.total_clusters} error clusters
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              {recommendations.summary.total_recommendations}
            </div>
            <div className="text-sm text-purple-600">recommendations</div>
            <div className="mt-2 text-xs text-purple-500">
              {recommendations.summary.by_category.performance || 0} performance, {recommendations.summary.by_category.reliability || 0} reliability
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Legend Panel */}
      {showScoringLegend && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">How Scores Are Calculated</h3>
            <button
              onClick={() => setShowScoringLegend(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bottleneck Scoring */}
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="font-semibold text-orange-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bottleneck Score (0-100)
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Identifies nodes that slow down your workflow using 4 weighted factors:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-gray-700">40%</span>
                  <span className="text-gray-600"><strong>Duration</strong> — How long the node takes relative to others</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-gray-700">30%</span>
                  <span className="text-gray-600"><strong>Criticality</strong> — Impact based on position (critical path = higher)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-gray-700">20%</span>
                  <span className="text-gray-600"><strong>Frequency</strong> — How often it runs (loops increase score)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-gray-700">10%</span>
                  <span className="text-gray-600"><strong>Variance</strong> — Inconsistent times indicate problems</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Severity Thresholds:</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Severe: 90-100</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">High: 70-89</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">Medium: 50-69</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Low: 0-49</span>
                </div>
              </div>
            </div>

            {/* Recommendation Scoring */}
            <div className="bg-white/70 rounded-lg p-4">
              <h4 className="font-semibold text-purple-700 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Priority Score (0-100)
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                Ranks recommendations by potential value using this formula:
              </p>
              <div className="bg-gray-100 rounded p-3 font-mono text-sm text-center mb-3">
                priority = (impact_score / effort) × 100
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <strong className="text-gray-700">Impact Score:</strong>
                  <span className="text-gray-600 ml-2">Critical=100, High=75, Medium=50, Low=25</span>
                </div>
                <div>
                  <strong className="text-gray-700">Effort Multiplier:</strong>
                  <span className="text-gray-600 ml-2">Low=0.5, Medium=1.0, High=1.5</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs font-medium text-gray-700 mb-2">Impact Levels:</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded border border-red-200">Critical</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded border border-orange-200">High</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded border border-yellow-200">Medium</span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded border border-green-200">Low</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bottlenecks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Bottlenecks</h3>

          {severeBottlenecks.length > 0 ? (
            <div className="space-y-3">
              {severeBottlenecks.slice(0, 3).map((bottleneck) => {
                const colors = getSeverityColors(bottleneck.severity);
                return (
                  <div
                    key={bottleneck.node_id}
                    className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 truncate">
                        {bottleneck.node_name}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${colors.badge}`}>
                        {bottleneck.bottleneck_score}/100
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {formatDuration(bottleneck.total_duration_ms)}
                      {bottleneck.is_on_critical_path && (
                        <span className="ml-2 text-red-600 text-xs">Critical Path</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No severe bottlenecks detected</p>
          )}
        </div>

        {/* Top Recommendation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Recommendation</h3>

          {topRecommendation ? (
            <div
              className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onViewEvidence(topRecommendation)}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-gray-900">{topRecommendation.title}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getImpactColors(topRecommendation.impact)}`}>
                  {topRecommendation.impact}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {topRecommendation.description}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  Priority: {topRecommendation.priority_score}/100
                </span>
                {topRecommendation.time_saved_ms && (
                  <span className="text-xs text-green-600">
                    Save {formatDuration(topRecommendation.time_saved_ms)}
                  </span>
                )}
              </div>
              <div className="mt-3 text-xs text-blue-600">
                Click to view evidence and code example
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recommendations available</p>
          )}
        </div>
      </div>

      {/* Critical Path Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Path Summary</h3>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-2">Total Duration</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatDuration(criticalPath.summary.total_duration_ms)}
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-2">Path Coverage</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${criticalPath.summary.path_percentage}%` }}
                />
              </div>
              <span className="text-lg font-medium text-gray-900">
                {criticalPath.summary.path_percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-2">Nodes</div>
            <div className="text-3xl font-bold text-gray-900">
              {criticalPath.summary.node_count}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
