'use client';

/**
 * Execution playback page
 * Test page for the execution visualizer
 */

import { ExecutionVisualizer } from '@/components/execution-visualizer';

export default function ExecutionPage() {
  // Test data IDs from the API
  // Updated after database restore (Jan 11, 2026)
  const workflowId = '6a71673e-623d-42c9-a7c5-09e8acda50f4';
  const executionId = '09f2d02b-2137-4da8-8e68-cd15535bee3f';

  return (
    <ExecutionVisualizer
      workflowId={workflowId}
      executionId={executionId}
      apiBaseUrl="http://localhost:8000"
    />
  );
}
