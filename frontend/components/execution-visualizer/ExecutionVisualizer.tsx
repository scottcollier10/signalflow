'use client';

/**
 * Main execution visualizer container
 * Loads execution data and orchestrates playback with bottleneck highlighting
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Node } from 'reactflow';
import { ExecutionData, ExecutionFlowNode } from './types';
import { transformToReactFlowNodes, transformToReactFlowEdges } from './utils';
import { useExecutionPlayback } from './hooks/useExecutionPlayback';
import { WorkflowCanvas } from './WorkflowCanvas';
import { PlaybackControls } from './PlaybackControls';
import { NodeDetailPanel } from './NodeDetailPanel';
import {
  Bottleneck,
  Recommendation,
  fetchBottlenecks,
  fetchRecommendations,
} from '@/lib/api/analysis';

interface ExecutionVisualizerProps {
  workflowId: string;
  executionId: string;
  apiBaseUrl?: string;
  onBack?: () => void;
  // Optional: pass bottlenecks/recommendations from parent to avoid re-fetching
  initialBottlenecks?: Bottleneck[];
  initialRecommendations?: Recommendation[];
  workflowName?: string;
}

export function ExecutionVisualizer({
  workflowId,
  executionId,
  apiBaseUrl = 'http://localhost:8001',
  onBack,
  initialBottlenecks,
  initialRecommendations,
  workflowName: initialWorkflowName,
}: ExecutionVisualizerProps) {
  const [data, setData] = useState<ExecutionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bottleneck and recommendation data
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>(initialBottlenecks || []);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(initialRecommendations || []);
  const [workflowName, setWorkflowName] = useState(initialWorkflowName || '');

  // Node detail panel state
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showNodePanel, setShowNodePanel] = useState(false);

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

        // Extract workflow name if available
        if (executionData.workflow_name && !initialWorkflowName) {
          setWorkflowName(executionData.workflow_name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [workflowId, executionId, apiBaseUrl, initialWorkflowName]);

  // Load bottlenecks if not provided
  useEffect(() => {
    if (initialBottlenecks) return;

    const loadBottlenecks = async () => {
      try {
        const result = await fetchBottlenecks(apiBaseUrl, workflowId, executionId);
        setBottlenecks(result.bottlenecks);
      } catch (err) {
        console.warn('Failed to load bottlenecks:', err);
      }
    };

    loadBottlenecks();
  }, [apiBaseUrl, workflowId, executionId, initialBottlenecks]);

  // Load recommendations if not provided
  useEffect(() => {
    if (initialRecommendations) return;

    const loadRecommendations = async () => {
      try {
        const result = await fetchRecommendations(apiBaseUrl, workflowId, executionId);
        setRecommendations(result.recommendations);
      } catch (err) {
        console.warn('Failed to load recommendations:', err);
      }
    };

    loadRecommendations();
  }, [apiBaseUrl, workflowId, executionId, initialRecommendations]);

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

  // Get bottleneck for a specific node
  const getNodeBottleneck = useCallback((node: Node): Bottleneck | null => {
    const nodeLabel = (node.data?.label || '').toLowerCase();
    const nodeId = node.id.toLowerCase();

    return bottlenecks.find(b => {
      const bottleneckName = (b.node_name || '').toLowerCase();
      const bottleneckId = (b.node_id || '').toLowerCase();

      return (
        bottleneckName === nodeLabel ||
        bottleneckId === nodeId ||
        bottleneckId === nodeLabel ||
        bottleneckName === nodeId
      );
    }) || null;
  }, [bottlenecks]);

  // Get recommendations for a specific node
  const getNodeRecommendations = useCallback((node: Node): Recommendation[] => {
    const nodeLabel = (node.data?.label || '').toLowerCase();
    const nodeId = node.id.toLowerCase();

    return recommendations.filter(r => {
      const affectedNodes = r.affected_node_ids || [];
      return affectedNodes.some(id => {
        const affectedId = id.toLowerCase();
        return affectedId === nodeLabel || affectedId === nodeId;
      });
    });
  }, [recommendations]);

  // Handle node click
  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
    setShowNodePanel(true);
  }, []);

  // Close node panel
  const handleClosePanel = useCallback(() => {
    setShowNodePanel(false);
    setSelectedNode(null);
  }, []);

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

  // Get selected node's bottleneck and recommendations
  const selectedBottleneck = selectedNode ? getNodeBottleneck(selectedNode) : null;
  const selectedRecommendations = selectedNode ? getNodeRecommendations(selectedNode) : [];

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="flex-shrink-0 bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
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
              {bottlenecks.length > 0 && (
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {bottlenecks.length} bottlenecks
                </span>
              )}
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
          </div>

          <div className="flex items-center gap-3">
            {onBack ? (
              <button
                onClick={onBack}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Back to Analysis
              </button>
            ) : (
              <a
                href={`/execution/${executionId}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                View Analysis
              </a>
            )}
            <a
              href="/dashboard"
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </a>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <WorkflowCanvas
          nodes={updatedNodes}
          edges={edges}
          bottlenecks={bottlenecks}
          onNodeClick={handleNodeClick}
          selectedNodeId={selectedNode?.id || null}
        />

        {/* Node Detail Panel */}
        {showNodePanel && selectedNode && (
          <NodeDetailPanel
            node={selectedNode}
            bottleneck={selectedBottleneck}
            recommendations={selectedRecommendations}
            onClose={handleClosePanel}
            executionId={executionId}
            workflowName={workflowName || `Workflow ${workflowId.slice(0, 8)}`}
          />
        )}
      </div>

      {/* Playback Controls - Always visible at bottom */}
      <PlaybackControls
        state={playbackState}
        controls={controls}
        totalEvents={data.events.length}
      />
    </div>
  );
}
