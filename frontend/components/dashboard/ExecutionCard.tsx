'use client';

/**
 * Execution Card Component
 * Displays execution summary with neumorphic design
 */

import Link from 'next/link';

export interface ExecutionData {
  id: string;
  workflow_id: string;
  workflow_name?: string;
  n8n_execution_id?: string;
  status: 'success' | 'error' | 'running' | 'waiting';
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  node_count?: number;
  error_count?: number;
}

interface ExecutionCardProps {
  execution: ExecutionData;
  onDelete?: (id: string) => void;
  showWorkflow?: boolean;
  animationDelay?: number;
}

export function ExecutionCard({ execution, onDelete, showWorkflow = false, animationDelay = 0 }: ExecutionCardProps) {
  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 24 hours - show relative time
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      if (hours < 1) {
        const minutes = Math.floor(diff / 60000);
        return minutes < 1 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    }

    // Less than 7 days - show day of week
    if (diff < 604800000) {
      return date.toLocaleDateString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    }

    // Show full date
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  // Get duration color based on value
  const getDurationColor = (ms?: number) => {
    if (!ms) return 'text-neu-text';
    if (ms < 1000) return 'text-neu-green';
    if (ms < 5000) return 'text-neu-teal';
    if (ms < 10000) return 'text-neu-orange';
    return 'text-neu-coral';
  };

  // Status badge classes
  const statusBadges = {
    success: 'badge-success',
    error: 'badge-error',
    running: 'badge-info',
    waiting: 'badge-warning',
  };

  const statusIcons = {
    success: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    error: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    ),
    running: (
      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    ),
    waiting: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
      </svg>
    ),
  };

  return (
    <div
      className="card-neu animate-fade-in-up"
      style={{ animationDelay: `${animationDelay * 0.1}s` }}
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 min-w-0">
          {showWorkflow && execution.workflow_name && (
            <p className="text-xs text-neu-text-muted mb-2 truncate">{execution.workflow_name}</p>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`${statusBadges[execution.status]} inline-flex items-center gap-1.5`}>
              {statusIcons[execution.status]}
              {execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}
            </span>
            {execution.error_count && execution.error_count > 0 && (
              <span className="badge-error">
                {execution.error_count} error{execution.error_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        <div className="text-right text-xs text-neu-text-muted shrink-0">
          {formatDate(execution.started_at)}
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Duration */}
        <div className="text-center">
          <p className={`text-2xl font-display font-bold mb-1 ${getDurationColor(execution.duration_ms)}`}>
            {formatDuration(execution.duration_ms)}
          </p>
          <p className="text-xs text-neu-text-muted">Duration</p>
        </div>

        {/* Nodes */}
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-neu-text mb-1">
            {execution.node_count || '-'}
          </p>
          <p className="text-xs text-neu-text-muted">Nodes</p>
        </div>

        {/* n8n ID */}
        <div className="text-center">
          <p className="text-2xl font-display font-bold text-neu-text mb-1">
            {execution.n8n_execution_id?.slice(-4) || '-'}
          </p>
          <p className="text-xs text-neu-text-muted">n8n ID</p>
        </div>
      </div>

      {/* Divider */}
      <div className="divider-neu mb-4" />

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Link
          href={`/execution/${execution.id}`}
          className="flex-1 text-center px-6 py-3 rounded-neu font-semibold border-2 border-neu-accent bg-neu-shadow-light text-neu-accent transition-all duration-300 hover:-translate-y-0.5 hover:bg-neu-accent/10"
        >
          View Analysis
        </Link>

        {onDelete && (
          <button
            onClick={() => onDelete(execution.id)}
            className="btn-icon text-neu-text-muted hover:text-neu-coral"
            title="Delete execution"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
