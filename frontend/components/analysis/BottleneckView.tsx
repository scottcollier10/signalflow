'use client';

/**
 * Bottleneck View component
 * Shows detailed bottleneck analysis with severity color coding
 */

import { BottlenecksResponse, Bottleneck, formatDuration, getSeverityColors } from '@/lib/api/analysis';

interface BottleneckViewProps {
  data: BottlenecksResponse;
}

export function BottleneckView({ data }: BottleneckViewProps) {
  const { bottlenecks, summary } = data;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SeverityCard
          severity="severe"
          count={summary.bottlenecks_by_severity.severe}
          label="Severe"
        />
        <SeverityCard
          severity="high"
          count={summary.bottlenecks_by_severity.high}
          label="High"
        />
        <SeverityCard
          severity="medium"
          count={summary.bottlenecks_by_severity.medium}
          label="Medium"
        />
        <SeverityCard
          severity="low"
          count={summary.bottlenecks_by_severity.low}
          label="Low"
        />
      </div>

      {/* Bottleneck Cards */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Detected Bottlenecks</h2>
          <div className="text-sm text-gray-500">
            {summary.total_nodes_analyzed} nodes analyzed
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bottlenecks.map((bottleneck) => (
            <BottleneckCard key={bottleneck.node_id} bottleneck={bottleneck} />
          ))}
        </div>

        {bottlenecks.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No bottlenecks detected</p>
          </div>
        )}
      </div>

      {/* Bottleneck Factors Breakdown */}
      {bottlenecks.length > 0 && (
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
                {bottlenecks.slice(0, 10).map((bottleneck) => {
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
}: {
  severity: string;
  count: number;
  label: string;
}) {
  const colors = getSeverityColors(severity);

  return (
    <div className={`${colors.bg} ${colors.border} border-2 rounded-lg p-4`}>
      <div className={`text-2xl font-bold ${colors.text}`}>{count}</div>
      <div className={`text-sm ${colors.text}`}>{label}</div>
    </div>
  );
}

function BottleneckCard({ bottleneck }: { bottleneck: Bottleneck }) {
  const colors = getSeverityColors(bottleneck.severity);

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
