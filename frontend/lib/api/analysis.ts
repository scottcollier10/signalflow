/**
 * Analysis API client
 * Fetches critical path, bottlenecks, error analysis, and recommendations
 */

// Types
export interface CriticalPathNode {
  node_id: string;
  node_name: string;
  node_type: string;
  duration_ms: number;
  cumulative_duration_ms?: number;
  is_bottleneck?: boolean;
  status?: string;
}

export interface CriticalPathResponse {
  path_nodes: CriticalPathNode[];
  summary: {
    total_duration_ms: number;
    node_count: number;
    path_percentage: number;
    contains_error?: boolean;
  };
}

export interface Bottleneck {
  node_id: string;
  node_name: string;
  node_type: string;
  bottleneck_score: number;
  total_duration_ms: number;
  is_on_critical_path: boolean;
  severity: 'low' | 'medium' | 'high' | 'severe';
  factors: {
    duration_factor: number;
    position_factor: number;
    frequency_factor: number;
    variance_factor: number;
  };
}

export interface OptimizationVerdict {
  status: 'well_optimized' | 'minor_improvements' | 'needs_optimization' | 'critical';
  message: string;
  color: 'green' | 'yellow' | 'red';
  stats: {
    total_duration_s: number;
    severe_count: number;
    high_count: number;
    medium_count: number;
    high_impact_count: number;
  };
}

export interface BottlenecksResponse {
  bottlenecks: Bottleneck[];
  summary: {
    total_nodes_analyzed: number;
    bottlenecks_by_severity: {
      severe: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  verdict?: OptimizationVerdict;
}

export interface Evidence {
  type: 'bottleneck' | 'critical_path' | 'error_cluster' | 'error_pattern';
  description: string;
  data: Record<string, unknown>;
  link: string;
}

export interface Recommendation {
  id: string;
  rule_id: number;
  title: string;
  description: string;
  evidence: Evidence[];
  impact: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  impact_details: string;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  priority_score: number;
  category: 'performance' | 'reliability';
  code_example: string | null;
  affected_node_ids: string[];
  time_saved_ms?: number;
  error_count?: number;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  summary: {
    total_recommendations: number;
    by_category: Record<string, number>;
    by_impact: Record<string, number>;
    top_priority: Recommendation | null;
  };
}

export interface ErrorCluster {
  cluster_id: string;
  error_count: number;
  pattern: 'timeout' | 'auth_failure' | 'rate_limit' | 'network' | 'validation' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  avg_similarity: number;
  sample_message: string;
  affected_nodes: string[];
}

export interface ErrorAnalysisResponse {
  clusters: ErrorCluster[];
  summary: {
    total_errors: number;
    total_clusters: number;
    critical_count: number;
  };
}

export interface AnalysisData {
  criticalPath: CriticalPathResponse;
  bottlenecks: BottlenecksResponse;
  errors: ErrorAnalysisResponse;
  recommendations: RecommendationsResponse;
}

// API Response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Raw API response types (what backend actually returns)
interface RawCriticalPathData {
  critical_path: Array<{
    node_id: string;
    node_name: string;
    node_type: string;
    duration_ms: number;
    cumulative_duration_ms: number;
    is_bottleneck: boolean;
    status: string;
  }>;
  summary: {
    total_nodes: number;
    critical_path_nodes: number;
    total_duration_ms: number;
    critical_path_percentage: number;
  };
}

interface RawBottleneckData {
  bottlenecks: Array<{
    rank: number;
    node_id: string;
    node_name: string;
    node_type: string;
    score: number;
    severity: string;
    on_critical_path: boolean;
    duration_ms: number;
    execution_count: number;
    percentage_of_total: number;
    factors: {
      duration: number;
      position: number;
      frequency: number;
      variance: number;
    };
  }>;
  summary: {
    total_nodes_analyzed: number;
    severe_bottlenecks: number;
    high_bottlenecks: number;
    medium_bottlenecks: number;
    low_bottlenecks: number;
  };
  verdict?: {
    status: string;
    message: string;
    color: string;
    stats: {
      total_duration_s: number;
      severe_count: number;
      high_count: number;
      medium_count: number;
      high_impact_count: number;
    };
  };
}

interface RawRecommendationData {
  recommendations: Recommendation[];
  summary: {
    total: number;
    by_category: Record<string, number>;
    by_impact: Record<string, number>;
  };
}

interface RawErrorData {
  clusters: ErrorCluster[];
  summary: {
    total_errors: number;
    clustered_errors: number;
    unclustered_errors: number;
    unique_patterns: number;
    critical_patterns: number;
    high_patterns: number;
    medium_patterns: number;
    low_patterns: number;
  };
}

// Fetch functions with response transformation
export async function fetchCriticalPath(
  apiBaseUrl: string,
  workflowId: string,
  executionId: string
): Promise<CriticalPathResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workflows/${workflowId}/executions/${executionId}/critical-path`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch critical path: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<RawCriticalPathData> = await response.json();

  if (!apiResponse.success || !apiResponse.data) {
    throw new Error('Invalid critical path response');
  }

  const { critical_path, summary } = apiResponse.data;

  // Calculate total duration from path nodes
  const totalDuration = critical_path.reduce((sum, node) => sum + node.duration_ms, 0);

  return {
    path_nodes: critical_path.map(node => ({
      node_id: node.node_id,
      node_name: node.node_name,
      node_type: node.node_type,
      duration_ms: node.duration_ms,
      cumulative_duration_ms: node.cumulative_duration_ms,
      is_bottleneck: node.is_bottleneck,
      status: node.status,
    })),
    summary: {
      total_duration_ms: summary?.total_duration_ms || totalDuration,
      node_count: critical_path.length,
      path_percentage: summary?.critical_path_percentage || 100,
      contains_error: critical_path.some(node => node.status === 'error'),
    },
  };
}

export async function fetchBottlenecks(
  apiBaseUrl: string,
  workflowId: string,
  executionId: string
): Promise<BottlenecksResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workflows/${workflowId}/executions/${executionId}/bottlenecks`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch bottlenecks: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<RawBottleneckData> = await response.json();

  if (!apiResponse.success || !apiResponse.data) {
    throw new Error('Invalid bottlenecks response');
  }

  const { bottlenecks, summary, verdict } = apiResponse.data;

  return {
    bottlenecks: bottlenecks.map(b => ({
      node_id: b.node_id,
      node_name: b.node_name,
      node_type: b.node_type || 'unknown',
      bottleneck_score: b.score,
      total_duration_ms: b.duration_ms,
      is_on_critical_path: b.on_critical_path,
      severity: b.severity as 'low' | 'medium' | 'high' | 'severe',
      factors: {
        duration_factor: b.factors.duration,
        position_factor: b.factors.position,
        frequency_factor: b.factors.frequency,
        variance_factor: b.factors.variance,
      },
    })),
    summary: {
      total_nodes_analyzed: summary.total_nodes_analyzed,
      bottlenecks_by_severity: {
        severe: summary.severe_bottlenecks,
        high: summary.high_bottlenecks,
        medium: summary.medium_bottlenecks,
        low: summary.low_bottlenecks,
      },
    },
    verdict: verdict ? {
      status: verdict.status as OptimizationVerdict['status'],
      message: verdict.message,
      color: verdict.color as OptimizationVerdict['color'],
      stats: verdict.stats,
    } : undefined,
  };
}

export async function fetchErrorAnalysis(
  apiBaseUrl: string,
  workflowId: string,
  executionId: string
): Promise<ErrorAnalysisResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workflows/${workflowId}/executions/${executionId}/error-analysis`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch error analysis: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<RawErrorData> = await response.json();

  if (!apiResponse.success || !apiResponse.data) {
    throw new Error('Invalid error analysis response');
  }

  const { clusters: rawClusters, summary } = apiResponse.data;

  // Transform backend cluster format to frontend format
  // Backend uses: id, member_count, pattern_type, representative_message, affected_nodes (objects)
  // Frontend expects: cluster_id, error_count, pattern, sample_message, affected_nodes (strings)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clusters: ErrorCluster[] = ((rawClusters || []) as any[]).map((cluster: Record<string, unknown>) => ({
    cluster_id: (cluster.id || cluster.cluster_id || '') as string,
    error_count: (cluster.member_count || cluster.error_count || 0) as number,
    pattern: ((cluster.pattern_type || cluster.pattern || 'unknown') as string) as ErrorCluster['pattern'],
    severity: ((cluster.severity || 'medium') as string) as ErrorCluster['severity'],
    avg_similarity: (cluster.avg_similarity || 0) as number,
    sample_message: (cluster.representative_message || cluster.sample_message || '') as string,
    // Transform affected_nodes from objects to strings if needed
    affected_nodes: Array.isArray(cluster.affected_nodes)
      ? cluster.affected_nodes.map((n: unknown) =>
          typeof n === 'string' ? n : (n as { node_id?: string })?.node_id || String(n)
        )
      : [],
  }));

  return {
    clusters,
    summary: {
      total_errors: summary.total_errors,
      total_clusters: clusters.length,
      critical_count: summary.critical_patterns || 0,
    },
  };
}

export async function fetchRecommendations(
  apiBaseUrl: string,
  workflowId: string,
  executionId: string
): Promise<RecommendationsResponse> {
  const response = await fetch(
    `${apiBaseUrl}/api/workflows/${workflowId}/executions/${executionId}/recommendations`
  );
  if (!response.ok) {
    throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
  }

  const apiResponse: ApiResponse<RawRecommendationData> = await response.json();

  if (!apiResponse.success || !apiResponse.data) {
    throw new Error('Invalid recommendations response');
  }

  const { recommendations, summary } = apiResponse.data;

  // Sort by priority score
  const sortedRecs = [...recommendations].sort((a, b) => b.priority_score - a.priority_score);

  // Count by category and impact
  const byCategory: Record<string, number> = {};
  const byImpact: Record<string, number> = {};

  recommendations.forEach(rec => {
    byCategory[rec.category] = (byCategory[rec.category] || 0) + 1;
    byImpact[rec.impact] = (byImpact[rec.impact] || 0) + 1;
  });

  return {
    recommendations: sortedRecs,
    summary: {
      total_recommendations: recommendations.length,
      by_category: summary?.by_category || byCategory,
      by_impact: summary?.by_impact || byImpact,
      top_priority: sortedRecs[0] || null,
    },
  };
}

export async function fetchAnalysisData(
  apiBaseUrl: string,
  workflowId: string,
  executionId: string
): Promise<AnalysisData> {
  const [criticalPath, bottlenecks, errors, recommendations] = await Promise.all([
    fetchCriticalPath(apiBaseUrl, workflowId, executionId),
    fetchBottlenecks(apiBaseUrl, workflowId, executionId),
    fetchErrorAnalysis(apiBaseUrl, workflowId, executionId),
    fetchRecommendations(apiBaseUrl, workflowId, executionId),
  ]);

  return {
    criticalPath,
    bottlenecks,
    errors,
    recommendations,
  };
}

// Utility functions
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}min`;
}

export function getSeverityColors(severity: string) {
  const colors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    severe: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-800',
    },
    high: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-800',
    },
    medium: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      text: 'text-yellow-700',
      badge: 'bg-yellow-100 text-yellow-800',
    },
    low: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-800',
    },
  };
  return colors[severity] || colors.low;
}

export function getImpactColors(impact: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-100 text-red-800 border-red-300',
    HIGH: 'bg-orange-100 text-orange-800 border-orange-300',
    MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    LOW: 'bg-green-100 text-green-800 border-green-300',
  };
  return colors[impact] || colors.LOW;
}

export function getCategoryColors(category: string): string {
  const colors: Record<string, string> = {
    performance: 'bg-blue-100 text-blue-800',
    reliability: 'bg-purple-100 text-purple-800',
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

export function getEffortColors(effort: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-green-100 text-green-800',
    MEDIUM: 'bg-yellow-100 text-yellow-800',
    HIGH: 'bg-red-100 text-red-800',
  };
  return colors[effort] || colors.MEDIUM;
}
