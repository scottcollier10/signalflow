'use client';

/**
 * Dashboard Page
 * Shows all executions grouped by workflow
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '@/components/layout';
import { ExecutionCard, WorkflowGroup, ExecutionData } from '@/components/dashboard';

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
      const response = await fetch('http://localhost:8000/api/executions');

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
      const response = await fetch(`http://localhost:8000/api/executions/${id}`, {
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Execution Dashboard</h1>
            <p className="text-gray-500 mt-1">
              {executions.length} execution{executions.length !== 1 ? 's' : ''} across {workflows.size} workflow{workflows.size !== 1 ? 's' : ''}
            </p>
          </div>

          <Link
            href="/import"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Execution
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Status:</label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All</option>
                <option value="success">Success</option>
                <option value="error">Error</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mr-2">Group by:</label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as GroupBy)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="workflow">Workflow</option>
                <option value="date">Date</option>
                <option value="none">None</option>
              </select>
            </div>

            <button
              onClick={fetchExecutions}
              className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600">Loading executions...</p>
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <svg className="mx-auto h-12 w-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-lg font-medium text-red-800 mb-2">Failed to load executions</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={fetchExecutions}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
            >
              Try Again
            </button>
          </div>
        ) : executions.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
            <svg className="mx-auto h-16 w-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No executions yet</h3>
            <p className="text-gray-500 mb-6">Import your first n8n execution to get started with analysis.</p>
            <Link
              href="/import"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Import Execution
            </Link>
          </div>
        ) : groups === null ? (
          // Ungrouped view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExecutions.map((execution) => (
              <ExecutionCard
                key={execution.id}
                execution={execution}
                onDelete={handleDeleteExecution}
                showWorkflow
              />
            ))}
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
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {key}
                    <span className="text-sm font-normal text-gray-500">({groupExecs.length} execution{groupExecs.length !== 1 ? 's' : ''})</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {groupExecs.map((execution) => (
                      <ExecutionCard
                        key={execution.id}
                        execution={execution}
                        onDelete={handleDeleteExecution}
                        showWorkflow
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
