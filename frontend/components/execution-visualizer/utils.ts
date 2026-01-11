/**
 * Utility functions for transforming API data to React Flow format
 */

import {
  ExecutionFlowNode,
  ExecutionFlowEdge,
  ApiNode,
  ApiEdge,
  ExecutionNodeData
} from './types';

/**
 * Transform API nodes to React Flow nodes
 */
export function transformToReactFlowNodes(apiNodes: ApiNode[]): ExecutionFlowNode[] {
  return apiNodes.map(node => {
    // Ensure position is valid, fallback to (0, 0) if not
    const position = node.position &&
                     typeof node.position.x === 'number' &&
                     typeof node.position.y === 'number'
      ? node.position
      : { x: 0, y: 0 };

    return {
      id: node.id,
      type: 'executionNode',  // Custom node type
      position,
      data: {
        label: node.data.label,
        nodeType: node.data.nodeType,
        state: 'idle',  // Initial state
        duration: null,
        itemsProcessed: 0,
      } as ExecutionNodeData,
    };
  });
}

/**
 * Transform API edges to React Flow edges
 */
export function transformToReactFlowEdges(apiEdges: ApiEdge[]): ExecutionFlowEdge[] {
  return apiEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'default',
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
  }));
}

/**
 * Calculate delay between two events in milliseconds
 */
export function calculateDelay(currentTimestamp: string, nextTimestamp: string): number {
  const currentTime = new Date(currentTimestamp).getTime();
  const nextTime = new Date(nextTimestamp).getTime();
  return Math.max(0, nextTime - currentTime);
}

/**
 * Format duration in milliseconds to human-readable string
 */
export function formatDuration(ms: number | null): string {
  if (ms === null || ms === undefined) return 'N/A';

  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

/**
 * Get color for node state
 */
export function getNodeStateColor(state: string): string {
  switch (state) {
    case 'executing':
      return '#3b82f6'; // blue
    case 'completed':
      return '#10b981'; // green
    case 'error':
      return '#ef4444'; // red
    default:
      return '#d1d5db'; // gray
  }
}
