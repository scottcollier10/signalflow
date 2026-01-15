'use client';

/**
 * Header component for analysis dashboard with tab navigation
 */

import { cn } from '@/lib/utils';

type TabType = 'overview' | 'critical-path' | 'bottlenecks' | 'errors' | 'recommendations';

interface Tab {
  id: TabType;
  label: string;
  count?: number;
  countColor?: string;
}

interface AnalysisHeaderProps {
  executionId: string;
  workflowId?: string;
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  summary: {
    criticalPathNodes: number;
    bottlenecksCount: number;
    errorsCount: number;
    recommendationsCount: number;
  };
}

export function AnalysisHeader({
  executionId,
  workflowId,
  activeTab,
  onTabChange,
  summary,
}: AnalysisHeaderProps) {
  const tabs: Tab[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'critical-path', label: 'Critical Path', count: summary.criticalPathNodes },
    { id: 'bottlenecks', label: 'Bottlenecks', count: summary.bottlenecksCount, countColor: 'bg-orange-100 text-orange-800' },
    { id: 'errors', label: 'Errors', count: summary.errorsCount, countColor: summary.errorsCount > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800' },
    { id: 'recommendations', label: 'Recommendations', count: summary.recommendationsCount, countColor: 'bg-blue-100 text-blue-800' },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Back button */}
      <div className="mb-4">
        <a
          href="/execution"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Execution Playback
        </a>
      </div>

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
            Execution Analysis
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Execution: {executionId.slice(0, 8)}...
            {workflowId && <span className="ml-2">Workflow: {workflowId.slice(0, 8)}...</span>}
          </p>
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-3">
          <div className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
            {summary.criticalPathNodes} critical nodes
          </div>
          <div className="px-3 py-1 bg-orange-50 text-orange-700 rounded-full text-sm font-medium">
            {summary.bottlenecksCount} bottlenecks
          </div>
          <div className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-sm font-medium">
            {summary.recommendationsCount} recommendations
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-6 border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-8 gap-y-2" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                'whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-medium',
                  tab.countColor || 'bg-gray-100 text-gray-600'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
