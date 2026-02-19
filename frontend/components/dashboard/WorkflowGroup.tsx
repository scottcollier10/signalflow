'use client';

/**
 * Workflow Group Component
 * Groups executions by workflow with neumorphic design
 */

import { useState } from 'react';
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

  const successCount = executions.filter(e => e.status === 'success').length;
  const errorCount = executions.filter(e => e.status === 'error').length;

  return (
    <div className="neu-raised">
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between gap-4 hover:bg-neu-shadow-light/10 transition-colors rounded-neu-lg"
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
            <h3 className="font-display font-semibold text-lg text-neu-text">
              {workflowName || `Workflow ${workflowId.slice(0, 8)}...`}
            </h3>
            <p className="text-sm text-neu-text-muted mt-0.5">
              {executions.length} execution{executions.length !== 1 ? 's' : ''}
              {successCount > 0 && (
                <span className="ml-2 text-neu-green">{successCount} passed</span>
              )}
              {errorCount > 0 && (
                <span className="ml-2 text-neu-coral">{errorCount} failed</span>
              )}
            </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {executions.map((execution, index) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                onDelete={onDeleteExecution}
                animationDelay={index}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
