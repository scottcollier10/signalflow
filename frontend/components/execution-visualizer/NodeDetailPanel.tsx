'use client';

/**
 * Node Detail Panel
 * Slide-in panel showing bottleneck details and fix prompt generator
 * Dark neumorphic styling
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
      color: 'text-neu-coral',
      bgColor: 'bg-neu-coral/10',
      borderColor: 'border-neu-coral/30'
    },
    high: {
      color: 'text-neu-orange',
      bgColor: 'bg-neu-orange/10',
      borderColor: 'border-neu-orange/30'
    },
    medium: {
      color: 'text-neu-yellow',
      bgColor: 'bg-neu-yellow/10',
      borderColor: 'border-neu-yellow/30'
    },
    low: {
      color: 'text-neu-text-muted',
      bgColor: 'bg-neu-shadow-light/10',
      borderColor: 'border-neu-shadow-light/30'
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
    <div className="absolute top-0 right-0 h-full w-96 bg-neu-bg shadow-2xl border-l border-neu-shadow-light/30 z-20 flex flex-col animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neu-shadow-light/30 neu-raised-sm">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate text-neu-text">
            {node.data?.label || node.id}
          </h3>
          <p className="text-sm text-neu-text-muted">
            {node.data?.nodeType || 'Unknown type'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-neu-shadow-light/20 rounded-lg transition-colors ml-2 flex-shrink-0 text-neu-text-muted hover:text-neu-text"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">

        {/* Duration */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-neu-shadow-light/20 rounded-lg">
            <Clock className="w-5 h-5 text-neu-text-muted" />
          </div>
          <div>
            <div className="text-sm text-neu-text-muted">Duration</div>
            <div className="font-semibold text-lg text-neu-text">
              {typeof node.data?.duration === 'number'
                ? formatDuration(node.data.duration)
                : 'N/A'}
            </div>
          </div>
        </div>

        {/* Bottleneck Score */}
        {bottleneck ? (
          <div className={`rounded-xl border p-4 ${config.bgColor} ${config.borderColor}`}>
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
                severity={severity}
              />
              <ScoreBar
                label="Position Factor"
                score={positionScore}
                maxScore={30}
                severity={severity}
              />
              <ScoreBar
                label="Frequency Factor"
                score={frequencyScore}
                maxScore={20}
                severity={severity}
              />
              <ScoreBar
                label="Variance Factor"
                score={varianceScore}
                maxScore={10}
                severity={severity}
              />
            </div>

            {bottleneck.is_on_critical_path && (
              <div className={`mt-4 flex items-center gap-2 text-sm font-medium ${config.color} pt-3 border-t border-current/20`}>
                <Zap className="w-4 h-4" />
                On Critical Path
              </div>
            )}

            {/* Total duration context */}
            <div className="mt-3 pt-3 border-t border-neu-shadow-light/20 text-sm text-neu-text-muted">
              Total node time: {formatDuration(bottleneck.total_duration_ms)}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-neu-green/30 bg-neu-green/10 p-4">
            <div className="flex items-center gap-2 text-neu-green">
              <CheckCircle className="w-5 h-5" />
              <span className="font-medium">No bottleneck detected</span>
            </div>
            <p className="text-sm text-neu-green/80 mt-2">
              This node is performing within normal parameters.
            </p>
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-neu-text">
              <TrendingUp className="w-5 h-5 text-neu-accent" />
              Recommendations ({recommendations.length})
            </h4>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={rec.id || index} className="rounded-xl border border-neu-shadow-light/30 p-3 bg-neu-shadow-dark/30 hover:bg-neu-shadow-light/10 transition-colors">
                  <div className="font-medium text-sm text-neu-text">{rec.title}</div>
                  <p className="text-xs text-neu-text-muted mt-1 line-clamp-2">{rec.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {rec.time_saved_ms && (
                      <span className="text-xs text-neu-green font-medium bg-neu-green/10 px-2 py-0.5 rounded">
                        Save {formatDuration(rec.time_saved_ms)}
                      </span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      rec.impact === 'CRITICAL' ? 'bg-neu-coral/10 text-neu-coral' :
                      rec.impact === 'HIGH' ? 'bg-neu-orange/10 text-neu-orange' :
                      rec.impact === 'MEDIUM' ? 'bg-neu-yellow/10 text-neu-yellow' :
                      'bg-neu-shadow-light/20 text-neu-text-muted'
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
          <div className="text-sm text-neu-text-muted bg-neu-shadow-dark/30 rounded-xl p-3 border border-neu-shadow-light/20">
            No specific recommendations for this node.
            Check the Recommendations tab for workflow-wide suggestions.
          </div>
        )}
      </div>

      {/* Footer - Action Buttons */}
      <div className="p-4 border-t border-neu-shadow-light/30 neu-raised-sm space-y-2">
        {/* Primary: Copy Fix Prompt (only for bottleneck nodes) */}
        {bottleneck && (
          <button
            onClick={handleCopyPrompt}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neu-accent hover:bg-neu-accent-light text-neu-bg rounded-xl font-medium transition-colors shadow-neu-raised-sm"
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
          className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-neu-shadow-light/30 hover:bg-neu-shadow-light/10 text-neu-text-muted hover:text-neu-text rounded-xl text-sm transition-colors"
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

        <p className="text-xs text-neu-text-muted text-center">
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
  severity
}: {
  label: string;
  score: number;
  maxScore: number;
  severity: string;
}) {
  const percentage = (score / maxScore) * 100;

  const getBarColor = () => {
    switch (severity) {
      case 'severe': return 'bg-neu-coral';
      case 'high': return 'bg-neu-orange';
      case 'medium': return 'bg-neu-yellow';
      default: return 'bg-neu-shadow-light';
    }
  };

  const getTextColor = () => {
    switch (severity) {
      case 'severe': return 'text-neu-coral';
      case 'high': return 'text-neu-orange';
      case 'medium': return 'text-neu-yellow';
      default: return 'text-neu-text-muted';
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-neu-text-muted">{label}</span>
        <span className={`font-medium ${getTextColor()}`}>{score}/{maxScore}</span>
      </div>
      <div className="w-full bg-neu-shadow-dark rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default NodeDetailPanel;
