'use client';

/**
 * Execution playback test page
 * Redirects to dashboard if no test execution exists,
 * otherwise shows playback for most recent execution
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ExecutionVisualizer } from '@/components/execution-visualizer';

interface ExecutionInfo {
  id: string;
  workflow_id: string;
}

export default function ExecutionTestPage() {
  const router = useRouter();
  const [execution, setExecution] = useState<ExecutionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLatestExecution = async () => {
      try {
        const response = await fetch('http://localhost:8001/api/executions?limit=1');
        if (!response.ok) {
          throw new Error('Failed to fetch executions');
        }
        const data = await response.json();
        const executions = Array.isArray(data) ? data : (data.executions || data.data || []);

        if (executions.length > 0) {
          setExecution({
            id: executions[0].id,
            workflow_id: executions[0].workflow_id,
          });
        } else {
          // No executions, redirect to import
          router.push('/import');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    };

    fetchLatestExecution();
  }, [router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading execution...</p>
        </div>
      </div>
    );
  }

  if (error || !execution) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No executions found</h3>
          <p className="mt-2 text-sm text-gray-600">{error || 'Import an execution to view playback'}</p>
          <a
            href="/import"
            className="mt-4 inline-block px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Import Execution
          </a>
        </div>
      </div>
    );
  }

  return (
    <ExecutionVisualizer
      workflowId={execution.workflow_id}
      executionId={execution.id}
      apiBaseUrl="http://localhost:8001"
    />
  );
}
