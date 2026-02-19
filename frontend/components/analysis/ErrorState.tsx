'use client';

/**
 * Error state component for analysis dashboard
 * With neumorphic design
 */

interface ErrorStateProps {
  error: string;
}

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="neu-flat p-8 text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-neu-coral/10 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-neu-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h2 className="font-display text-xl font-semibold text-neu-text mb-2">
          Failed to Load Analysis
        </h2>
        <p className="text-neu-text-muted mb-6 font-body">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn-primary"
        >
          Retry
        </button>
      </div>
    </div>
  );
}
