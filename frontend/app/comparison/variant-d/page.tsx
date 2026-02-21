'use client';

import { useState } from 'react';
import { comparisonData, formatDuration, formatPct } from '../data';

export default function VariantD() {
  const { before, after, delta, top_improvements } = comparisonData;
  const [expandedSections, setExpandedSections] = useState<string[]>(['top']);

  // Calculate bar widths (before is 100%, after is proportional)
  const afterWidth = (after.duration / before.duration) * 100;

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="space-y-8">
      {/* Timeline Visualization Bars */}
      <div className="neu-flat p-6">
        <div className="space-y-4">
          {/* Before Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Before</span>
              <span className="text-neu-coral font-bold">{formatDuration(before.duration)}</span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden bg-neu-bg">
              <div
                className="h-full rounded-lg"
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #f08b7a 0%, #f0956a 100%)',
                }}
              />
            </div>
          </div>

          {/* After Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">After</span>
              <span className="text-neu-green font-bold">{formatDuration(after.duration)}</span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden bg-neu-bg">
              <div
                className="h-full rounded-lg"
                style={{
                  width: `${afterWidth}%`,
                  background: 'linear-gradient(90deg, #4dc9b0 0%, #5ed4a0 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* BEFORE Card */}
        <div className="neu-flat p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="badge-error">Before</span>
            <span className="text-xs text-neu-text-muted">#{before.execution_id}</span>
          </div>

          {/* Huge Duration */}
          <div className="mb-8">
            <p className="text-7xl font-display font-bold text-neu-coral tracking-tight">
              {formatDuration(before.duration)}
            </p>
            <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Total Duration</p>
          </div>

          {/* Metrics with Icons */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Bottlenecks</span>
              <span className="text-neu-coral font-bold flex items-center gap-2">
                <span>🔴</span>
                {before.bottlenecks.total}
                <span className="text-xs font-normal text-neu-text-muted">({before.bottlenecks.severe} severe)</span>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Recommendations</span>
              <span className="text-neu-orange font-bold flex items-center gap-2">
                <span>⚠️</span>
                {before.recommendations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Nodes</span>
              <span className="text-neu-text font-medium">{before.node_count}</span>
            </div>
          </div>
        </div>

        {/* AFTER Card */}
        <div className="neu-flat p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="badge-success">After</span>
            <span className="text-xs text-neu-text-muted">#{after.execution_id}</span>
          </div>

          {/* Huge Duration */}
          <div className="mb-8">
            <p className="text-7xl font-display font-bold text-neu-green tracking-tight">
              {formatDuration(after.duration)}
            </p>
            <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Total Duration</p>
          </div>

          {/* Metrics with Icons */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Bottlenecks</span>
              <span className="text-neu-green font-bold flex items-center gap-2">
                <span>✅</span>
                {after.bottlenecks.total}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Recommendations</span>
              <span className="text-neu-green font-bold flex items-center gap-2">
                <span>✅</span>
                {after.recommendations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Nodes</span>
              <span className="text-neu-text font-medium">{after.node_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Big Delta Card */}
      <div
        className="card-neu border border-neu-green/30"
        style={{
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.3) 100%)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <p className="text-6xl font-display font-bold text-neu-green flex items-center gap-2">
                <span>⬇️</span>
                {formatPct(delta.pct_improvement)}
              </p>
              <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Improvement</p>
            </div>
            <div className="h-16 w-px bg-neu-green/20" />
            <div>
              <p className="text-3xl font-display font-bold text-neu-green flex items-center gap-2">
                <span>⏱️</span>
                {formatDuration(delta.duration_saved)}
              </p>
              <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Time Saved</p>
            </div>
            <div className="h-16 w-px bg-neu-green/20" />
            <div>
              <p className="text-3xl font-display font-bold text-neu-green flex items-center gap-2">
                <span>✅</span>
                {delta.bottlenecks_resolved}
              </p>
              <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Bottlenecks Fixed</p>
            </div>
          </div>
          <div className="badge-success text-base px-5 py-2.5 font-semibold">
            🎉 {delta.verdict}
          </div>
        </div>
      </div>

      {/* Expandable Node Breakdown */}
      <div className="space-y-3">
        {/* Top Improvements */}
        <div className="neu-flat overflow-hidden">
          <button
            onClick={() => toggleSection('top')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
          >
            <span className="font-display font-semibold text-neu-text flex items-center gap-2">
              <span>🚀</span>
              Top Improvements ({top_improvements.length})
            </span>
            <span className="text-neu-accent text-xl">
              {expandedSections.includes('top') ? '−' : '+'}
            </span>
          </button>
          {expandedSections.includes('top') && (
            <div className="px-4 pb-4 space-y-3">
              {top_improvements.map((node) => (
                <div
                  key={node.node_name}
                  className="p-4 rounded-lg bg-neu-bg border border-neu-text-muted/10 hover:border-neu-accent/30 hover:bg-neu-accent/5 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-mono text-neu-text">{node.node_name}</span>
                    <span className="text-neu-green font-bold text-lg flex items-center gap-1">
                      ⬇️ {formatPct(node.pct_improvement)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-neu-text-muted">Before</span>
                      <span className="text-neu-coral font-semibold">{formatDuration(node.before_duration)}</span>
                      {node.bottleneck_before > 0 && (
                        <span className="text-xs text-neu-coral">🔴 {node.bottleneck_before}</span>
                      )}
                    </div>
                    <span className="text-neu-text-muted">→</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-wide text-neu-text-muted">After</span>
                      <span className="text-neu-green font-semibold">{formatDuration(node.after_duration)}</span>
                      <span className="text-xs text-neu-green">✅</span>
                    </div>
                  </div>
                  <p className="text-xs text-neu-text-muted mt-2">
                    💡 {node.impact}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minor Improvements */}
        <div className="neu-flat overflow-hidden">
          <button
            onClick={() => toggleSection('minor')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
          >
            <span className="font-display font-semibold text-neu-text flex items-center gap-2">
              <span>📈</span>
              Minor Improvements (5)
            </span>
            <span className="text-neu-accent text-xl">
              {expandedSections.includes('minor') ? '−' : '+'}
            </span>
          </button>
          {expandedSections.includes('minor') && (
            <div className="px-4 pb-4">
              <p className="text-neu-text-muted text-sm italic">
                5 nodes with &lt;10% improvement (collapsed for prototype)
              </p>
            </div>
          )}
        </div>

        {/* Unchanged */}
        <div className="neu-flat overflow-hidden">
          <button
            onClick={() => toggleSection('unchanged')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
          >
            <span className="font-display font-semibold text-neu-text-muted flex items-center gap-2">
              <span>➖</span>
              Unchanged (64)
            </span>
            <span className="text-neu-text-muted text-xl">
              {expandedSections.includes('unchanged') ? '−' : '+'}
            </span>
          </button>
          {expandedSections.includes('unchanged') && (
            <div className="px-4 pb-4">
              <p className="text-neu-text-muted text-sm italic">
                64 nodes with no significant changes (collapsed for prototype)
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
