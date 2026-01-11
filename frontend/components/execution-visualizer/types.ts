/**
 * Type definitions for execution visualizer
 */

import { Node as ReactFlowNode, Edge as ReactFlowEdge } from 'reactflow';

// Node execution state
export type NodeState = 'idle' | 'executing' | 'completed' | 'error';

// Node data for React Flow
export interface ExecutionNodeData {
  label: string;
  nodeType: string;
  state: NodeState;
  duration: number | null;
  itemsProcessed?: number;
  errorMessage?: string;
}

// Execution event from API
export interface ExecutionEvent {
  id: string;
  execution_id: string;
  node_id: string;
  event_type: 'started' | 'finished' | 'error' | 'retry' | 'skipped';
  timestamp: string;
  duration_ms: number | null;
  status: 'success' | 'error' | 'timeout' | null;
  error_message: string | null;
  retry_attempt: number;
  items_processed: number;
  sequence_order: number;
  metadata: Record<string, any>;
}

// Node from API
export interface ApiNode {
  id: string;
  type: string;
  position: {
    x: number;
    y: number;
  };
  data: {
    label: string;
    nodeType: string;
    parameters: Record<string, any>;
    disabled: boolean;
    notesInFlow: boolean;
    notes: string;
    execution?: {
      executed: boolean;
      status?: string;
      started_at?: string;
      finished_at?: string;
      duration_ms?: number;
      items_processed?: number;
      error_message?: string;
      retry_attempt?: number;
      event_count?: number;
    };
  };
}

// Edge from API
export interface ApiEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  sourceHandle: string;
  targetHandle: string;
  data: {
    connectionType: string;
  };
}

// Execution data from API
export interface ExecutionData {
  execution_id: string;
  workflow_id: string;
  n8n_execution_id: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  duration_ms: number | null;
  nodes: ApiNode[];
  edges: ApiEdge[];
  events: ExecutionEvent[];
  node_count: number;
  edge_count: number;
  event_count: number;
}

// Playback state
export interface PlaybackState {
  isPlaying: boolean;
  currentEventIndex: number;
  speed: number;  // 1x, 2x, 5x, 10x
  progress: number;  // 0-100%
}

// Node state info for playback
export interface NodeStateInfo {
  state: NodeState;
  duration: number | null;
  itemsProcessed?: number;
  errorMessage?: string;
}

// Playback controls
export interface PlaybackControls {
  play: () => void;
  pause: () => void;
  reset: () => void;
  setSpeed: (speed: number) => void;
  seekTo: (eventIndex: number) => void;
}

// React Flow node type
export type ExecutionFlowNode = ReactFlowNode<ExecutionNodeData>;

// React Flow edge type
export type ExecutionFlowEdge = ReactFlowEdge;
