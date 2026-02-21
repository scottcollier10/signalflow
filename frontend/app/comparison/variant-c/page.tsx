'use client';

import { useState } from 'react';
import { comparisonData, formatDuration, formatPct } from '../data';

export default function VariantC() {
  const { before, after, delta, top_improvements } = comparisonData;
  const [expandedSections, setExpandedSections] = useState<string[]>(['top']);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  return (
    <div className="space-y-6">
      {/* Comparison Table */}
      <div className="neu-flat p-6">
        <h2 className="font-display text-lg font-semibold text-neu-text mb-4">
          Performance Comparison
        </h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-neu-text-muted text-sm border-b border-neu-text-muted/20">
              <th className="pb-3 w-1/3">Metric</th>
              <th className="pb-3 w-1/4">Before</th>
              <th className="pb-3 w-1/4">After</th>
              <th className="pb-3 w-1/6 text-right">Change</th>
            </tr>
          </thead>
          <tbody className="text-neu-text">
            <tr className="border-b border-neu-text-muted/10">
              <td className="py-4 font-medium">Duration</td>
              <td className="py-4">
                <span className="text-neu-coral text-xl font-bold">{formatDuration(before.duration)}</span>
              </td>
              <td className="py-4">
                <span className="text-neu-green text-xl font-bold">{formatDuration(after.duration)}</span>
              </td>
              <td className="py-4 text-right">
                <span className="text-neu-green font-semibold">⬇️ -{formatPct(delta.pct_improvement)}</span>
              </td>
            </tr>
            <tr className="border-b border-neu-text-muted/10">
              <td className="py-4 font-medium">Bottlenecks</td>
              <td className="py-4">
                <span className="text-neu-coral">{before.bottlenecks.total}</span>
                <span className="text-neu-text-muted text-sm ml-1">({before.bottlenecks.severe} severe)</span>
              </td>
              <td className="py-4">
                <span className="text-neu-green">{after.bottlenecks.total}</span>
              </td>
              <td className="py-4 text-right">
                <span className="badge-success">✅ All resolved</span>
              </td>
            </tr>
            <tr className="border-b border-neu-text-muted/10">
              <td className="py-4 font-medium">Recommendations</td>
              <td className="py-4 text-neu-orange">{before.recommendations}</td>
              <td className="py-4 text-neu-green">{after.recommendations}</td>
              <td className="py-4 text-right">
                <span className="text-neu-green">✓</span>
              </td>
            </tr>
            <tr className="border-b border-neu-text-muted/10">
              <td className="py-4 font-medium">Critical Path</td>
              <td className="py-4 text-neu-coral">{formatDuration(before.critical_path.duration)} ({before.critical_path.coverage}%)</td>
              <td className="py-4 text-neu-green">{formatDuration(after.critical_path.duration)}</td>
              <td className="py-4 text-right">
                <span className="text-neu-green font-semibold">⬇️ -{formatPct(delta.pct_improvement)}</span>
              </td>
            </tr>
            <tr>
              <td className="py-4 font-medium">Node Count</td>
              <td className="py-4">{before.node_count}</td>
              <td className="py-4">{after.node_count}</td>
              <td className="py-4 text-right">
                <span className="text-neu-text-muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Verdict Card */}
      <div className="card-neu bg-gradient-to-r from-neu-green/10 to-neu-teal/10 border border-neu-green/20">
        <div className="flex items-center gap-4">
          <span className="text-4xl">✅</span>
          <div>
            <p className="text-xl font-display font-bold text-neu-green">{delta.verdict}</p>
            <p className="text-neu-text-muted">
              {formatPct(delta.pct_improvement)} improvement with zero regressions.
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-3">
        {/* Top Improvements */}
        <div className="neu-flat overflow-hidden">
          <button
            onClick={() => toggleSection('top')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
          >
            <span className="font-display font-semibold text-neu-text">
              Top Improvements ({top_improvements.length})
            </span>
            <span className="text-neu-text-muted">
              {expandedSections.includes('top') ? '▼' : '▶'}
            </span>
          </button>
          {expandedSections.includes('top') && (
            <div className="px-4 pb-4 space-y-3">
              {top_improvements.map((node) => (
                <div key={node.node_name} className="p-4 rounded-lg bg-neu-bg border border-neu-text-muted/10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-neu-text">{node.node_name}</span>
                    <span className="text-neu-green font-bold">-{formatPct(node.pct_improvement)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neu-text-muted">Before:</span>
                    <span className="text-neu-coral">{formatDuration(node.before_duration)}</span>
                    {node.bottleneck_before > 0 && (
                      <span className="badge-error text-xs">Score: {node.bottleneck_before}</span>
                    )}
                    <span className="text-neu-text-muted mx-2">|</span>
                    <span className="text-neu-text-muted">After:</span>
                    <span className="text-neu-green">{formatDuration(node.after_duration)}</span>
                  </div>
                  <p className="text-sm text-neu-text-muted mt-2">
                    Saved: {formatDuration(node.saved)} • {node.impact}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Minor Improvements (placeholder) */}
        <div className="neu-flat overflow-hidden">
          <button
            onClick={() => toggleSection('minor')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
          >
            <span className="font-display font-semibold text-neu-text">
              Minor Improvements (5)
            </span>
            <span className="text-neu-text-muted">
              {expandedSections.includes('minor') ? '▼' : '▶'}
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

        {/* Unchanged (placeholder) */}
        <div className="neu-flat overflow-hidden">
          <button
            onClick={() => toggleSection('unchanged')}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
          >
            <span className="font-display font-semibold text-neu-text-muted">
              Unchanged (64)
            </span>
            <span className="text-neu-text-muted">
              {expandedSections.includes('unchanged') ? '▼' : '▶'}
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
