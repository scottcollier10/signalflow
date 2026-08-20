'use client';

/**
 * Error Clusters Section component
 * Shows error analysis and clustering results with flat dark theme
 */

import { ErrorAnalysisResponse, ErrorCluster } from '@/lib/api/analysis';

interface ErrorClustersSectionProps {
  data: ErrorAnalysisResponse;
}

export function ErrorClustersSection({ data }: ErrorClustersSectionProps) {
  const { clusters, summary } = data;

  // No errors state
  if (!summary || summary.total_errors === 0) {
    return (
      <div className="neu-flat p-12 text-center">
        <div className="text-neu-green mb-4">
          <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-neu-text mb-2">Clean Execution</h2>
        <p className="text-neu-text-muted font-body">No errors were detected in this execution.</p>
      </div>
    );
  }

  // Ensure clusters is an array
  const clusterList = Array.isArray(clusters) ? clusters : [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-metric border-l-4 border-neu-coral">
          <div className="text-3xl font-display font-bold text-neu-coral">{summary.total_errors || 0}</div>
          <div className="text-sm text-neu-text-muted">Total Errors</div>
        </div>

        <div className="card-metric border-l-4 border-neu-orange">
          <div className="text-3xl font-display font-bold text-neu-orange">{summary.total_clusters || 0}</div>
          <div className="text-sm text-neu-text-muted">Error Clusters</div>
        </div>

        <div className="card-metric border-l-4 border-neu-coral">
          <div className="text-3xl font-display font-bold text-neu-coral">{summary.critical_count || 0}</div>
          <div className="text-sm text-neu-text-muted">Critical Errors</div>
        </div>
      </div>

      {/* Error Clusters */}
      {clusterList.length > 0 && (
        <div className="neu-raised p-6">
          <h2 className="font-display text-lg font-semibold text-neu-text mb-5">Error Clusters</h2>

          <div className="space-y-4">
            {clusterList.map((cluster, index) => (
              <ErrorClusterCard
                key={cluster?.cluster_id || `cluster-${index}`}
                cluster={cluster}
              />
            ))}
          </div>
        </div>
      )}

      {/* Pattern Distribution */}
      {clusterList.length > 0 && (
        <div className="neu-raised p-6">
          <h2 className="font-display text-lg font-semibold text-neu-text mb-5">Error Patterns</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {getPatternCounts(clusterList).map(({ pattern, count, bgColor, textColor }) => (
              <div key={pattern || 'unknown'} className={`neu-inset p-4 ${bgColor}`}>
                <div className={`text-2xl font-display font-bold ${textColor}`}>{count}</div>
                <div className="text-sm text-neu-text-muted capitalize">{formatPattern(pattern)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorClusterCard({ cluster }: { cluster: ErrorCluster }) {
  // Guard against undefined cluster
  if (!cluster) {
    return null;
  }

  const severity = cluster.severity || 'medium';
  const pattern = cluster.pattern || 'unknown';
  const colors = getSeverityColors(severity);
  const patternIcon = getPatternIcon(pattern);

  return (
    <div className={`neu-inset p-4 border-l-4 ${colors.border}`}>
      <div className="flex flex-col md:flex-row md:items-start gap-4">
        {/* Icon and pattern */}
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full ${colors.iconBg} flex items-center justify-center text-lg`}>
            {patternIcon}
          </div>
          <div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${colors.badge}`}>
              {severity.toUpperCase()}
            </span>
            <div className="mt-1 text-sm font-medium text-neu-text capitalize">
              {formatPattern(pattern)}
            </div>
          </div>
        </div>

        {/* Error details */}
        <div className="flex-1">
          <div className="text-lg font-display font-semibold text-neu-text">
            {cluster.error_count || 0} error{(cluster.error_count || 0) !== 1 ? 's' : ''}
          </div>

          {cluster.sample_message && (
            <div className="mt-2 p-3 bg-black/10 rounded border border-neu-border/50">
              <div className="text-xs text-neu-text-muted mb-1">Sample Message:</div>
              <code className="text-sm text-neu-coral font-mono break-all">
                {cluster.sample_message}
              </code>
            </div>
          )}

          {cluster.affected_nodes && cluster.affected_nodes.length > 0 && (
            <div className="mt-3 text-xs text-neu-text-muted">
              Affects {cluster.affected_nodes.length} node{cluster.affected_nodes.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Similarity score */}
        {typeof cluster.avg_similarity === 'number' && (
          <div className="text-right">
            <div className="text-xs text-neu-text-muted">Similarity</div>
            <div className="text-lg font-display font-semibold text-neu-text">
              {(cluster.avg_similarity * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getSeverityColors(severity: string) {
  const colors: Record<string, { border: string; iconBg: string; badge: string }> = {
    critical: {
      border: 'border-neu-coral',
      iconBg: 'bg-neu-coral/20',
      badge: 'bg-neu-coral/15 text-neu-coral',
    },
    high: {
      border: 'border-neu-orange',
      iconBg: 'bg-neu-orange/20',
      badge: 'bg-neu-orange/15 text-neu-orange',
    },
    medium: {
      border: 'border-neu-yellow',
      iconBg: 'bg-neu-yellow/20',
      badge: 'bg-neu-yellow/15 text-neu-yellow',
    },
    low: {
      border: 'border-neu-teal',
      iconBg: 'bg-neu-teal/20',
      badge: 'bg-neu-teal/15 text-neu-teal',
    },
  };
  return colors[severity] || colors.medium;
}

function formatPattern(pattern: string | undefined | null): string {
  if (!pattern) return 'Unknown';
  return pattern.replace(/_/g, ' ');
}

function getPatternIcon(pattern: string | undefined | null): string {
  if (!pattern) return '?';
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
    if (c && c.pattern) {
      counts[c.pattern] = (counts[c.pattern] || 0) + (c.error_count || 0);
    }
  });

  const colors: Record<string, { bgColor: string; textColor: string }> = {
    timeout: { bgColor: 'bg-neu-yellow/10', textColor: 'text-neu-yellow' },
    auth_failure: { bgColor: 'bg-neu-coral/10', textColor: 'text-neu-coral' },
    rate_limit: { bgColor: 'bg-neu-orange/10', textColor: 'text-neu-orange' },
    network: { bgColor: 'bg-neu-teal/10', textColor: 'text-neu-teal' },
    validation: { bgColor: 'bg-neu-accent/10', textColor: 'text-neu-accent' },
    unknown: { bgColor: 'bg-white/5', textColor: 'text-neu-text-muted' },
  };

  return Object.entries(counts).map(([pattern, count]) => ({
    pattern,
    count,
    ...(colors[pattern] || colors.unknown),
  }));
}
