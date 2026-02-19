'use client';

/**
 * Loading state component for analysis dashboard
 * With neumorphic design
 */

export function LoadingState() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="neu-flat p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neu-accent mb-4"></div>
        <p className="text-neu-text-muted font-body">Loading analysis...</p>
      </div>
    </div>
  );
}
