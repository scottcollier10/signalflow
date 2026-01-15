'use client';

/**
 * Error Clusters Section component
 * Shows error analysis and clustering results
 */

import { ErrorAnalysisResponse, ErrorCluster, getSeverityColors } from '@/lib/api/analysis';

interface ErrorClustersSectionProps {
  data: ErrorAnalysisResponse;
}

export function ErrorClustersSection({ data }: ErrorClustersSectionProps) {
  const { clusters, summary } = data;

  // No errors state
  if (summary.total_errors === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-green-500 mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Clean Execution</h2>
        <p className="text-gray-500">No errors were detected in this execution.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-red-700">{summary.total_errors}</div>
          <div className="text-sm text-red-600">Total Errors</div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-orange-700">{summary.total_clusters}</div>
          <div className="text-sm text-orange-600">Error Clusters</div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="text-3xl font-bold text-red-700">{summary.critical_count}</div>
          <div className="text-sm text-red-600">Critical Errors</div>
        </div>
      </div>

      {/* Error Clusters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Clusters</h2>

        <div className="space-y-4">
          {clusters.map((cluster) => (
            <ErrorClusterCard key={cluster.cluster_id} cluster={cluster} />
          ))}
        </div>
      </div>

      {/* Pattern Distribution */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Error Patterns</h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {getPatternCounts(clusters).map(({ pattern, count, color }) => (
            <div key={pattern} className={`p-4 rounded-lg ${color}`}>
              <div className="text-2xl font-bold">{count}</div>
              <div className="text-sm capitalize">{pattern.replace('_', ' ')}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorClusterCard({ cluster }: { cluster: ErrorCluster }) {
  const colors = getSeverityColors(cluster.severity);
  const patternIcon = getPatternIcon(cluster.pattern);

  return (
    <div className={`p-4 rounded-lg border-2 ${colors.bg} ${colors.border}`}>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Icon and pattern */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${colors.badge} flex items-center justify-center text-lg`}>
            {patternIcon}
          </div>
          <div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors.badge}`}>
              {cluster.severity.toUpperCase()}
            </span>
            <div className="mt-1 text-sm font-medium text-gray-700 capitalize">
              {cluster.pattern.replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Error details */}
        <div className="flex-1">
          <div className="text-lg font-semibold text-gray-900">
            {cluster.error_count} error{cluster.error_count !== 1 ? 's' : ''}
          </div>

          <div className="mt-2 p-3 bg-white rounded border border-gray-200">
            <div className="text-xs text-gray-500 mb-1">Sample Message:</div>
            <code className="text-sm text-gray-800 font-mono break-all">
              {cluster.sample_message}
            </code>
          </div>

          {cluster.affected_nodes.length > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              Affects {cluster.affected_nodes.length} node{cluster.affected_nodes.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Similarity score */}
        <div className="text-right">
          <div className="text-xs text-gray-500">Similarity</div>
          <div className="text-lg font-semibold text-gray-700">
            {(cluster.avg_similarity * 100).toFixed(0)}%
          </div>
        </div>
      </div>
    </div>
  );
}

function getPatternIcon(pattern: string): string {
  const icons: Record<string, string> = {
    timeout: '⏱',
    auth_failure: '🔐',
    rate_limit: '🚦',
    network: '🌐',
    validation: '✓',
    unknown: '?',
  };
  return icons[pattern] || '?';
}

function getPatternCounts(clusters: ErrorCluster[]) {
  const counts: Record<string, number> = {};
  clusters.forEach((c) => {
    counts[c.pattern] = (counts[c.pattern] || 0) + c.error_count;
  });

  const colors: Record<string, string> = {
    timeout: 'bg-yellow-50 text-yellow-700',
    auth_failure: 'bg-red-50 text-red-700',
    rate_limit: 'bg-orange-50 text-orange-700',
    network: 'bg-blue-50 text-blue-700',
    validation: 'bg-purple-50 text-purple-700',
    unknown: 'bg-gray-50 text-gray-700',
  };

  return Object.entries(counts).map(([pattern, count]) => ({
    pattern,
    count,
    color: colors[pattern] || 'bg-gray-50 text-gray-700',
  }));
}
