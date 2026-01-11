'use client';

/**
 * Hook for managing execution playback state
 * Handles play/pause/speed controls and node state updates
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  ExecutionEvent,
  PlaybackState,
  NodeStateInfo,
  PlaybackControls,
  ExecutionFlowNode
} from '../types';
import { calculateDelay } from '../utils';

/**
 * Normalize node name to match event node_id format
 * Same logic as backend N8nExecutionParser._normalize_node_id()
 */
function normalizeNodeName(name: string): string {
  return name.toLowerCase().replace(/ /g, '_');
}

export function useExecutionPlayback(
  events: ExecutionEvent[],
  nodes: ExecutionFlowNode[]
) {
  // Create mapping from normalized node names (event node_ids) to actual node UUIDs
  const nodeIdMapping = useMemo(() => {
    const mapping = new Map<string, string>();

    if (!nodes || !Array.isArray(nodes)) {
      return mapping;
    }

    nodes.forEach(node => {
      const normalizedName = normalizeNodeName(node.data.label);
      mapping.set(normalizedName, node.id);
    });

    console.log('[useExecutionPlayback] Node ID mapping created:', {
      totalMappings: mapping.size,
      sample: Array.from(mapping.entries()).slice(0, 3)
    });

    return mapping;
  }, [nodes]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentEventIndex: 0,
    speed: 1,
    progress: 0,
  });

  const [nodeStates, setNodeStates] = useState<Map<string, NodeStateInfo>>(
    new Map()
  );

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Core playback loop
  useEffect(() => {
    if (!playbackState.isPlaying) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const currentEvent = events[playbackState.currentEventIndex];
    if (!currentEvent) {
      setPlaybackState(s => ({ ...s, isPlaying: false }));
      return;
    }

    // Update node state based on current event
    updateNodeState(currentEvent);

    // Calculate delay until next event
    const nextEvent = events[playbackState.currentEventIndex + 1];
    let delay = 100; // Default minimum delay

    if (nextEvent) {
      const realDelay = calculateDelay(currentEvent.timestamp, nextEvent.timestamp);
      // Cap maximum delay at 2 seconds for UX
      delay = Math.min(Math.max(realDelay, 50), 2000) / playbackState.speed;
    }

    timerRef.current = setTimeout(() => {
      setPlaybackState(s => ({
        ...s,
        currentEventIndex: s.currentEventIndex + 1,
        progress: ((s.currentEventIndex + 1) / events.length) * 100,
      }));
    }, delay);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [playbackState.isPlaying, playbackState.currentEventIndex, playbackState.speed, events]);

  const updateNodeState = useCallback((event: ExecutionEvent) => {
    setNodeStates(prev => {
      const updated = new Map(prev);

      // Map event node_id (normalized name) to actual node UUID
      const nodeUuid = nodeIdMapping.get(event.node_id);

      if (!nodeUuid) {
        console.warn(`[useExecutionPlayback] No UUID found for event node_id: ${event.node_id}`);
        return prev;
      }

      switch (event.event_type) {
        case 'started':
          updated.set(nodeUuid, {
            state: 'executing',
            duration: null,
            itemsProcessed: 0,
          });
          break;

        case 'finished':
          updated.set(nodeUuid, {
            state: event.status === 'error' ? 'error' : 'completed',
            duration: event.duration_ms,
            itemsProcessed: event.items_processed,
            errorMessage: event.error_message || undefined,
          });
          break;

        case 'error':
          updated.set(nodeUuid, {
            state: 'error',
            duration: event.duration_ms,
            itemsProcessed: event.items_processed,
            errorMessage: event.error_message || 'Unknown error',
          });
          break;

        case 'skipped':
          // Keep node in idle state for skipped events
          break;
      }

      return updated;
    });
  }, [nodeIdMapping]);

  const replayToIndex = useCallback((targetIndex: number) => {
    // Reset all node states
    setNodeStates(new Map());

    // Replay all events up to target index instantly
    for (let i = 0; i <= targetIndex && i < events.length; i++) {
      updateNodeState(events[i]);
    }

    setPlaybackState(s => ({
      ...s,
      currentEventIndex: targetIndex,
      progress: (targetIndex / events.length) * 100,
    }));
  }, [events, updateNodeState]);

  const controls: PlaybackControls = {
    play: useCallback(() => {
      setPlaybackState(s => ({ ...s, isPlaying: true }));
    }, []),

    pause: useCallback(() => {
      setPlaybackState(s => ({ ...s, isPlaying: false }));
    }, []),

    reset: useCallback(() => {
      setPlaybackState({
        isPlaying: false,
        currentEventIndex: 0,
        speed: 1,
        progress: 0,
      });
      setNodeStates(new Map());
    }, []),

    setSpeed: useCallback((speed: number) => {
      setPlaybackState(s => ({ ...s, speed }));
    }, []),

    seekTo: useCallback((eventIndex: number) => {
      const clampedIndex = Math.max(0, Math.min(eventIndex, events.length - 1));
      replayToIndex(clampedIndex);
    }, [events.length, replayToIndex]),
  };

  return {
    playbackState,
    nodeStates,
    controls,
  };
}
