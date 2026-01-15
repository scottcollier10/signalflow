'use client';

/**
 * Evidence Drawer component
 * Slide-out panel showing recommendation details, evidence, and code examples
 */

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {
  Recommendation,
  Evidence,
  formatDuration,
  getImpactColors,
  getCategoryColors,
  getEffortColors,
} from '@/lib/api/analysis';

interface EvidenceDrawerProps {
  open: boolean;
  recommendation: Recommendation | null;
  onClose: () => void;
}

export function EvidenceDrawer({ open, recommendation, onClose }: EvidenceDrawerProps) {
  if (!recommendation) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 xl:w-2/5
          bg-white shadow-xl z-50
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h2 className="text-xl font-bold text-gray-900">
                  {recommendation.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${getImpactColors(recommendation.impact)}`}>
                    {recommendation.impact}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getCategoryColors(recommendation.category)}`}>
                    {recommendation.category}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getEffortColors(recommendation.effort)}`}>
                    {recommendation.effort} effort
                  </span>
                  <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium">
                    Priority: {recommendation.priority_score}/100
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Description */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Description
              </h3>
              <p className="text-gray-700">{recommendation.description}</p>
            </section>

            {/* Impact Details */}
            <section className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Expected Impact</h3>
              <p className="text-blue-700">{recommendation.impact_details}</p>
              {recommendation.time_saved_ms && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <span className="text-sm text-blue-600">
                    Potential time saved: <strong>{formatDuration(recommendation.time_saved_ms)}</strong>
                  </span>
                </div>
              )}
            </section>

            {/* Evidence */}
            <section>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                Evidence ({recommendation.evidence.length})
              </h3>
              <div className="space-y-3">
                {recommendation.evidence.map((evidence, idx) => (
                  <EvidenceItem key={idx} evidence={evidence} />
                ))}
              </div>
            </section>

            {/* Code Example */}
            {recommendation.code_example && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Code Example
                </h3>
                <CodeExampleBlock code={recommendation.code_example} />
              </section>
            )}

            {/* Affected Nodes */}
            {recommendation.affected_node_ids.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Affected Nodes ({recommendation.affected_node_ids.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recommendation.affected_node_ids.map((nodeId) => (
                    <span
                      key={nodeId}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-mono"
                    >
                      {nodeId.slice(0, 8)}...
                    </span>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function EvidenceItem({ evidence }: { evidence: Evidence }) {
  const typeColors: Record<string, string> = {
    bottleneck: 'bg-orange-100 text-orange-800',
    critical_path: 'bg-red-100 text-red-800',
    error_cluster: 'bg-red-100 text-red-800',
    error_pattern: 'bg-yellow-100 text-yellow-800',
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex items-start gap-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[evidence.type] || 'bg-gray-100 text-gray-800'}`}>
          {evidence.type.replace('_', ' ')}
        </span>
        <div className="flex-1">
          <p className="text-gray-700">{evidence.description}</p>

          {/* Evidence data */}
          {evidence.data && Object.keys(evidence.data).length > 0 && (
            <div className="mt-2 p-2 bg-white rounded border border-gray-100">
              <pre className="text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(evidence.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Link */}
          {evidence.link && (
            <a
              href={evidence.link}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700 inline-block"
            >
              View details
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeExampleBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Detect language from code content
  const language = detectLanguage(code);

  return (
    <div className="relative rounded-lg overflow-hidden">
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-3 py-1 bg-gray-700 text-white text-sm rounded hover:bg-gray-600 transition-colors z-10"
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>

      {/* Code block */}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          borderRadius: '0.5rem',
          padding: '1rem',
          paddingTop: '2.5rem',
          fontSize: '0.875rem',
        }}
        showLineNumbers={code.split('\n').length > 5}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

function detectLanguage(code: string): string {
  if (code.includes('async') || code.includes('await') || code.includes('const ')) {
    return 'javascript';
  }
  if (code.includes('def ') || code.includes('import ')) {
    return 'python';
  }
  if (code.includes('{') && code.includes('}')) {
    return 'json';
  }
  return 'javascript';
}
