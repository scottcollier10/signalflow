'use client';

/**
 * Overview tab showing executive summary of all analyses
 */

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
}

export function AnalysisOverview({ data, onViewEvidence }: AnalysisOverviewProps) {
  const { criticalPath, bottlenecks, errors, recommendations } = data;

  // Get top severity bottlenecks
  const severeBottlenecks = bottlenecks.bottlenecks.filter(b => b.severity === 'severe' || b.severity === 'high');

  // Get top priority recommendation
  const topRecommendation = recommendations.summary.top_priority || recommendations.recommendations[0];

  return (
    <div className="space-y-6">
      {/* Executive Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Critical Path */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">
              {criticalPath.summary.path_percentage.toFixed(0)}%
            </div>
            <div className="text-sm text-blue-600">of total execution</div>
            <div className="mt-2 text-xs text-blue-500">
              {criticalPath.summary.node_count} nodes on critical path
            </div>
          </div>

          {/* Bottlenecks */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">
              {bottlenecks.summary.bottlenecks_by_severity.severe + bottlenecks.summary.bottlenecks_by_severity.high}
            </div>
            <div className="text-sm text-orange-600">high-impact bottlenecks</div>
            <div className="mt-2 text-xs text-orange-500">
              {bottlenecks.summary.total_nodes_analyzed} total nodes analyzed
            </div>
          </div>

          {/* Errors */}
          <div className={`p-4 rounded-lg ${errors.summary.total_errors > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <div className={`text-2xl font-bold ${errors.summary.total_errors > 0 ? 'text-red-700' : 'text-green-700'}`}>
              {errors.summary.total_errors}
            </div>
            <div className={`text-sm ${errors.summary.total_errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {errors.summary.total_errors > 0 ? 'errors detected' : 'clean execution'}
            </div>
            {errors.summary.total_clusters > 0 && (
              <div className="mt-2 text-xs text-red-500">
                {errors.summary.total_clusters} error clusters
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              {recommendations.summary.total_recommendations}
            </div>
            <div className="text-sm text-purple-600">recommendations</div>
            <div className="mt-2 text-xs text-purple-500">
              {recommendations.summary.by_category.performance || 0} performance, {recommendations.summary.by_category.reliability || 0} reliability
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Bottlenecks */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Bottlenecks</h3>

          {severeBottlenecks.length > 0 ? (
            <div className="space-y-3">
              {severeBottlenecks.slice(0, 3).map((bottleneck) => {
                const colors = getSeverityColors(bottleneck.severity);
                return (
                  <div
                    key={bottleneck.node_id}
                    className={`p-3 rounded-lg border ${colors.bg} ${colors.border}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-900 truncate">
                        {bottleneck.node_name}
                      </div>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${colors.badge}`}>
                        {bottleneck.bottleneck_score}/100
                      </span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {formatDuration(bottleneck.total_duration_ms)}
                      {bottleneck.is_on_critical_path && (
                        <span className="ml-2 text-red-600 text-xs">Critical Path</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No severe bottlenecks detected</p>
          )}
        </div>

        {/* Top Recommendation */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Recommendation</h3>

          {topRecommendation ? (
            <div
              className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onViewEvidence(topRecommendation)}
            >
              <div className="flex items-start justify-between">
                <h4 className="font-medium text-gray-900">{topRecommendation.title}</h4>
                <span className={`px-2 py-1 rounded text-xs font-medium border ${getImpactColors(topRecommendation.impact)}`}>
                  {topRecommendation.impact}
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                {topRecommendation.description}
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className="text-xs text-gray-500">
                  Priority: {topRecommendation.priority_score}/100
                </span>
                {topRecommendation.time_saved_ms && (
                  <span className="text-xs text-green-600">
                    Save {formatDuration(topRecommendation.time_saved_ms)}
                  </span>
                )}
              </div>
              <div className="mt-3 text-xs text-blue-600">
                Click to view evidence and code example
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No recommendations available</p>
          )}
        </div>
      </div>

      {/* Critical Path Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Critical Path Summary</h3>

        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-2">Total Duration</div>
            <div className="text-3xl font-bold text-gray-900">
              {formatDuration(criticalPath.summary.total_duration_ms)}
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-2">Path Coverage</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${criticalPath.summary.path_percentage}%` }}
                />
              </div>
              <span className="text-lg font-medium text-gray-900">
                {criticalPath.summary.path_percentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-2">Nodes</div>
            <div className="text-3xl font-bold text-gray-900">
              {criticalPath.summary.node_count}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
