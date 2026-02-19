'use client';

/**
 * Bottleneck View component
 * Shows detailed bottleneck analysis with neumorphic design
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
  const [activeFilter, setActiveFilter] = useState<SeverityFilter>('all');
  const [showScoringInfo, setShowScoringInfo] = useState(false);

  // Handle "View Fix" button click
  const handleViewFix = (nodeName: string) => {
    if (onNodeFilter) {
      onNodeFilter(nodeName);
    }
    if (onTabChange) {
      onTabChange('recommendations');
    }
  };

  // Calculate counts
  const severityCounts = {
    all: bottlenecks.length,
    severe: bottlenecks.filter(b => b.severity === 'severe').length,
    high: bottlenecks.filter(b => b.severity === 'high').length,
    medium: bottlenecks.filter(b => b.severity === 'medium').length,
    low: bottlenecks.filter(b => b.severity === 'low').length,
  };

  const filteredBottlenecks = activeFilter === 'all'
    ? bottlenecks
    : bottlenecks.filter(b => b.severity === activeFilter);

  const getTabCount = (severity: SeverityFilter) => severityCounts[severity];

  return (
    <div className="space-y-6">
      {/* Summary Cards - Clickable to filter */}
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
            colorStyles = severity === 'all' ? 'bg-neu-text text-neu-bg' :
                         severity === 'severe' ? 'bg-neu-coral text-white' :
                         severity === 'high' ? 'bg-neu-orange text-white' :
                         severity === 'medium' ? 'bg-yellow-500 text-white' :
                         'bg-neu-green text-white';
          } else {
            colorStyles = severity === 'all' ? 'bg-neu-shadow-light/20 text-neu-text hover:bg-neu-shadow-light/30' :
                         severity === 'severe' ? 'bg-neu-coral/15 text-neu-coral hover:bg-neu-coral/25' :
                         severity === 'high' ? 'bg-neu-orange/15 text-neu-orange hover:bg-neu-orange/25' :
                         severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400 hover:bg-yellow-500/25' :
                         'bg-neu-green/15 text-neu-green hover:bg-neu-green/25';
          }

          return (
            <button
              key={severity}
              onClick={() => setActiveFilter(severity)}
              className={`${baseStyles} ${colorStyles}`}
            >
              {severity.charAt(0).toUpperCase() + severity.slice(1)}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                isActive ? 'bg-white/20' : 'bg-neu-shadow-dark/30'
              }`}>
                {count}
              </span>
            </button>
          );
        })}

        {/* Scoring Info Toggle */}
        <button
          onClick={() => setShowScoringInfo(!showScoringInfo)}
          className="ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-neu-text-muted hover:text-neu-accent rounded-lg transition-colors"
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
        <div className="neu-flat p-4 border border-neu-teal/20">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-neu-teal/15 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-neu-teal" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-neu-text mb-2">Bottleneck Score Formula</h4>
              <p className="text-sm text-neu-text-muted mb-3">
                Each bottleneck score (0-100) is calculated using 4 weighted factors:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="neu-inset p-3">
                  <div className="font-medium text-neu-text">Duration (40%)</div>
                  <div className="text-neu-text-muted text-xs mt-1">How long the node takes relative to the workflow</div>
                </div>
                <div className="neu-inset p-3">
                  <div className="font-medium text-neu-text">Criticality (30%)</div>
                  <div className="text-neu-text-muted text-xs mt-1">Position impact—nodes on critical path score higher</div>
                </div>
                <div className="neu-inset p-3">
                  <div className="font-medium text-neu-text">Frequency (20%)</div>
                  <div className="text-neu-text-muted text-xs mt-1">How often the node executes (loops increase score)</div>
                </div>
                <div className="neu-inset p-3">
                  <div className="font-medium text-neu-text">Variance (10%)</div>
                  <div className="text-neu-text-muted text-xs mt-1">Inconsistent execution times indicate problems</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-neu-shadow-light/30">
                <div className="text-sm text-neu-text font-medium mb-2">Severity Thresholds:</div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-neu-coral/15 text-neu-coral rounded">Severe: 90-100</span>
                  <span className="px-2 py-1 bg-neu-orange/15 text-neu-orange rounded">High: 70-89</span>
                  <span className="px-2 py-1 bg-yellow-500/15 text-yellow-400 rounded">Medium: 50-69</span>
                  <span className="px-2 py-1 bg-neu-green/15 text-neu-green rounded">Low: 0-49</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowScoringInfo(false)}
              className="text-neu-text-muted hover:text-neu-text transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Bottleneck Cards */}
      <div className="neu-raised p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
          <h2 className="font-display text-lg font-semibold text-neu-text">
            {activeFilter === 'all' ? 'All Bottlenecks' : `${activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)} Severity Bottlenecks`}
          </h2>
          <div className="text-sm text-neu-text-muted">
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
            <p className="text-neu-text-muted">
              {activeFilter === 'all'
                ? 'No bottlenecks detected'
                : `No ${activeFilter} severity bottlenecks found`}
            </p>
            {activeFilter !== 'all' && (
              <button
                onClick={() => setActiveFilter('all')}
                className="mt-2 text-sm text-neu-accent hover:text-neu-accent-light"
              >
                View all bottlenecks
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottleneck Factors Breakdown */}
      {filteredBottlenecks.length > 0 && (
        <div className="neu-raised p-6">
          <h2 className="font-display text-lg font-semibold text-neu-text mb-5">Bottleneck Analysis Details</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-neu-shadow-light/30">
                  <th className="py-3 px-4 text-left text-xs font-medium text-neu-text-muted uppercase">
                    Node
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-neu-text-muted uppercase">
                    Score
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-neu-text-muted uppercase">
                    Duration
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-neu-text-muted uppercase">
                    Position
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-neu-text-muted uppercase">
                    Frequency
                  </th>
                  <th className="py-3 px-4 text-center text-xs font-medium text-neu-text-muted uppercase">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neu-shadow-light/20">
                {filteredBottlenecks.slice(0, 10).map((bottleneck) => (
                  <tr key={bottleneck.node_id} className="hover:bg-neu-shadow-light/10 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-neu-text truncate max-w-[200px]">
                          {bottleneck.node_name}
                        </span>
                        {bottleneck.is_on_critical_path && (
                          <span className="px-1.5 py-0.5 bg-neu-coral/15 text-neu-coral text-xs rounded">
                            CP
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        bottleneck.severity === 'severe' ? 'bg-neu-coral/15 text-neu-coral' :
                        bottleneck.severity === 'high' ? 'bg-neu-orange/15 text-neu-orange' :
                        bottleneck.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-neu-green/15 text-neu-green'
                      }`}>
                        {bottleneck.bottleneck_score}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-neu-text-muted">
                      {(bottleneck.factors.duration_factor * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-neu-text-muted">
                      {(bottleneck.factors.position_factor * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-neu-text-muted">
                      {(bottleneck.factors.frequency_factor * 100).toFixed(0)}%
                    </td>
                    <td className="py-3 px-4 text-center text-sm text-neu-text-muted">
                      {(bottleneck.factors.variance_factor * 100).toFixed(0)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="neu-flat p-6">
        <h3 className="font-medium text-neu-text mb-3">Understanding Bottleneck Scores</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-neu-text-muted">
          <div>
            <strong className="text-neu-text">Duration Factor:</strong> How long the node takes relative to others
          </div>
          <div>
            <strong className="text-neu-text">Position Factor:</strong> Impact based on node position in the workflow
          </div>
          <div>
            <strong className="text-neu-text">Frequency Factor:</strong> How often the node is executed
          </div>
          <div>
            <strong className="text-neu-text">Variance Factor:</strong> Consistency of execution time
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
  const colorClasses = {
    severe: 'text-neu-coral bg-neu-coral/10 border-neu-coral/30',
    high: 'text-neu-orange bg-neu-orange/10 border-neu-orange/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    low: 'text-neu-green bg-neu-green/10 border-neu-green/30',
  }[severity] || 'text-neu-text bg-neu-shadow-light/20 border-neu-shadow-light/30';

  return (
    <button
      onClick={onClick}
      className={`
        ${colorClasses} border-2 rounded-neu-lg p-4 text-left w-full
        transition-all hover:scale-105 cursor-pointer
        ${isActive ? 'ring-2 ring-offset-2 ring-offset-neu-bg ring-neu-accent scale-105' : ''}
      `}
    >
      <div className="text-2xl font-display font-bold">{count}</div>
      <div className="text-sm flex items-center gap-1">
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
  return (
    <div className={`neu-inset p-4 border-l-4 ${
      bottleneck.severity === 'severe' ? 'border-neu-coral' :
      bottleneck.severity === 'high' ? 'border-neu-orange' :
      bottleneck.severity === 'medium' ? 'border-yellow-500' :
      'border-neu-green'
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-neu-text truncate">{bottleneck.node_name}</h3>
          </div>
          <p className="text-xs text-neu-text-muted mt-0.5">{bottleneck.node_type}</p>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
          bottleneck.severity === 'severe' ? 'bg-neu-coral/15 text-neu-coral' :
          bottleneck.severity === 'high' ? 'bg-neu-orange/15 text-neu-orange' :
          bottleneck.severity === 'medium' ? 'bg-yellow-500/15 text-yellow-400' :
          'bg-neu-green/15 text-neu-green'
        }`}>
          {bottleneck.bottleneck_score}/100
        </span>
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-neu-text-muted">Duration</span>
          <span className="font-medium text-neu-text">{formatDuration(bottleneck.total_duration_ms)}</span>
        </div>

        {/* Score bar */}
        <div className="bg-neu-shadow-dark/30 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              bottleneck.severity === 'severe' ? 'bg-neu-coral' :
              bottleneck.severity === 'high' ? 'bg-neu-orange' :
              bottleneck.severity === 'medium' ? 'bg-yellow-500' :
              'bg-neu-green'
            }`}
            style={{ width: `${bottleneck.bottleneck_score}%` }}
          />
        </div>
      </div>

      {/* View Fix Button */}
      {onViewFix && (
        <div className="mt-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewFix();
            }}
            className="w-full btn-primary text-sm flex items-center justify-center gap-2"
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
        <div className="mt-3 pt-3 border-t border-neu-shadow-light/30">
          <span className="badge-error text-xs">
            On Critical Path
          </span>
        </div>
      )}
    </div>
  );
}
