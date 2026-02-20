'use client';

/**
 * Dashboard Page
 * Shows all executions grouped by workflow with neumorphic design
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';
import { ExecutionCard, WorkflowGroup, ExecutionData } from '@/components/dashboard';
import { StepProgress } from '@/components/StepProgress';

type FilterType = 'all' | 'success' | 'error';
type GroupBy = 'workflow' | 'date' | 'none';

interface WorkflowInfo {
  id: string;
  name?: string;
}

export default function DashboardPage() {
  const [executions, setExecutions] = useState<ExecutionData[]>([]);
  const [workflows, setWorkflows] = useState<Map<string, WorkflowInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [groupBy, setGroupBy] = useState<GroupBy>('workflow');

  useEffect(() => {
    fetchExecutions();
  }, []);

  const fetchExecutions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all executions
      const response = await fetch('http://localhost:8001/api/executions');

      if (!response.ok) {
        throw new Error('Failed to fetch executions');
      }

      const data = await response.json();

      // Handle both array response and wrapped response
      const executionsList = Array.isArray(data) ? data : (data.executions || data.data || []);

      // Transform to our format
      const transformed: ExecutionData[] = executionsList.map((exec: Record<string, unknown>) => ({
        id: exec.id as string,
        workflow_id: exec.workflow_id as string,
        workflow_name: (exec.workflow as { name?: string })?.name || undefined,
        n8n_execution_id: exec.n8n_execution_id as string | undefined,
        status: (exec.status as 'success' | 'error' | 'running' | 'waiting') || 'success',
        started_at: exec.started_at as string,
        finished_at: exec.finished_at as string | undefined,
        duration_ms: exec.duration_ms as number | undefined,
        node_count: exec.node_count as number | undefined,
        error_count: exec.error_count as number | undefined,
      }));

      setExecutions(transformed);

      // Build workflow map
      const workflowMap = new Map<string, WorkflowInfo>();
      for (const exec of transformed) {
        if (!workflowMap.has(exec.workflow_id)) {
          workflowMap.set(exec.workflow_id, {
            id: exec.workflow_id,
            name: exec.workflow_name,
          });
        }
      }
      setWorkflows(workflowMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load executions');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExecution = async (id: string) => {
    if (!confirm('Are you sure you want to delete this execution?')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8001/api/executions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 404) {
        // Remove from local state
        setExecutions(prev => prev.filter(e => e.id !== id));
      } else {
        throw new Error('Failed to delete execution');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete execution');
    }
  };

  // Filter executions
  const filteredExecutions = executions.filter(exec => {
    if (filter === 'all') return true;
    if (filter === 'success') return exec.status === 'success';
    if (filter === 'error') return exec.status === 'error';
    return true;
  });

  // Group executions
  const groupedExecutions = () => {
    if (groupBy === 'none') {
      return null;
    }

    if (groupBy === 'workflow') {
      const groups = new Map<string, ExecutionData[]>();
      for (const exec of filteredExecutions) {
        const key = exec.workflow_id;
        if (!groups.has(key)) {
          groups.set(key, []);
        }
        groups.get(key)!.push(exec);
      }
      return groups;
    }

    // Group by date
    const groups = new Map<string, ExecutionData[]>();
    for (const exec of filteredExecutions) {
      const date = new Date(exec.started_at);
      const key = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(exec);
    }
    return groups;
  };

  const groups = groupedExecutions();

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto">
        {/* Step Progress - Always at top when visible */}
        {executions.length < 3 && (
          <StepProgress executionCount={executions.length} className="mb-6" />
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-4xl font-bold text-neu-text mb-2">
              Execution Dashboard
            </h1>
            <p className="text-neu-text-muted font-body">
              {executions.length} execution{executions.length !== 1 ? 's' : ''} across {workflows.size} workflow{workflows.size !== 1 ? 's' : ''}
            </p>
          </div>

          <Link
            href="/import"
            className="btn-primary inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Execution
          </Link>
        </div>

        {/* Filters */}
        <div className="neu-raised p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neu-text-muted">Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="select-neu"
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-neu-text-muted">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="select-neu"
              >
                <option value="workflow">Workflow</option>
                <option value="date">Date</option>
                <option value="none">None</option>
              </select>
            </div>

            <button
              onClick={fetchExecutions}
              className="btn-icon ml-auto"
              title="Refresh"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="neu-flat p-12 flex items-center justify-center">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-neu-accent mb-4"></div>
              <p className="text-neu-text-muted font-body">Loading executions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="neu-flat p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-neu-coral/10 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-neu-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="font-display text-xl font-semibold text-neu-text mb-2">Failed to load executions</h3>
            <p className="text-neu-text-muted mb-6">{error}</p>
            <button
              onClick={fetchExecutions}
              className="btn-secondary"
            >
              Try Again
            </button>
          </div>
        ) : executions.length === 0 ? (
          <div className="neu-flat p-12 text-center max-w-3xl mx-auto">
              <div className="w-20 h-20 rounded-full bg-neu-accent/10 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-neu-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="font-display text-2xl font-semibold text-neu-text mb-2">No executions yet</h3>
              <p className="text-neu-text-muted mb-6 max-w-md mx-auto">
                Import your first n8n execution to get started with analysis.
              </p>
              <Link
                href="/import"
                className="btn-primary inline-flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import Execution
              </Link>
            </div>
        ) : groups === null ? (
          // Ungrouped view
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredExecutions.map((execution, index) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                onDelete={handleDeleteExecution}
                showWorkflow
                animationDelay={index}
              />
            ))}
            </div>
          </div>
        ) : (
          // Grouped view
          <div className="space-y-6">
            {Array.from(groups.entries()).map(([key, groupExecs]) => (
              groupBy === 'workflow' ? (
                <WorkflowGroup
                  key={key}
                  workflowId={key}
                  workflowName={workflows.get(key)?.name}
                  executions={groupExecs}
                  onDeleteExecution={handleDeleteExecution}
                />
              ) : (
                <div key={key} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-8 rounded-full bg-gradient-to-b from-neu-accent to-neu-accent-light" />
                    <h3 className="font-display text-xl font-semibold text-neu-text flex items-center gap-3">
                      <svg className="w-5 h-5 text-neu-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {key}
                      <span className="text-sm font-normal text-neu-text-muted">
                        ({groupExecs.length} execution{groupExecs.length !== 1 ? 's' : ''})
                      </span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {groupExecs.map((execution, index) => (
                      <ExecutionCard
                        key={execution.id}
                        execution={execution}
                        onDelete={handleDeleteExecution}
                        showWorkflow
                        animationDelay={index}
                      />
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
