'use client';

/**
 * React Flow canvas wrapper
 * Renders the workflow graph with custom nodes
 */

import React, { useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { ExecutionFlowNode, ExecutionFlowEdge } from './types';
import { ExecutionNode } from './NodeRenderer';

interface WorkflowCanvasProps {
  nodes: ExecutionFlowNode[];
  edges: ExecutionFlowEdge[];
}

export function WorkflowCanvas({ nodes, edges }: WorkflowCanvasProps) {
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState(edges);

  // Debug logging
  React.useEffect(() => {
    console.log('[WorkflowCanvas] Nodes updated:', {
      total: nodes.length,
      withoutPosition: nodes.filter(n => !n.position || typeof n.position.x !== 'number').length,
      sample: nodes[0]
    });
  }, [nodes]);

  // Update nodes when props change
  React.useEffect(() => {
    setFlowNodes(nodes);
  }, [nodes, setFlowNodes]);

  // Update edges when props change
  React.useEffect(() => {
    setFlowEdges(edges);
  }, [edges, setFlowEdges]);

  const nodeTypes: NodeTypes = useMemo(
    () => ({
      executionNode: ExecutionNode,
    }),
    []
  );

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'default',
          animated: false,
          style: { stroke: '#94a3b8', strokeWidth: 2 },
        }}
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            switch (data.state) {
              case 'executing':
                return '#3b82f6';
              case 'completed':
                return '#10b981';
              case 'error':
                return '#ef4444';
              default:
                return '#d1d5db';
            }
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
        <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3">
          <div className="text-sm font-medium text-gray-700">Workflow Execution</div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
