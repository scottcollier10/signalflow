'use client';

/**
 * Workflow Group Component
 * Groups executions by workflow with expandable sections
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
  defaultExpanded = false,
}: WorkflowGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const successCount = executions.filter(e => e.status === 'success').length;
  const errorCount = executions.filter(e => e.status === 'error').length;

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header - Clickable to expand/collapse */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-gray-900">
              {workflowName || `Workflow ${workflowId.slice(0, 8)}...`}
            </h3>
            <p className="text-sm text-gray-500">
              {executions.length} execution{executions.length !== 1 ? 's' : ''}
              {successCount > 0 && (
                <span className="ml-2 text-green-600">{successCount} passed</span>
              )}
              {errorCount > 0 && (
                <span className="ml-2 text-red-600">{errorCount} failed</span>
              )}
            </p>
          </div>
        </div>

        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Executions Grid */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-gray-100">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {executions.map((execution) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                onDelete={onDeleteExecution}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
