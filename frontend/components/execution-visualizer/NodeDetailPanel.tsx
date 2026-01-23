'use client';

/**
 * Node Detail Panel
 * Slide-in panel showing bottleneck details and fix prompt generator
 */

import { useState } from 'react';
import { X, Copy, Check, AlertTriangle, Clock, Zap, TrendingUp, CheckCircle, FileJson } from 'lucide-react';
import { Bottleneck, Recommendation, formatDuration } from '@/lib/api/analysis';
import { generateNodeFixPrompt } from '@/lib/nodePromptGenerator';

interface NodeDetailPanelProps {
  node: {
    id: string;
    data?: {
      label?: string;
      nodeType?: string;
      duration?: number | null;
      state?: string;
    };
  };
  bottleneck: Bottleneck | null;
  recommendations: Recommendation[];
  onClose: () => void;
  executionId: string;
  workflowName: string;
}

export function NodeDetailPanel({
  node,
  bottleneck,
  recommendations,
  onClose,
  executionId,
  workflowName
}: NodeDetailPanelProps) {
  const [copied, setCopied] = useState(false);
  const [configCopied, setConfigCopied] = useState(false);

  const handleCopyPrompt = async () => {
    const prompt = generateNodeFixPrompt({
      node,
      bottleneck,
      recommendations,
      executionId,
      workflowName
    });

    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
    }
  };

  const handleCopyNodeConfig = async () => {
    // Build node configuration object with available data
    const config = {
      id: node.id,
      name: node.data?.label,
      type: node.data?.nodeType,
      duration_ms: node.data?.duration,
      state: node.data?.state,
      // Include bottleneck info if available
      ...(bottleneck && {
        bottleneck: {
          score: bottleneck.bottleneck_score,
          severity: bottleneck.severity,
          on_critical_path: bottleneck.is_on_critical_path,
          factors: bottleneck.factors
        }
      })
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(config, null, 2));
      setConfigCopied(true);
      setTimeout(() => setConfigCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy config:', err);
    }
  };

  const severityConfig: Record<string, { color: string; bgColor: string; borderColor: string }> = {
    severe: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    high: {
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    },
    medium: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    low: {
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    }
  };

  const severity = bottleneck?.severity || 'low';
  const config = severityConfig[severity] || severityConfig.low;

  // Calculate score breakdown from factors (factors are 0-1 normalized)
  const durationScore = bottleneck ? Math.round(bottleneck.factors.duration_factor * 40) : 0;
  const positionScore = bottleneck ? Math.round(bottleneck.factors.position_factor * 30) : 0;
  const frequencyScore = bottleneck ? Math.round(bottleneck.factors.frequency_factor * 20) : 0;
  const varianceScore = bottleneck ? Math.round(bottleneck.factors.variance_factor * 10) : 0;

  return (
    <div className="absolute top-0 right-0 h-full w-96 bg-white shadow-2xl border-l z-20 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">
            {node.data?.label || node.id}
          </h3>
          <p className="text-sm text-gray-500">
            {node.data?.nodeType || 'Unknown type'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors ml-2 flex-shrink-0"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Duration */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Clock className="w-5 h-5 text-gray-600" />
          </div>
          <div>
            <div className="text-sm text-gray-500">Duration</div>
            <div className="font-semibold text-lg">
              {typeof node.data?.duration === 'number'
                ? formatDuration(node.data.duration)
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Bottleneck Score */}
        {bottleneck ? (
          <div className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor}`}>
            <div className="flex items-center justify-between mb-3">
              <div className={`flex items-center gap-2 ${config.color}`}>
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold capitalize">{bottleneck.severity} Bottleneck</span>
              </div>
              <div className={`text-2xl font-bold ${config.color}`}>
                {bottleneck.bottleneck_score}/100
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="space-y-3 text-sm">
              <ScoreBar
                label="Duration Factor"
                score={durationScore}
                maxScore={40}
                color={config.color}
              />
              <ScoreBar
                label="Position Factor"
                score={positionScore}
                maxScore={30}
                color={config.color}
              />
              <ScoreBar
                label="Frequency Factor"
                score={frequencyScore}
                maxScore={20}
                color={config.color}
              />
              <ScoreBar
                label="Variance Factor"
                score={varianceScore}
                maxScore={10}
                color={config.color}
              />
            </div>

            {bottleneck.is_on_critical_path && (
              <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${config.color} pt-3 border-t border-current/20`}>
                <Zap className="w-4 h-4" />
                On Critical Path
              </div>
            )}

            {/* Total duration context */}
            <div className="mt-3 pt-3 border-t border-current/10 text-sm text-gray-600">
              Total node time: {formatDuration(bottleneck.total_duration_ms)}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">No bottleneck detected</span>
            </div>
            <p className="text-sm text-green-600 mt-2">
              This node is performing within normal parameters.
            </p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Recommendations ({recommendations.length})
            </h4>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={rec.id || index} className="rounded-lg border p-3 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="font-medium text-sm">{rec.title}</div>
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {rec.time_saved_ms && (
                      <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-0.5 rounded">
                        Save {formatDuration(rec.time_saved_ms)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      rec.impact === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                      rec.impact === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                      rec.impact === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {rec.impact}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {recommendations.length === 0 && bottleneck && (
          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            No specific recommendations for this node.
            Check the Recommendations tab for workflow-wide suggestions.
          </div>
        )}
      </div>

      {/* Footer - Action Buttons */}
      <div className="p-4 border-t bg-gray-50 space-y-2">
        {/* Primary: Copy Fix Prompt (only for bottleneck nodes) */}
        {bottleneck && (
          <button
            onClick={handleCopyPrompt}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-5 h-5" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                Copy Fix Prompt for Claude Code
              </>
            )}
          </button>
        )}

        {/* Secondary: Copy Node Config */}
        <button
          onClick={handleCopyNodeConfig}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-sm transition-colors"
        >
          {configCopied ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <FileJson className="w-4 h-4" />
              Copy Node Configuration
            </>
          )}
        </button>

        <p className="text-xs text-gray-500 text-center">
          {bottleneck
            ? 'Generate a targeted prompt or copy node config for Claude Code'
            : 'Copy node configuration to share with Claude Code'}
        </p>
      </div>
    </div>
  );
}

// Score bar component for visual score breakdown
function ScoreBar({
  label,
  score,
  maxScore,
  color
}: {
  label: string;
  score: number;
  maxScore: number;
  color: string;
}) {
  const percentage = (score / maxScore) * 100;

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-gray-700">{label}</span>
        <span className={`font-medium ${color}`}>{score}/{maxScore}</span>
      </div>
      <div className="w-full bg-white/50 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            color.includes('red') ? 'bg-red-500' :
            color.includes('orange') ? 'bg-orange-500' :
            color.includes('yellow') ? 'bg-yellow-500' :
            'bg-gray-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default NodeDetailPanel;
