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
  // When true, renders as embedded tab content (no header, fixed height)
  embedded?: boolean;
  // When true, reduces height to account for StepProgress boxes above
  hasStepProgress?: boolean;
}

export function ExecutionVisualizer({
  workflowId,
  executionId,
  apiBaseUrl = 'http://localhost:8001',
  onBack,
  initialBottlenecks,
  initialRecommendations,
  workflowName: initialWorkflowName,
  embedded = false,
  hasStepProgress = false,
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
      <div className={`${embedded ? 'h-[600px]' : 'h-full'} flex items-center justify-center bg-neu-bg rounded-xl`}>
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neu-accent"></div>
          <p className="mt-4 text-neu-text-muted">Loading execution data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className={`${embedded ? 'h-[600px]' : 'h-full'} flex items-center justify-center bg-neu-bg rounded-xl`}>
        <div className="text-center max-w-md">
          <svg className="mx-auto h-12 w-12 text-neu-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-neu-text">Failed to load execution</h3>
          <p className="mt-2 text-sm text-neu-text-muted">{error || 'Unknown error'}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-neu-accent text-white rounded-lg hover:bg-neu-accent-light"
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

  // Embedded mode: renders as tab content with viewport-constrained height
  // Subtract more height when StepProgress boxes are visible above
  const heightOffset = hasStepProgress ? 480 : 350;

  if (embedded) {
    return (
      <div
        className="grid bg-neu-bg rounded-xl"
        style={{
          height: `calc(100dvh - ${heightOffset}px)`,
          minHeight: '400px',
          gridTemplateRows: 'auto 1fr auto',
        }}
      >
        {/* Compact Header with metadata */}
        <div className="neu-raised-sm px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-neu-text-muted">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              {data.node_count} nodes
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {data.event_count} events
            </span>
            {bottlenecks.length > 0 && (
              <span className="flex items-center gap-1.5 text-neu-orange font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {bottlenecks.length} bottlenecks
              </span>
            )}
            <span className={`flex items-center gap-1.5 font-medium ${
              data.status === 'success' ? 'text-neu-green' :
              data.status === 'error' ? 'text-neu-coral' :
              'text-neu-text-muted'
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
              {data.status}
            </span>
            {data.duration_ms && (
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {(data.duration_ms / 1000).toFixed(2)}s
              </span>
            )}
          </div>

          {/* Bottleneck Severity Legend */}
          <div className="flex items-center gap-3 text-xs">
            <span className="text-neu-text-muted">Severity:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-neu-coral"></div>
              <span className="text-neu-text-muted">Severe</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-neu-orange"></div>
              <span className="text-neu-text-muted">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-neu-yellow"></div>
              <span className="text-neu-text-muted">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-neu-green"></div>
              <span className="text-neu-text-muted">Low</span>
            </div>
          </div>
        </div>

        {/* Canvas - Fills middle row of grid */}
        <div className="overflow-hidden relative bg-neu-shadow-dark min-h-0">
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

        {/* Playback Controls - Sticky at bottom */}
        <PlaybackControls
          state={playbackState}
          controls={controls}
          totalEvents={data.events.length}
        />
      </div>
    );
  }

  // Full-page mode (standalone, outside tab system)
  return (
    <div className="h-full flex flex-col bg-neu-bg">
      {/* Playback Header */}
      <header className="flex-shrink-0 neu-raised-sm px-6 py-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 -ml-2 text-neu-text-muted hover:text-neu-accent hover:bg-neu-shadow-light/20 rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-xl font-display font-bold text-neu-text">
                Execution Playback
              </h1>
            <div className="mt-1 flex items-center gap-4 text-sm text-neu-text-muted">
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
                <span className="flex items-center gap-1 text-neu-orange font-medium">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {bottlenecks.length} bottlenecks
                </span>
              )}
              <span className={`flex items-center gap-1 font-medium ${
                data.status === 'success' ? 'text-neu-green' :
                data.status === 'error' ? 'text-neu-coral' :
                'text-neu-text-muted'
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
            {onBack && (
              <button
                onClick={onBack}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Back to Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Canvas */}
      <div className="flex-1 min-h-0 overflow-hidden relative bg-neu-shadow-dark">
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
