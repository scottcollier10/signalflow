'use client';

/**
 * Main execution visualizer container
 * Loads execution data and orchestrates playback
 */

import React, { useState, useEffect, useMemo } from 'react';
import { ExecutionData, ExecutionFlowNode } from './types';
import { transformToReactFlowNodes, transformToReactFlowEdges } from './utils';
import { useExecutionPlayback } from './hooks/useExecutionPlayback';
import { WorkflowCanvas } from './WorkflowCanvas';
import { PlaybackControls } from './PlaybackControls';

interface ExecutionVisualizerProps {
  workflowId: string;
  executionId: string;
  apiBaseUrl?: string;
}

export function ExecutionVisualizer({
  workflowId,
  executionId,
  apiBaseUrl = 'http://localhost:8000'
}: ExecutionVisualizerProps) {
  const [data, setData] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load execution data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `${apiBaseUrl}/api/workflows/${workflowId}/executions/${executionId}`
        );

        if (!response.ok) {
          throw new Error(`Failed to load execution: ${response.statusText}`);
        }

        const executionData = await response.json();
        setData(executionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workflowId, executionId, apiBaseUrl]);

  // Transform data to React Flow format
  const { nodes: baseNodes, edges } = useMemo(() => {
    if (!data) {
      return { nodes: [], edges: [] };
    }

    return {
      nodes: transformToReactFlowNodes(data.nodes),
      edges: transformToReactFlowEdges(data.edges),
    };
  }, [data]);

  // Debug logging
  React.useEffect(() => {
    console.log('[ExecutionVisualizer] Data and nodes:', {
      hasData: !!data,
      nodeCount: baseNodes.length,
      eventCount: data?.events?.length || 0
    });
  }, [data, baseNodes]);

  // Playback hook
  const { playbackState, nodeStates, controls } = useExecutionPlayback(
    data?.events || [],
    baseNodes
  );

  // Update node data with current states
  const updatedNodes = useMemo(() => {
    return baseNodes.map(node => {
      const nodeState = nodeStates.get(node.id);

      if (!nodeState) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          state: nodeState.state,
          duration: nodeState.duration,
          itemsProcessed: nodeState.itemsProcessed,
          errorMessage: nodeState.errorMessage,
        },
      } as ExecutionFlowNode;
    });
  }, [baseNodes, nodeStates]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">Loading execution data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <svg className="mx-auto h-12 w-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Failed to load execution</h3>
          <p className="mt-2 text-sm text-gray-600">{error || 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Execution Playback
            </h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {data.node_count} nodes
              </span>
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {data.event_count} events
              </span>
              <span className={`flex items-center gap-1 font-medium ${
                data.status === 'success' ? 'text-green-600' :
                data.status === 'error' ? 'text-red-600' :
                'text-gray-600'
              }`}>
                {data.status === 'success' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
                {data.status === 'error' && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                )}
                Status: {data.status}
              </span>
              {data.duration_ms && (
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {(data.duration_ms / 1000).toFixed(2)}s
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`/execution/${executionId}/analysis`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              View Analysis
            </a>
            <div className="text-xs text-gray-500">
              <div>Workflow ID: {workflowId}</div>
              <div>Execution ID: {executionId}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 overflow-hidden">
        <WorkflowCanvas nodes={updatedNodes} edges={edges} />
      </div>

      {/* Playback Controls */}
      <PlaybackControls
        state={playbackState}
        controls={controls}
        totalEvents={data.events.length}
      />
    </div>
  );
}
