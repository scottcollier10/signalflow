'use client';

/**
 * Help & Documentation Page (Placeholder)
 * User guides and support resources
 */

import Link from 'next/link';
import { AppLayout } from '@/components/layout';

interface HelpSection {
  title: string;
  description: string;
  icon: React.ReactNode;
  articles?: string[];
}

const helpSections: HelpSection[] = [
  {
    title: 'Quick Start Guide',
    description: 'Get up and running with SignalFlow in minutes',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    articles: ['Importing your first execution', 'Understanding the dashboard', 'Navigating analysis views'],
  },
  {
    title: 'Understanding Analysis Results',
    description: 'Learn how to interpret critical paths, bottlenecks, and recommendations',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    articles: ['What is a critical path?', 'Reading bottleneck scores', 'Acting on recommendations'],
  },
  {
    title: 'Bottleneck Scoring Explained',
    description: 'Deep dive into how SignalFlow calculates performance scores',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    articles: ['Severity levels (Critical, High, Medium, Low)', 'Time impact calculations', 'Effort estimation methodology'],
  },
  {
    title: 'API Documentation',
    description: 'Reference for the SignalFlow REST API',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    articles: ['Authentication', 'Execution endpoints', 'Analysis endpoints', 'Webhook integrations'],
  },
  {
    title: 'Contact Support',
    description: 'Get help from the SignalFlow team',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    articles: ['Report a bug', 'Feature requests', 'Community Discord'],
  },
];

export default function HelpPage() {
  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Help & Documentation</h1>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              Coming Soon
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            Learn how to get the most out of SignalFlow&apos;s workflow analysis
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Documentation Coming Soon</h2>
              <p className="mt-1 text-gray-600">
                We&apos;re writing comprehensive guides to help you master workflow analysis.
                For now, explore the UI - it&apos;s designed to be intuitive!
              </p>
            </div>
          </div>
        </div>

        {/* Help Sections */}
        <div className="space-y-4">
          {helpSections.map((section) => (
            <div
              key={section.title}
              className="bg-white border border-gray-200 rounded-lg p-5 opacity-60 cursor-not-allowed"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400">
                  {section.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{section.title}</h3>
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">
                      Planned
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">{section.description}</p>
                  {section.articles && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {section.articles.map((article) => (
                        <span
                          key={article}
                          className="px-2 py-1 bg-gray-50 text-gray-400 text-xs rounded border border-gray-100"
                        >
                          {article}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Quick Tips
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Use the <strong>Playback</strong> tab to watch your workflow execute step-by-step</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span><strong>Critical Path</strong> shows the longest chain of dependent nodes</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Check <strong>Recommendations</strong> for actionable optimization suggestions</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span>
              <span>Click <strong>View Evidence</strong> on any recommendation to see supporting data</span>
            </li>
          </ul>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium text-gray-900 mb-3">Keyboard Shortcuts (Coming Soon)</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Toggle sidebar</span>
              <kbd className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-mono">[</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Search</span>
              <kbd className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-mono">/</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Play/Pause</span>
              <kbd className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-mono">Space</kbd>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Go to Dashboard</span>
              <kbd className="px-2 py-1 bg-gray-200 text-gray-600 rounded text-xs font-mono">G D</kbd>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
