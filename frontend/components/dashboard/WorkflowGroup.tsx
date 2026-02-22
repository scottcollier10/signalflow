'use client';

/**
 * Workflow Group Component
 * Groups executions by workflow with neumorphic design
 * Phase 2: Added Compare Versions, sorting, optimized badges
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

  // Get latest and second-to-latest for comparison
  const latestExecution = sortedExecutions[0];
  const previousExecution = sortedExecutions[1];

  // Detect "optimized" executions (faster than average of previous runs)
  const optimizedExecutions = useMemo(() => {
    if (sortedExecutions.length < 2) return new Set<string>();

    const optimized = new Set<string>();

    // Calculate average duration of all executions
    const durationsWithId = sortedExecutions
      .filter(e => e.duration_ms !== undefined)
      .map(e => ({ id: e.id, duration: e.duration_ms! }));

    if (durationsWithId.length < 2) return optimized;

    // Mark executions that are significantly faster than the previous one
    for (let i = 0; i < durationsWithId.length - 1; i++) {
      const current = durationsWithId[i];
      const previous = durationsWithId[i + 1];

      // If current is 30%+ faster than previous, mark as optimized
      if (current.duration < previous.duration * 0.7) {
        optimized.add(current.id);
      }
    }

    return optimized;
  }, [sortedExecutions]);

  // Build compare URL with the two most recent executions
  const compareUrl = hasMultipleExecutions
    ? `/comparison?exec_a=${previousExecution?.id}&exec_b=${latestExecution?.id}`
    : null;

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
              {optimizedExecutions.size > 0 && (
                <span className="badge-info text-xs">
                  ⚡ {optimizedExecutions.size} optimized
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

          {/* Executions - indented with left border */}
          <div className="pl-4 border-l-2 border-neu-accent/20 ml-2">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {sortedExecutions.map((execution, index) => (
                <div key={execution.id} className="relative">
                  {/* Optimized Badge */}
                  {optimizedExecutions.has(execution.id) && (
                    <div className="absolute -top-2 -right-2 z-10">
                      <span className="badge-success text-xs px-2 py-1 flex items-center gap-1 shadow-lg">
                        ⚡ Optimized
                      </span>
                    </div>
                  )}
                  {/* Latest Badge */}
                  {index === 0 && (
                    <div className="absolute -top-2 -left-2 z-10">
                      <span className="badge-info text-xs px-2 py-1">
                        Latest
                      </span>
                    </div>
                  )}
                  <ExecutionCard
                    execution={execution}
                    onDelete={onDeleteExecution}
                    animationDelay={index}
                  />
                </div>
              ))}
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
                    (#{previousExecution?.n8n_execution_id?.slice(-4) || previousExecution?.id.slice(-4)} → #{latestExecution?.n8n_execution_id?.slice(-4) || latestExecution?.id.slice(-4)})
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
