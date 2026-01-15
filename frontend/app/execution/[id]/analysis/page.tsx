'use client';

/**
 * Analysis Dashboard Page
 * Displays critical path, bottlenecks, error clustering, and recommendations
 */

import { use } from 'react';
import AnalysisDashboard from '@/components/analysis/AnalysisDashboard';

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default function AnalysisPage({ params }: AnalysisPageProps) {
  const { id: executionId } = use(params);

  return (
    <div className="min-h-screen bg-gray-50">
      <AnalysisDashboard
        executionId={executionId}
        apiBaseUrl="http://localhost:8000"
      />
    </div>
  );
}
