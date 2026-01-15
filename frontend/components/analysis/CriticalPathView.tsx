'use client';

/**
 * Critical Path View component
 * Shows detailed critical path analysis
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-1">Total Duration</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatDuration(summary.total_duration_ms)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-1">Nodes on Critical Path</div>
          <div className="text-2xl font-bold text-gray-900">
            {summary.node_count}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 mb-1">Path Percentage</div>
          <div className="text-2xl font-bold text-blue-600">
            {summary.path_percentage.toFixed(1)}%
          </div>
          <div className="mt-2 bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${summary.path_percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Critical Path Nodes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Critical Path Nodes</h2>

        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-red-200" />

          {/* Nodes */}
          <div className="space-y-4">
            {path_nodes.map((node, index) => (
              <div key={node.node_id} className="relative flex items-start gap-4 pl-8">
                {/* Timeline dot */}
                <div className="absolute left-2 w-5 h-5 bg-red-500 rounded-full border-4 border-red-100 -translate-x-1/2" />

                {/* Node content */}
                <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <span className="text-xs text-red-600 font-medium">
                        Step {index + 1}
                      </span>
                      <h3 className="font-medium text-gray-900">{node.node_name}</h3>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold text-red-700">
                        {formatDuration(node.duration_ms)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {((node.duration_ms / summary.total_duration_ms) * 100).toFixed(1)}% of path
                      </div>
                    </div>
                  </div>

                  {/* Duration bar */}
                  <div className="mt-3">
                    <div className="bg-red-100 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
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
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 bg-red-500 rounded-full" />
            <span>Critical path nodes - These nodes are blocking execution completion</span>
          </div>
        </div>
      </div>

      {/* Top Duration Nodes */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Slowest Nodes on Critical Path</h2>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase">
                  Node Name
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                  Duration
                </th>
                <th className="py-3 px-4 text-right text-xs font-medium text-gray-500 uppercase">
                  % of Path
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[...path_nodes]
                .sort((a, b) => b.duration_ms - a.duration_ms)
                .slice(0, 10)
                .map((node, index) => (
                  <tr key={node.node_id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-500">
                      #{index + 1}
                    </td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-900">
                      {node.node_name}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">
                      {formatDuration(node.duration_ms)}
                    </td>
                    <td className="py-3 px-4 text-sm text-right text-gray-500">
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
