'use client';

/**
 * Settings Page (Placeholder)
 * Configuration options for SignalFlow
 */

import Link from 'next/link';
import { AppLayout } from '@/components/layout';

interface SettingSection {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const settingSections: SettingSection[] = [
  {
    title: 'n8n Connection',
    description: 'Configure your n8n instance URL and API key for direct execution imports',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
  },
  {
    title: 'User Preferences',
    description: 'Customize your dashboard layout, default views, and display settings',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    title: 'Export Settings',
    description: 'Configure default export formats and report templates',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    title: 'Notification Settings',
    description: 'Set up alerts for workflow errors, performance thresholds, and reports',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
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
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
              Coming Soon
            </span>
          </div>
          <p className="mt-2 text-gray-600">
            Configure SignalFlow to match your workflow analysis needs
          </p>
        </div>

        {/* Coming Soon Banner */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Settings Coming in Week 5</h2>
              <p className="mt-1 text-gray-600">
                We&apos;re building a comprehensive settings panel to help you customize SignalFlow.
                In the meantime, n8n credentials are saved locally in your browser when you use the Import page.
              </p>
            </div>
          </div>
        </div>

        {/* Placeholder Sections */}
        <div className="grid gap-4">
          {settingSections.map((section) => (
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
                </div>
                <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          ))}
        </div>

        {/* Current Settings Info */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-5">
          <h3 className="font-medium text-gray-900 mb-3">Current Configuration</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">API Backend</span>
              <span className="text-gray-900 font-mono">http://localhost:8000</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">n8n Credentials</span>
              <span className="text-gray-900">Stored in browser localStorage</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Version</span>
              <span className="text-gray-900">SignalFlow v0.8 (Week 4)</span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
