'use client';

/**
 * Overview tab showing executive summary of all analyses
 * Includes scoring explanations for bottlenecks and recommendations
 * With neumorphic design
 */

import { useState } from 'react';
import {
  AnalysisData,
  Recommendation,
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

  // Get top severity bottlenecks
  const severeBottlenecks = bottlenecks.bottlenecks.filter(b => b.severity === 'severe' || b.severity === 'high');

  // Get top priority recommendation
  const topRecommendation = recommendations.summary.top_priority || recommendations.recommendations[0];

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="neu-raised p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-display text-lg font-semibold text-neu-text">Executive Summary</h2>
          <button
            onClick={() => setShowScoringLegend(!showScoringLegend)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neu-text-muted hover:text-neu-accent rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showScoringLegend ? 'Hide' : 'Show'} scoring legend
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Critical Path */}
          <div className="card-metric">
            <div className="text-2xl font-display font-bold text-neu-teal">
              {criticalPath.summary.path_percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-neu-text-muted">of total execution</div>
            <div className="mt-2 text-xs text-neu-text-muted">
              {criticalPath.summary.node_count} nodes on critical path
            </div>
          </div>

          {/* Bottlenecks */}
          <div className="card-metric">
            <div className="text-2xl font-display font-bold text-neu-orange">
              {bottlenecks.summary.bottlenecks_by_severity.severe + bottlenecks.summary.bottlenecks_by_severity.high}
            </div>
            <div className="text-sm text-neu-text-muted">high-impact bottlenecks</div>
            <div className="mt-2 text-xs text-neu-text-muted">
              {bottlenecks.summary.total_nodes_analyzed} total nodes analyzed
            </div>
          </div>

          {/* Errors */}
          <div className="card-metric">
            <div className={`text-2xl font-display font-bold ${errors.summary.total_errors > 0 ? 'text-neu-coral' : 'text-neu-green'}`}>
              {errors.summary.total_errors}
            </div>
            <div className="text-sm text-neu-text-muted">
              {errors.summary.total_errors > 0 ? 'errors detected' : 'clean execution'}
            </div>
            {errors.summary.total_clusters > 0 && (
              <div className="mt-2 text-xs text-neu-coral">
                {errors.summary.total_clusters} error clusters
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="card-metric">
            <div className="text-2xl font-display font-bold text-neu-accent">
              {recommendations.summary.total_recommendations}
            </div>
            <div className="text-sm text-neu-text-muted">recommendations</div>
            <div className="mt-2 text-xs text-neu-text-muted">
              {recommendations.summary.by_category.performance || 0} performance, {recommendations.summary.by_category.reliability || 0} reliability
            </div>
          </div>
        </div>
      </div>

      {/* Scoring Legend Panel */}
      {showScoringLegend && (
        <div className="neu-flat p-6 border border-neu-accent/20">
          <div className="flex items-start justify-between mb-4">
            <h3 className="font-display text-lg font-semibold text-neu-text">How Scores Are Calculated</h3>
            <button
              onClick={() => setShowScoringLegend(false)}
              className="text-neu-text-muted hover:text-neu-text transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bottleneck Scoring */}
            <div className="neu-inset p-4">
              <h4 className="font-semibold text-neu-orange mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Bottleneck Score (0-100)
              </h4>
              <p className="text-sm text-neu-text-muted mb-3">
                Identifies nodes that slow down your workflow using 4 weighted factors:
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-neu-text">40%</span>
                  <span className="text-neu-text-muted"><strong className="text-neu-text">Duration</strong> — How long the node takes relative to others</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-neu-text">30%</span>
                  <span className="text-neu-text-muted"><strong className="text-neu-text">Criticality</strong> — Impact based on position (critical path = higher)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-neu-text">20%</span>
                  <span className="text-neu-text-muted"><strong className="text-neu-text">Frequency</strong> — How often it runs (loops increase score)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 font-medium text-neu-text">10%</span>
                  <span className="text-neu-text-muted"><strong className="text-neu-text">Variance</strong> — Inconsistent times indicate problems</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-neu-shadow-light/30">
                <div className="text-xs font-medium text-neu-text mb-2">Severity Thresholds:</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-neu-coral/15 text-neu-coral text-xs rounded">Severe: 90-100</span>
                  <span className="px-2 py-1 bg-neu-orange/15 text-neu-orange text-xs rounded">High: 70-89</span>
                  <span className="px-2 py-1 bg-yellow-500/15 text-yellow-400 text-xs rounded">Medium: 50-69</span>
                  <span className="px-2 py-1 bg-neu-green/15 text-neu-green text-xs rounded">Low: 0-49</span>
                </div>
              </div>
            </div>

            {/* Recommendation Scoring */}
            <div className="neu-inset p-4">
              <h4 className="font-semibold text-neu-accent mb-3 flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Priority Score (0-100)
              </h4>
              <p className="text-sm text-neu-text-muted mb-3">
                Ranks recommendations by potential value using this formula:
              </p>
              <div className="bg-neu-shadow-dark/30 rounded p-3 font-mono text-sm text-center mb-3 text-neu-text">
                priority = (impact_score / effort) × 100
              </div>
              <div className="space-y-2 text-sm">
                <div>
                  <strong className="text-neu-text">Impact Score:</strong>
                  <span className="text-neu-text-muted ml-2">Critical=100, High=75, Medium=50, Low=25</span>
                </div>
                <div>
                  <strong className="text-neu-text">Effort Multiplier:</strong>
                  <span className="text-neu-text-muted ml-2">Low=0.5, Medium=1.0, High=1.5</span>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-neu-shadow-light/30">
                <div className="text-xs font-medium text-neu-text mb-2">Impact Levels:</div>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 bg-neu-coral/15 text-neu-coral text-xs rounded border border-neu-coral/30">Critical</span>
                  <span className="px-2 py-1 bg-neu-orange/15 text-neu-orange text-xs rounded border border-neu-orange/30">High</span>
                  <span className="px-2 py-1 bg-yellow-500/15 text-yellow-400 text-xs rounded border border-yellow-500/30">Medium</span>
                  <span className="px-2 py-1 bg-neu-green/15 text-neu-green text-xs rounded border border-neu-green/30">Low</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bottlenecks */}
        <div className="neu-raised p-6">
          <h3 className="font-display text-lg font-semibold text-neu-text mb-4">Top Bottlenecks</h3>

          {severeBottlenecks.length > 0 ? (
            <div className="space-y-3">
              {severeBottlenecks.slice(0, 3).map((bottleneck) => (
                <div
                  key={bottleneck.node_id}
                  className="neu-inset p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-neu-text truncate">
                      {bottleneck.node_name}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      bottleneck.severity === 'severe'
                        ? 'bg-neu-coral/15 text-neu-coral'
                        : 'bg-neu-orange/15 text-neu-orange'
                    }`}>
                      {bottleneck.bottleneck_score}/100
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-neu-text-muted flex items-center gap-2">
                    <span>{formatDuration(bottleneck.total_duration_ms)}</span>
                    {bottleneck.is_on_critical_path && (
                      <span className="badge-error text-xs">Critical Path</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-neu-text-muted text-sm">No severe bottlenecks detected</p>
          )}
        </div>

        {/* Top Recommendation */}
        <div className="neu-raised p-6">
          <h3 className="font-display text-lg font-semibold text-neu-text mb-4">Top Recommendation</h3>

          {topRecommendation ? (
            <div
              className="neu-flat p-4 border border-neu-accent/20 cursor-pointer hover:shadow-neu-raised transition-all"
              onClick={() => onViewEvidence(topRecommendation)}
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-medium text-neu-text">{topRecommendation.title}</h4>
                <span className={`shrink-0 px-2 py-1 rounded text-xs font-medium ${
                  topRecommendation.impact === 'CRITICAL' ? 'bg-neu-coral/15 text-neu-coral border border-neu-coral/30' :
                  topRecommendation.impact === 'HIGH' ? 'bg-neu-orange/15 text-neu-orange border border-neu-orange/30' :
                  topRecommendation.impact === 'MEDIUM' ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30' :
                  'bg-neu-green/15 text-neu-green border border-neu-green/30'
                }`}>
                  {topRecommendation.impact}
                </span>
              </div>
              <p className="mt-2 text-sm text-neu-text-muted line-clamp-2">
                {topRecommendation.description}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-neu-text-muted">
                  Priority: {topRecommendation.priority_score}/100
                </span>
                {topRecommendation.time_saved_ms && (
                  <span className="text-xs text-neu-green">
                    Save {formatDuration(topRecommendation.time_saved_ms)}
                  </span>
                )}
              </div>
              <div className="mt-3 text-xs text-neu-accent">
                Click to view evidence and code example →
              </div>
            </div>
          ) : (
            <p className="text-neu-text-muted text-sm">No recommendations available</p>
          )}
        </div>
      </div>

      {/* Critical Path Summary */}
      <div className="neu-raised p-6">
        <h3 className="font-display text-lg font-semibold text-neu-text mb-5">Critical Path Summary</h3>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="text-sm text-neu-text-muted mb-2">Total Duration</div>
            <div className="text-3xl font-display font-bold text-neu-text">
              {formatDuration(criticalPath.summary.total_duration_ms)}
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-neu-text-muted mb-2">Path Coverage</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-neu-shadow-dark/30 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-neu-accent to-neu-accent-light h-3 rounded-full"
                  style={{ width: `${criticalPath.summary.path_percentage}%` }}
                />
              </div>
              <span className="text-lg font-medium text-neu-text">
                {criticalPath.summary.path_percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-neu-text-muted mb-2">Nodes</div>
            <div className="text-3xl font-display font-bold text-neu-text">
              {criticalPath.summary.node_count}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
