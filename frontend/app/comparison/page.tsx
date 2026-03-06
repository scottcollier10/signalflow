'use client';

/**
 * Comparison Page
 * Shows before/after execution comparison with real API data
 * Based on Variant D layout (hybrid of A + B + C)
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

// API response types
interface BottleneckCounts {
  severe: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

interface CriticalPath {
  duration: number;
  nodes: number;
  coverage: number;
}

interface ExecutionSnapshot {
  execution_id: string;
  n8n_execution_id: string;  // User-facing ID from n8n
  timestamp: string;
  duration: number;
  status: string;
  node_count: number;
  bottlenecks: BottleneckCounts;
  recommendations: number;
  critical_path: CriticalPath;
}

interface ImprovementItem {
  node_id: string;
  node_name: string;
  before_duration: number;
  after_duration: number;
  before_score: number;
  after_score: number;
  improvement_pct: number;
  impact?: string;
  reason?: string;
}

interface ComparisonDelta {
  duration_saved: number;
  pct_improvement: number;
  bottlenecks_resolved: number;
  bottlenecks_improved: number;
  bottlenecks_persisting: number;
  bottlenecks_worsened: number;
  bottlenecks_new: number;
  verdict: string;
  verdict_message: string;
}

interface ComparisonData {
  workflow_name: string;
  before: ExecutionSnapshot;
  after: ExecutionSnapshot;
  delta: ComparisonDelta;
  resolved: { count: number; items: ImprovementItem[] };
  improved: { count: number; items: ImprovementItem[] };
  persisting: { count: number; items: ImprovementItem[] };
  worsened: { count: number; items: ImprovementItem[] };
  new: { count: number; items: ImprovementItem[] };
  top_improvements: ImprovementItem[];
}

// Helper functions
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

function formatPct(pct: number): string {
  return `${Math.abs(pct).toFixed(1)}%`;
}

// Verdict styling
function getVerdictStyle(verdict: string): { bg: string; border: string; text: string; icon: string; badgeClass: string } {
  switch (verdict) {
    case 'excellent':
      return {
        bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(22, 163, 74, 0.3) 100%)',
        border: 'border-neu-green/30',
        text: 'text-neu-green',
        icon: '🎉',
        badgeClass: 'badge-success'
      };
    case 'good_progress':
    case 'good_improvement':
      return {
        bg: 'linear-gradient(135deg, rgba(77, 201, 176, 0.15) 0%, rgba(94, 212, 160, 0.25) 100%)',
        border: 'border-neu-teal/30',
        text: 'text-neu-teal',
        icon: '✨',
        badgeClass: 'badge-success'
      };
    case 'good_improvement_with_concerns':
      // Orange - positive but with caution
      return {
        bg: 'linear-gradient(135deg, rgba(240, 149, 106, 0.15) 0%, rgba(251, 191, 36, 0.2) 100%)',
        border: 'border-neu-orange/40',
        text: 'text-neu-orange',
        icon: '⚡',
        badgeClass: 'badge-warning'
      };
    case 'mixed_results':
      // Yellow - caution, investigate
      return {
        bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(250, 204, 21, 0.2) 100%)',
        border: 'border-yellow-500/30',
        text: 'text-yellow-400',
        icon: '⚖️',
        badgeClass: 'badge-warning'
      };
    case 'some_improvement':
    case 'moderate_improvement':
      return {
        bg: 'linear-gradient(135deg, rgba(168, 155, 224, 0.1) 0%, rgba(196, 184, 240, 0.2) 100%)',
        border: 'border-neu-accent/30',
        text: 'text-neu-accent',
        icon: '📈',
        badgeClass: 'badge-info'
      };
    case 'minimal_change':
      return {
        bg: 'linear-gradient(135deg, rgba(154, 158, 176, 0.1) 0%, rgba(154, 158, 176, 0.15) 100%)',
        border: 'border-neu-text-muted/30',
        text: 'text-neu-text-muted',
        icon: '➖',
        badgeClass: 'badge-neutral'
      };
    case 'regression':
    case 'needs_work':
      return {
        bg: 'linear-gradient(135deg, rgba(240, 139, 122, 0.15) 0%, rgba(240, 149, 106, 0.25) 100%)',
        border: 'border-neu-coral/30',
        text: 'text-neu-coral',
        icon: '⚠️',
        badgeClass: 'badge-error'
      };
    default:
      return {
        bg: 'linear-gradient(135deg, rgba(154, 158, 176, 0.1) 0%, rgba(154, 158, 176, 0.15) 100%)',
        border: 'border-neu-text-muted/30',
        text: 'text-neu-text-muted',
        icon: '📊',
        badgeClass: 'badge-neutral'
      };
  }
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Timeline skeleton */}
      <div className="neu-flat p-6">
        <div className="space-y-4">
          <div className="h-8 bg-neu-shadow-light/30 rounded-lg w-full" />
          <div className="h-8 bg-neu-shadow-light/30 rounded-lg w-1/4" />
        </div>
      </div>

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="neu-flat p-6 h-64">
          <div className="h-6 bg-neu-shadow-light/30 rounded w-20 mb-6" />
          <div className="h-16 bg-neu-shadow-light/30 rounded w-32 mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-neu-shadow-light/30 rounded w-full" />
            <div className="h-4 bg-neu-shadow-light/30 rounded w-full" />
          </div>
        </div>
        <div className="neu-flat p-6 h-64">
          <div className="h-6 bg-neu-shadow-light/30 rounded w-20 mb-6" />
          <div className="h-16 bg-neu-shadow-light/30 rounded w-32 mb-8" />
          <div className="space-y-3">
            <div className="h-4 bg-neu-shadow-light/30 rounded w-full" />
            <div className="h-4 bg-neu-shadow-light/30 rounded w-full" />
          </div>
        </div>
      </div>

      {/* Delta skeleton */}
      <div className="neu-flat p-6 h-24" />
    </div>
  );
}

// Main comparison content component
function ComparisonContent() {
  const searchParams = useSearchParams();
  const execA = searchParams.get('exec_a');
  const execB = searchParams.get('exec_b');

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<string[]>(['top']);

  useEffect(() => {
    if (!execA || !execB) {
      setError('Missing execution IDs. Please provide exec_a and exec_b parameters.');
      setLoading(false);
      return;
    }

    fetchComparison();
  }, [execA, execB]);

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `http://localhost:8001/api/compare?exec_a=${execA}&exec_b=${execB}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `Failed to fetch comparison (${response.status})`);
      }

      const result = await response.json();

      if (!result.success || !result.data?.comparison) {
        throw new Error('Invalid API response');
      }

      setData(result.data.comparison);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comparison');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section)
        ? prev.filter((s) => s !== section)
        : [...prev, section]
    );
  };

  // Error state
  if (error) {
    return (
      <div className="neu-flat p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-neu-coral/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-neu-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="font-display text-xl font-semibold text-neu-text mb-2">
          Failed to load comparison
        </h3>
        <p className="text-neu-text-muted mb-6">{error}</p>
        <div className="flex justify-center gap-4">
          <button onClick={fetchComparison} className="btn-primary">
            Try Again
          </button>
          <Link href="/dashboard" className="btn-secondary">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return <LoadingSkeleton />;
  }

  // No data
  if (!data) {
    return (
      <div className="neu-flat p-8 text-center">
        <p className="text-neu-text-muted">No comparison data available</p>
      </div>
    );
  }

  const { before, after, delta, top_improvements, resolved, improved, persisting, worsened } = data;
  const verdictStyle = getVerdictStyle(delta.verdict);

  // Calculate bar widths (before is 100%, after is proportional)
  const afterWidth = before.duration > 0
    ? Math.max((after.duration / before.duration) * 100, 5)
    : 100;

  // Combine resolved + improved for "Top Improvements" section
  const allImprovements = [...(resolved?.items || []), ...(improved?.items || [])].sort(
    (a, b) => (b.improvement_pct || 0) - (a.improvement_pct || 0)
  );
  const topImprovements = allImprovements.slice(0, 5);
  const minorImprovements = allImprovements.slice(5);

  // Get display IDs (prefer n8n_execution_id over truncated UUID)
  const beforeDisplayId = before.n8n_execution_id || before.execution_id.slice(-4);
  const afterDisplayId = after.n8n_execution_id || after.execution_id.slice(-4);

  return (
    <div className="space-y-8">
      {/* Comparison Header with correct n8n IDs */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-neu-text-muted text-lg">
            Comparing <span className="text-neu-coral font-semibold">#{beforeDisplayId}</span>
            {' → '}
            <span className="text-neu-green font-semibold">#{afterDisplayId}</span>
          </p>
          {data.workflow_name && data.workflow_name !== 'Unknown' && (
            <p className="text-neu-text-muted text-sm mt-1">{data.workflow_name}</p>
          )}
        </div>
        <Link
          href="/dashboard"
          className="text-xs text-neu-text-muted hover:text-neu-accent transition-colors"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Timeline Visualization Bars */}
      <div className="neu-flat p-6">
        <div className="space-y-4">
          {/* Before Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Before</span>
              <span className="text-neu-coral font-bold">{formatDuration(before.duration)}</span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden bg-neu-bg">
              <div
                className="h-full rounded-lg"
                style={{
                  width: '100%',
                  background: 'linear-gradient(90deg, #f08b7a 0%, #f0956a 100%)',
                }}
              />
            </div>
          </div>

          {/* After Bar */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">After</span>
              <span className="text-neu-green font-bold">{formatDuration(after.duration)}</span>
            </div>
            <div className="h-8 rounded-lg overflow-hidden bg-neu-bg">
              <div
                className="h-full rounded-lg"
                style={{
                  width: `${afterWidth}%`,
                  background: 'linear-gradient(90deg, #4dc9b0 0%, #5ed4a0 100%)',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* BEFORE Card */}
        <div className="neu-flat p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="badge-error">Before</span>
            <span className="text-xs text-neu-text-muted">#{before.n8n_execution_id || before.execution_id.slice(-4)}</span>
          </div>

          {/* Huge Duration */}
          <div className="mb-8">
            <p className="text-7xl font-display font-bold text-neu-coral tracking-tight">
              {formatDuration(before.duration)}
            </p>
            <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Total Duration</p>
          </div>

          {/* Metrics with Icons */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Bottlenecks</span>
              <span className="text-neu-coral font-bold flex items-center gap-2">
                <span>🔴</span>
                {before.bottlenecks.total}
                {before.bottlenecks.severe > 0 && (
                  <span className="text-xs font-normal text-neu-text-muted">
                    ({before.bottlenecks.severe} severe)
                  </span>
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Recommendations</span>
              <span className="text-neu-orange font-bold flex items-center gap-2">
                <span>⚠️</span>
                {before.recommendations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Nodes</span>
              <span className="text-neu-text font-medium">{before.node_count}</span>
            </div>
          </div>
        </div>

        {/* AFTER Card */}
        <div className="neu-flat p-6">
          <div className="flex items-center gap-2 mb-6">
            <span className="badge-success">After</span>
            <span className="text-xs text-neu-text-muted">#{after.n8n_execution_id || after.execution_id.slice(-4)}</span>
          </div>

          {/* Huge Duration */}
          <div className="mb-8">
            <p className="text-7xl font-display font-bold text-neu-green tracking-tight">
              {formatDuration(after.duration)}
            </p>
            <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Total Duration</p>
          </div>

          {/* Metrics with Icons */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Bottlenecks</span>
              <span className="text-neu-green font-bold flex items-center gap-2">
                <span>✅</span>
                {after.bottlenecks.total}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Recommendations</span>
              <span className="text-neu-green font-bold flex items-center gap-2">
                <span>✅</span>
                {after.recommendations}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs uppercase tracking-wide text-neu-text-muted">Nodes</span>
              <span className="text-neu-text font-medium">{after.node_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Big Delta Card */}
      <div
        className={`card-neu border ${verdictStyle.border}`}
        style={{ background: verdictStyle.bg }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-8 flex-wrap">
            <div>
              <p className={`text-6xl font-display font-bold ${verdictStyle.text} flex items-center gap-2`}>
                {delta.pct_improvement >= 0 ? '⬇️' : '⬆️'}
                {formatPct(delta.pct_improvement)}
              </p>
              <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">
                {delta.pct_improvement >= 0 ? 'Improvement' : 'Regression'}
              </p>
            </div>
            <div className="h-16 w-px bg-neu-text-muted/20 hidden sm:block" />
            <div>
              <p className={`text-3xl font-display font-bold ${verdictStyle.text} flex items-center gap-2`}>
                <span>⏱️</span>
                {delta.duration_saved >= 0 ? '' : '+'}{formatDuration(Math.abs(delta.duration_saved))}
              </p>
              <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">
                {delta.duration_saved >= 0 ? 'Time Saved' : 'Time Added'}
              </p>
            </div>
            <div className="h-16 w-px bg-neu-text-muted/20 hidden sm:block" />
            <div>
              <p className={`text-3xl font-display font-bold ${verdictStyle.text} flex items-center gap-2`}>
                <span>✅</span>
                {delta.bottlenecks_resolved}
              </p>
              <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Resolved</p>
            </div>
            {delta.bottlenecks_improved > 0 && (
              <>
                <div className="h-16 w-px bg-neu-text-muted/20 hidden sm:block" />
                <div>
                  <p className={`text-3xl font-display font-bold ${verdictStyle.text} flex items-center gap-2`}>
                    <span>📈</span>
                    {delta.bottlenecks_improved}
                  </p>
                  <p className="text-xs uppercase tracking-wide text-neu-text-muted mt-2">Improved</p>
                </div>
              </>
            )}
          </div>
          <div className={`${verdictStyle.badgeClass} text-base px-5 py-2.5 font-semibold max-w-md text-right`}>
            {verdictStyle.icon} {delta.verdict_message}
          </div>
        </div>
      </div>

      {/* Expandable Node Breakdown */}
      <div className="space-y-3">
        {/* Top Improvements */}
        {topImprovements.length > 0 && (
          <div className="neu-flat overflow-hidden">
            <button
              onClick={() => toggleSection('top')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
            >
              <span className="font-display font-semibold text-neu-text flex items-center gap-2">
                <span>🚀</span>
                Top Improvements ({topImprovements.length})
              </span>
              <span className="text-neu-accent text-xl">
                {expandedSections.includes('top') ? '−' : '+'}
              </span>
            </button>
            {expandedSections.includes('top') && (
              <div className="px-4 pb-4 space-y-3">
                {topImprovements.map((node) => (
                  <div
                    key={node.node_id}
                    className="p-4 rounded-lg bg-neu-bg border border-neu-text-muted/10 hover:border-neu-accent/30 hover:bg-neu-accent/5 transition-all"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-neu-text">{node.node_name}</span>
                      <span className="text-neu-green font-bold text-lg flex items-center gap-1">
                        ⬇️ {formatPct(node.improvement_pct)}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-neu-text-muted">Before</span>
                        <span className="text-neu-coral font-semibold">{formatDuration(node.before_duration)}</span>
                        {node.before_score >= 50 && (
                          <span className="text-xs text-neu-coral">🔴 {node.before_score}</span>
                        )}
                      </div>
                      <span className="text-neu-text-muted">→</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs uppercase tracking-wide text-neu-text-muted">After</span>
                        <span className="text-neu-green font-semibold">{formatDuration(node.after_duration)}</span>
                        <span className="text-xs text-neu-green">✅</span>
                      </div>
                    </div>
                    {node.impact && (
                      <p className="text-xs text-neu-text-muted mt-2">
                        💡 {node.impact}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Minor Improvements */}
        {minorImprovements.length > 0 && (
          <div className="neu-flat overflow-hidden">
            <button
              onClick={() => toggleSection('minor')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
            >
              <span className="font-display font-semibold text-neu-text flex items-center gap-2">
                <span>📈</span>
                Minor Improvements ({minorImprovements.length})
              </span>
              <span className="text-neu-accent text-xl">
                {expandedSections.includes('minor') ? '−' : '+'}
              </span>
            </button>
            {expandedSections.includes('minor') && (
              <div className="px-4 pb-4 space-y-2">
                {minorImprovements.map((node) => (
                  <div
                    key={node.node_id}
                    className="p-3 rounded-lg bg-neu-bg border border-neu-text-muted/10 flex items-center justify-between"
                  >
                    <span className="font-mono text-sm text-neu-text">{node.node_name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-neu-coral">{formatDuration(node.before_duration)}</span>
                      <span className="text-neu-text-muted">→</span>
                      <span className="text-neu-green">{formatDuration(node.after_duration)}</span>
                      <span className="text-neu-green font-semibold">-{formatPct(node.improvement_pct)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Persisting Issues */}
        {persisting && persisting.count > 0 && (
          <div className="neu-flat overflow-hidden">
            <button
              onClick={() => toggleSection('persisting')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-accent/5 transition-colors"
            >
              <span className="font-display font-semibold text-neu-text-muted flex items-center gap-2">
                <span>⚠️</span>
                Persisting Issues ({persisting.count})
              </span>
              <span className="text-neu-text-muted text-xl">
                {expandedSections.includes('persisting') ? '−' : '+'}
              </span>
            </button>
            {expandedSections.includes('persisting') && (
              <div className="px-4 pb-4 space-y-2">
                {persisting.items.map((node) => (
                  <div
                    key={node.node_id}
                    className="p-3 rounded-lg bg-neu-bg border border-neu-orange/20 flex items-center justify-between"
                  >
                    <span className="font-mono text-sm text-neu-text">{node.node_name}</span>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-neu-text-muted">{formatDuration(node.before_duration)}</span>
                      <span className="text-neu-text-muted">→</span>
                      <span className="text-neu-orange">{formatDuration(node.after_duration)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Worsened - nodes that got slower */}
        {worsened && worsened.count > 0 && (
          <div className="neu-flat overflow-hidden border border-neu-coral/20">
            <button
              onClick={() => toggleSection('worsened')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-neu-coral/5 transition-colors"
            >
              <span className="font-display font-semibold text-neu-coral flex items-center gap-2">
                <span>📉</span>
                Worsened ({worsened.count})
                <span className="text-xs font-normal text-neu-text-muted ml-2">
                  — investigate trade-offs
                </span>
              </span>
              <span className="text-neu-coral text-xl">
                {expandedSections.includes('worsened') ? '−' : '+'}
              </span>
            </button>
            {expandedSections.includes('worsened') && (
              <div className="px-4 pb-4 space-y-3">
                {worsened.items.map((node) => {
                  // Calculate regression percentage (negative improvement means slower)
                  const regressionPct = node.before_duration > 0
                    ? ((node.after_duration - node.before_duration) / node.before_duration) * 100
                    : 0;
                  return (
                    <div
                      key={node.node_id}
                      className="p-4 rounded-lg bg-neu-bg border border-neu-coral/30 hover:border-neu-coral/50 transition-all"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-mono text-neu-text">{node.node_name}</span>
                        <span className="text-neu-coral font-bold text-lg flex items-center gap-1">
                          ⬆️ +{formatPct(regressionPct)} slower
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wide text-neu-text-muted">Before</span>
                          <span className="text-neu-green font-semibold">{formatDuration(node.before_duration)}</span>
                        </div>
                        <span className="text-neu-text-muted">→</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs uppercase tracking-wide text-neu-text-muted">After</span>
                          <span className="text-neu-coral font-semibold">{formatDuration(node.after_duration)}</span>
                          <span className="text-xs text-neu-coral">🔴</span>
                        </div>
                      </div>
                      {node.reason && (
                        <p className="text-xs text-neu-text-muted mt-2">
                          💡 {node.reason}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Main page component with Suspense boundary
export default function ComparisonPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <ComparisonContent />
    </Suspense>
  );
}
