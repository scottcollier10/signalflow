'use client';

/**
 * React Flow canvas wrapper
 * Renders the workflow graph with custom nodes and bottleneck highlighting
 */

import React, { useMemo, useCallback } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  NodeTypes,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ExecutionFlowNode, ExecutionFlowEdge } from './types';
import { ExecutionNode } from './NodeRenderer';
import { Bottleneck } from '@/lib/api/analysis';

interface WorkflowCanvasProps {
  nodes: ExecutionFlowNode[];
  edges: ExecutionFlowEdge[];
  bottlenecks?: Bottleneck[];
  onNodeClick?: (node: Node) => void;
  selectedNodeId?: string | null;
}

// Severity color mapping for bottleneck highlighting
const getSeverityStyles = (severity: string | null): React.CSSProperties => {
  switch (severity) {
    case 'severe':
      return {
        border: '3px solid #ef4444',
        boxShadow: '0 0 12px rgba(239, 68, 68, 0.4)',
      };
    case 'high':
      return {
        border: '3px solid #f97316',
        boxShadow: '0 0 10px rgba(249, 115, 22, 0.4)',
      };
    case 'medium':
      return {
        border: '2px solid #eab308',
        boxShadow: '0 0 8px rgba(234, 179, 8, 0.3)',
      };
    case 'low':
      return {
        border: '2px solid #6b7280',
        boxShadow: 'none',
      };
    default:
      return {};
  }
};

// Find bottleneck for a node by matching node_name to label
const getNodeBottleneck = (node: ExecutionFlowNode, bottlenecks: Bottleneck[]): Bottleneck | undefined => {
  const nodeLabel = node.data?.label?.toLowerCase();
  const nodeId = node.id?.toLowerCase();

  return bottlenecks.find(b => {
    const bottleneckName = b.node_name?.toLowerCase();
    const bottleneckId = b.node_id?.toLowerCase();

    return (
      bottleneckName === nodeLabel ||
      bottleneckId === nodeId ||
      bottleneckId === nodeLabel ||
      bottleneckName === nodeId
    );
  });
};

// Severity Legend component - Dark neumorphic theme
function SeverityLegend() {
  return (
    <div className="neu-raised-sm backdrop-blur rounded-lg p-3 text-sm">
      <div className="font-medium mb-2 text-neu-text">Bottleneck Severity</div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-neu-coral" style={{ boxShadow: '0 0 6px rgba(240, 139, 122, 0.5)' }} />
          <span className="text-neu-text-muted">Severe (90-100)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-neu-orange" style={{ boxShadow: '0 0 6px rgba(240, 149, 106, 0.5)' }} />
          <span className="text-neu-text-muted">High (70-89)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-neu-yellow" />
          <span className="text-neu-text-muted">Medium (50-69)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-neu-border" />
          <span className="text-neu-text-muted">Low (0-49)</span>
        </div>
      </div>
      <div className="mt-3 pt-2 border-t border-neu-border text-xs text-neu-text-muted">
        Click any node to see details
      </div>
    </div>
  );
}

export function WorkflowCanvas({
  nodes,
  edges,
  bottlenecks = [],
  onNodeClick,
  selectedNodeId
}: WorkflowCanvasProps) {
  // Apply bottleneck styling to nodes
  const styledNodes = useMemo(() => {
    return nodes.map(node => {
      const bottleneck = getNodeBottleneck(node, bottlenecks);
      const severityStyles = getSeverityStyles(bottleneck?.severity || null);
      const isSelected = selectedNodeId === node.id;

      return {
        ...node,
        style: {
          ...node.style,
          ...severityStyles,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          // Add selection ring
          ...(isSelected ? {
            outline: '3px solid #8b5cf6',
            outlineOffset: '2px',
          } : {}),
        },
        data: {
          ...node.data,
          bottleneck,
          hasBottleneck: !!bottleneck,
          isSelected,
        },
      };
    });
  }, [nodes, bottlenecks, selectedNodeId]);

  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(styledNodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Update nodes when props change
  React.useEffect(() => {
    setFlowNodes(styledNodes);
  }, [styledNodes, setFlowNodes]);

  // Update edges when props change
  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  // Handle node click
  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (onNodeClick) {
      onNodeClick(node);
    }
  }, [onNodeClick]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      executionNode: ExecutionNode,
    }),
    []
  );

  // Get minimap node color based on bottleneck severity
  const getMinimapColor = useCallback((node: Node) => {
    const data = node.data as any;

    // If has bottleneck, show severity color
    if (data.hasBottleneck && data.bottleneck) {
      switch (data.bottleneck.severity) {
        case 'severe': return '#ef4444';
        case 'high': return '#f97316';
        case 'medium': return '#eab308';
        case 'low': return '#6b7280';
      }
    }

    // Otherwise show execution state color
    switch (data.state) {
      case 'executing': return '#3b82f6';
      case 'completed': return '#10b981';
      case 'error': return '#ef4444';
      default: return '#d1d5db';
    }
  }, []);

  const hasBottlenecks = bottlenecks.length > 0;

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        style={{ backgroundColor: '#1e2028' }}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: { stroke: '#a89be0', strokeWidth: 2 },
        }}
      >
        <Background color="#282c38" gap={16} />
        <Controls className="react-flow-controls-dark" />
        <MiniMap
          nodeColor={getMinimapColor}
          nodeStrokeWidth={3}
          zoomable
          pannable
          maskColor="rgba(30, 32, 40, 0.8)"
          style={{ backgroundColor: '#1e2028' }}
        />

        {/* Severity Legend - only show when bottlenecks exist */}
        {hasBottlenecks && (
          <Panel position="top-right">
            <SeverityLegend />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
