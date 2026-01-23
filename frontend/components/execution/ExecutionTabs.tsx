'use client';

/**
 * Execution Tabs Component
 * Tab navigation for unified execution view
 */

import { cn } from '@/lib/utils';

export type TabId = 'overview' | 'playback' | 'critical-path' | 'bottlenecks' | 'errors' | 'recommendations';

interface Tab {
  id: TabId;
  name: string;
  icon: React.ReactNode;
  count?: number;
  countColor?: string;
}

interface ExecutionTabsProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  counts: {
    criticalPath: number;
    bottlenecks: number;
    errors: number;
    recommendations: number;
  };
}

export function ExecutionTabs({ activeTab, onTabChange, counts }: ExecutionTabsProps) {
  const tabs: Tab[] = [
    {
      id: 'overview',
      name: 'Overview',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'playback',
      name: 'Playback',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'critical-path',
      name: 'Critical Path',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      count: counts.criticalPath,
      countColor: 'bg-blue-100 text-blue-800',
    },
    {
      id: 'bottlenecks',
      name: 'Bottlenecks',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      count: counts.bottlenecks,
      countColor: 'bg-orange-100 text-orange-800',
    },
    {
      id: 'errors',
      name: 'Errors',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      count: counts.errors,
      countColor: counts.errors > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800',
    },
    {
      id: 'recommendations',
      name: 'Recommendations',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      count: counts.recommendations,
      countColor: 'bg-purple-100 text-purple-800',
    },
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex overflow-x-auto" aria-label="Tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap py-3 px-4 border-b-2 font-medium text-sm transition-colors',
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.name}</span>
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
  );
}
