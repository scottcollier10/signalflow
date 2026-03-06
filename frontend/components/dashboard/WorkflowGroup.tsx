'use client';

/**
 * Workflow Group Component
 * Groups executions by workflow with neumorphic design
 * Phase 2 Critical Fixes:
 * - Compare first→latest (total journey)
 * - Removed "optimized" badge (comparison view is more accurate)
 * - Added timeline order indicator with Baseline badge
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ExecutionCard, ExecutionData } from './ExecutionCard';

interface WorkflowGroupProps {
  workflowId: string;
  workflowName?: string;
  executions: ExecutionData[];
  onDeleteExecution?: (id: string) => void;
  defaultExpanded?: boolean;
}

export function WorkflowGroup({
  workflowId,
  workflowName,
  executions,
  onDeleteExecution,
  defaultExpanded = true,
}: WorkflowGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Sort executions by started_at (latest first)
  const sortedExecutions = useMemo(() => {
    return [...executions].sort((a, b) => {
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  }, [executions]);

  // Stats
  const successCount = executions.filter(e => e.status === 'success').length;
  const errorCount = executions.filter(e => e.status === 'error').length;
  const hasMultipleExecutions = executions.length >= 2;

  // Get first (baseline) and latest for comparison
  const latestExecution = sortedExecutions[0]; // newest
  const firstExecution = sortedExecutions[sortedExecutions.length - 1]; // oldest (baseline)

  // Build compare URL: first → latest (total journey)
  const compareUrl = hasMultipleExecutions
    ? `/comparison?exec_a=${firstExecution?.id}&exec_b=${latestExecution?.id}`
    : null;

  // Get display IDs for button
  const firstDisplayId = firstExecution?.n8n_execution_id || firstExecution?.id.slice(-4);
  const latestDisplayId = latestExecution?.n8n_execution_id || latestExecution?.id.slice(-4);

  return (
    <div className="neu-raised overflow-hidden">
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-neu-shadow-light/10 transition-colors"
      >
        <div className="flex items-center gap-4">
          {/* Accent indicator */}
          <div className="w-1.5 h-12 rounded-full bg-gradient-to-b from-neu-accent to-neu-accent-light" />

          {/* Icon */}
          <div
            className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: 'linear-gradient(145deg, #242830, #1a1c22)' }}
          >
            <svg className="w-6 h-6 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>

          {/* Text */}
          <div className="text-left">
            <h3 className="font-display font-semibold text-xl text-neu-text">
              {workflowName || `Workflow ${workflowId.slice(0, 8)}...`}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-neu-text-muted">
                {executions.length} execution{executions.length !== 1 ? 's' : ''}
              </span>
              {successCount > 0 && (
                <span className="text-sm text-neu-green flex items-center gap-1">
                  <span>✓</span> {successCount}
                </span>
              )}
              {errorCount > 0 && (
                <span className="text-sm text-neu-coral flex items-center gap-1">
                  <span>✗</span> {errorCount}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-5 h-5 text-neu-text-muted transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Executions Grid */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2">
          <div className="divider-neu mb-5" />

          {/* Executions - Timeline style with dots */}
          <div className="relative pl-6 ml-2">
            {/* Vertical timeline line */}
            <div className="absolute left-0 top-4 bottom-4 w-0.5 bg-gradient-to-b from-neu-accent/40 via-neu-accent/20 to-neu-accent/40" />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedExecutions.map((execution, index) => {
                const isLatest = index === 0;
                const isBaseline = index === sortedExecutions.length - 1 && sortedExecutions.length > 1;
                const versionNumber = sortedExecutions.length - index; // V1 is oldest, V3 is newest

                return (
                  <div key={execution.id} className="relative">
                    {/* Timeline dot - positioned to align with card */}
                    <div className="absolute -left-6 top-8 z-10">
                      <div
                        className={`w-3 h-3 rounded-full border-2 ${
                          isLatest
                            ? 'bg-neu-accent border-neu-accent animate-pulse'
                            : isBaseline
                            ? 'bg-transparent border-neu-text-muted'
                            : 'bg-neu-accent/50 border-neu-accent/50'
                        }`}
                      />
                    </div>

                    {/* Version number badge (subtle, top-right) */}
                    <div className="absolute -top-2 -right-2 z-10">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-neu-shadow-dark/50 text-neu-text-muted font-mono">
                        V{versionNumber}
                      </span>
                    </div>

                    {/* Latest Badge */}
                    {isLatest && (
                      <div className="absolute -top-2 -left-2 z-10">
                        <span className="badge-info text-xs px-2 py-1">
                          Latest
                        </span>
                      </div>
                    )}

                    {/* Baseline Badge */}
                    {isBaseline && (
                      <div className="absolute -top-2 -left-2 z-10">
                        <span className="text-xs px-2 py-1 rounded-full bg-neu-shadow-dark text-neu-text-muted border border-neu-text-muted/30">
                          Baseline
                        </span>
                      </div>
                    )}

                    <ExecutionCard
                      execution={execution}
                      onDelete={onDeleteExecution}
                      animationDelay={index}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Compare Versions Button */}
          {hasMultipleExecutions && compareUrl && (
            <>
              <div className="divider-neu my-5" />
              <div className="flex justify-center">
                <Link
                  href={compareUrl}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Compare Versions
                  <span className="text-xs opacity-75">
                    (#{firstDisplayId} → #{latestDisplayId})
                  </span>
                  <span className="text-xs opacity-50 ml-1">
                    • Total journey
                  </span>
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
