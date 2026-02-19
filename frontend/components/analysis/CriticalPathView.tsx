'use client';

/**
 * Critical Path View component
 * Shows detailed critical path analysis with neumorphic design
 */

import { CriticalPathResponse, formatDuration } from '@/lib/api/analysis';

interface CriticalPathViewProps {
  data: CriticalPathResponse;
}

export function CriticalPathView({ data }: CriticalPathViewProps) {
  const { path_nodes, summary } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-metric">
          <div className="text-sm text-neu-text-muted mb-1">Total Duration</div>
          <div className="text-2xl font-display font-bold text-neu-text">
            {formatDuration(summary.total_duration_ms)}
          </div>
        </div>

        <div className="card-metric">
          <div className="text-sm text-neu-text-muted mb-1">Nodes on Critical Path</div>
          <div className="text-2xl font-display font-bold text-neu-text">
            {summary.node_count}
          </div>
        </div>

        <div className="card-metric">
          <div className="text-sm text-neu-text-muted mb-1">Path Percentage</div>
          <div className="text-2xl font-display font-bold text-neu-teal">
            {summary.path_percentage.toFixed(1)}%
          </div>
          <div className="mt-2 bg-neu-shadow-dark/30 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-neu-accent to-neu-accent-light h-2 rounded-full"
              style={{ width: `${summary.path_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Critical Path Nodes */}
      <div className="neu-raised p-6">
        <h2 className="font-display text-lg font-semibold text-neu-text mb-5">Critical Path Nodes</h2>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-neu-coral/30" />

          {/* Nodes */}
          <div className="space-y-4">
            {path_nodes.map((node, index) => (
              <div key={node.node_id} className="relative flex items-start gap-4 pl-8">
                {/* Timeline dot */}
                <div className="absolute left-2 w-5 h-5 bg-neu-coral rounded-full border-4 border-neu-coral/20 -translate-x-1/2" />

                {/* Node content */}
                <div className="flex-1 neu-inset p-4 border-l-4 border-neu-coral">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs text-neu-coral font-medium">
                        Step {index + 1}
                      </span>
                      <h3 className="font-medium text-neu-text">{node.node_name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-display font-semibold text-neu-coral">
                        {formatDuration(node.duration_ms)}
                      </div>
                      <div className="text-xs text-neu-text-muted">
                        {((node.duration_ms / summary.total_duration_ms) * 100).toFixed(1)}% of path
                      </div>
                    </div>
                  </div>

                  {/* Duration bar */}
                  <div className="mt-3">
                    <div className="bg-neu-shadow-dark/30 rounded-full h-2">
                      <div
                        className="bg-neu-coral h-2 rounded-full"
                        style={{ width: `${(node.duration_ms / summary.total_duration_ms) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-neu-shadow-light/30">
          <div className="flex items-center gap-2 text-sm text-neu-text-muted">
            <div className="w-4 h-4 bg-neu-coral rounded-full" />
            <span>Critical path nodes - These nodes are blocking execution completion</span>
          </div>
        </div>
      </div>

      {/* Top Duration Nodes */}
      <div className="neu-raised p-6">
        <h2 className="font-display text-lg font-semibold text-neu-text mb-5">Slowest Nodes on Critical Path</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-neu-shadow-light/30">
                <th className="py-3 px-4 text-left text-xs font-medium text-neu-text-muted uppercase">
                  Rank
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-neu-text-muted uppercase">
                  Node Name
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-neu-text-muted uppercase">
                  Duration
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-neu-text-muted uppercase">
                  % of Path
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neu-shadow-light/20">
              {[...path_nodes]
                .sort((a, b) => b.duration_ms - a.duration_ms)
                .slice(0, 10)
                .map((node, index) => (
                  <tr key={node.node_id} className="hover:bg-neu-shadow-light/10 transition-colors">
                    <td className="py-3 px-4 text-sm text-neu-text-muted">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-neu-text">
                      {node.node_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-neu-text">
                      {formatDuration(node.duration_ms)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-neu-text-muted">
                      {((node.duration_ms / summary.total_duration_ms) * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
