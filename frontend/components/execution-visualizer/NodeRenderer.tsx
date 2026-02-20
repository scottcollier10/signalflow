'use client';

/**
 * Custom node component for React Flow
 * Displays node state with visual feedback
 * Dark neumorphic styling
 */

import React from 'react';
import { Handle, Position } from 'reactflow';
import { ExecutionNodeData } from './types';
import { formatDuration } from './utils';

interface ExecutionNodeProps {
  data: ExecutionNodeData;
}

export function ExecutionNode({ data }: ExecutionNodeProps) {
  const getNodeStyle = () => {
    switch (data.state) {
      case 'executing':
        return 'border-neu-accent bg-neu-accent/10 animate-pulse';
      case 'completed':
        return 'border-neu-green bg-neu-green/10';
      case 'error':
        return 'border-neu-coral bg-neu-coral/10';
      default:
        return 'border-neu-shadow-light bg-neu-bg';
    }
  };

  const getStateIcon = () => {
    switch (data.state) {
      case 'executing':
        return (
          <div className="w-2 h-2 bg-neu-accent rounded-full animate-pulse" />
        );
      case 'completed':
        return (
          <svg className="w-4 h-4 text-neu-green" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-neu-coral" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`px-4 py-3 rounded-xl border-2 min-w-[180px] transition-all shadow-neu-raised-sm ${getNodeStyle()}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-neu-accent !border-neu-bg"
      />

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <div className="font-medium text-sm text-neu-text">{data.label}</div>
          <div className="text-xs text-neu-text-muted mt-0.5">{data.nodeType}</div>
        </div>
        {getStateIcon()}
      </div>

      {data.duration !== null && data.duration !== undefined && (
        <div className="text-xs text-neu-text-muted mt-2 flex items-center gap-2">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {formatDuration(data.duration)}
        </div>
      )}

      {data.itemsProcessed !== undefined && data.itemsProcessed > 0 && (
        <div className="text-xs text-neu-text-muted mt-1">
          {data.itemsProcessed} items
        </div>
      )}

      {data.errorMessage && (
        <div className="text-xs text-neu-coral mt-1 truncate" title={data.errorMessage}>
          {data.errorMessage}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-neu-accent !border-neu-bg"
      />
    </div>
  );
}
