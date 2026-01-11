'use client';

/**
 * Execution playback page
 * Test page for the execution visualizer
 */

import { ExecutionVisualizer } from '@/components/execution-visualizer';

export default function ExecutionPage() {
  // Test data IDs from the API
  const workflowId = '8ce95407-8381-4756-85aa-c5c2a0251384';
  const executionId = '15720484-8e33-464b-84b8-0936ecfa7096';

  return (
    <ExecutionVisualizer
      workflowId={workflowId}
      executionId={executionId}
      apiBaseUrl="http://localhost:8000"
    />
  );
}
