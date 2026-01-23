'use client';

/**
 * Playback controls component
 * Provides play/pause/reset/speed controls and progress display
 */

import React from 'react';
import { PlaybackState, PlaybackControls as Controls } from './types';

interface PlaybackControlsProps {
  state: PlaybackState;
  controls: Controls;
  totalEvents: number;
}

export function PlaybackControls({ state, controls, totalEvents }: PlaybackControlsProps) {
  return (
    <div className="flex-shrink-0 border-t bg-white p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={state.isPlaying ? controls.pause : controls.play}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          disabled={state.currentEventIndex >= totalEvents}
        >
          {state.isPlaying ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              Play
            </>
          )}
        </button>

        {/* Reset Button */}
        <button
          onClick={controls.reset}
          className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Reset
        </button>

        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <label htmlFor="speed-select" className="text-sm text-gray-600 font-medium">
            Speed:
          </label>
          <select
            id="speed-select"
            value={state.speed}
            onChange={(e) => controls.setSpeed(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={0.5}>0.5x</option>
            <option value={1}>1x</option>
            <option value={2}>2x</option>
            <option value={5}>5x</option>
            <option value={10}>10x</option>
          </select>
        </div>

        {/* Progress Bar and Info */}
        <div className="flex-1">
          {/* Progress Bar */}
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-200"
              style={{ width: `${state.progress}%` }}
            />
          </div>

          {/* Event Count */}
          <div className="flex justify-between items-center mt-1">
            <p className="text-xs text-gray-600">
              Event {state.currentEventIndex} of {totalEvents}
            </p>
            <p className="text-xs text-gray-600">
              {state.progress.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {state.isPlaying && (
            <div className="flex items-center gap-1.5 text-sm text-blue-600">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              Playing
            </div>
          )}
          {!state.isPlaying && state.currentEventIndex >= totalEvents && (
            <div className="flex items-center gap-1.5 text-sm text-green-600">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Complete
            </div>
          )}
          {!state.isPlaying && state.currentEventIndex < totalEvents && state.currentEventIndex > 0 && (
            <div className="text-sm text-gray-600">Paused</div>
          )}
        </div>
      </div>
    </div>
  );
}
