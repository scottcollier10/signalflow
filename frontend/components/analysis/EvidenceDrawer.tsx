'use client';

/**
 * Evidence Drawer component
 * Slide-out panel showing recommendation details, evidence, and code examples
 * With neumorphic design
 */

import { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/cjs/styles/prism';
import {
  Recommendation,
  Evidence,
  formatDuration,
} from '@/lib/api/analysis';

interface EvidenceDrawerProps {
  open: boolean;
  recommendation: Recommendation | null;
  onClose: () => void;
}

function getImpactColors(impact: string): string {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-neu-coral/15 text-neu-coral border-neu-coral/30',
    HIGH: 'bg-neu-orange/15 text-neu-orange border-neu-orange/30',
    MEDIUM: 'bg-neu-yellow/15 text-neu-yellow border-neu-yellow/30',
    LOW: 'bg-neu-teal/15 text-neu-teal border-neu-teal/30',
  };
  return colors[impact] || colors.MEDIUM;
}

function getCategoryColors(category: string): string {
  const colors: Record<string, string> = {
    performance: 'bg-neu-teal/15 text-neu-teal',
    reliability: 'bg-neu-accent/15 text-neu-accent',
    cost: 'bg-neu-green/15 text-neu-green',
    maintainability: 'bg-neu-shadow-light/30 text-neu-text-muted',
  };
  return colors[category.toLowerCase()] || colors.maintainability;
}

function getEffortColors(effort: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-neu-green/15 text-neu-green',
    MEDIUM: 'bg-neu-yellow/15 text-neu-yellow',
    HIGH: 'bg-neu-coral/15 text-neu-coral',
  };
  return colors[effort] || colors.MEDIUM;
}

export function EvidenceDrawer({ open, recommendation, onClose }: EvidenceDrawerProps) {
  if (!recommendation) return null;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-neu-bg/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed top-0 right-0 h-full w-full md:w-2/3 lg:w-1/2 xl:w-2/5
          bg-neu-bg shadow-neu-raised z-50
          transform transition-transform duration-300 ease-in-out
          ${open ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="h-full overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-neu-bg border-b border-neu-shadow-light/30 px-6 py-4 z-10">
            <div className="flex items-start justify-between">
              <div className="flex-1 pr-4">
                <h2 className="font-display text-xl font-bold text-neu-text">
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
                  <span className="px-2 py-1 bg-neu-shadow-light/20 text-neu-text rounded text-xs font-medium">
                    Priority: {recommendation.priority_score}/100
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-neu-text-muted hover:text-neu-text p-1 transition-colors"
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
              <h3 className="text-sm font-semibold text-neu-text-muted uppercase tracking-wide mb-2">
                Description
              </h3>
              <p className="text-neu-text font-body">{recommendation.description}</p>
            </section>

            {/* Impact Details */}
            <section className="neu-inset p-4 border-l-4 border-neu-accent">
              <h3 className="font-display font-semibold text-neu-accent mb-2">Expected Impact</h3>
              <p className="text-neu-text">{recommendation.impact_details}</p>
              {recommendation.time_saved_ms && (
                <div className="mt-3 pt-3 border-t border-neu-shadow-light/30">
                  <span className="text-sm text-neu-text-muted">
                    Potential time saved: <strong className="text-neu-green">{formatDuration(recommendation.time_saved_ms)}</strong>
                  </span>
                </div>
              )}
            </section>

            {/* Evidence */}
            <section>
              <h3 className="text-sm font-semibold text-neu-text-muted uppercase tracking-wide mb-3">
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
                <h3 className="text-sm font-semibold text-neu-text-muted uppercase tracking-wide mb-3">
                  Code Example
                </h3>
                <CodeExampleBlock code={recommendation.code_example} />
              </section>
            )}

            {/* Affected Nodes */}
            {recommendation.affected_node_ids.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-neu-text-muted uppercase tracking-wide mb-3">
                  Affected Nodes ({recommendation.affected_node_ids.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {recommendation.affected_node_ids.map((nodeId) => (
                    <span
                      key={nodeId}
                      className="px-3 py-1 bg-neu-shadow-dark/30 text-neu-text-muted rounded-full text-sm font-mono"
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
    bottleneck: 'bg-neu-orange/15 text-neu-orange',
    critical_path: 'bg-neu-coral/15 text-neu-coral',
    error_cluster: 'bg-neu-coral/15 text-neu-coral',
    error_pattern: 'bg-neu-yellow/15 text-neu-yellow',
  };

  return (
    <div className="neu-inset p-4">
      <div className="flex items-start gap-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[evidence.type] || 'bg-neu-shadow-light/30 text-neu-text-muted'}`}>
          {evidence.type.replace('_', ' ')}
        </span>
        <div className="flex-1">
          <p className="text-neu-text">{evidence.description}</p>

          {/* Evidence data */}
          {evidence.data && Object.keys(evidence.data).length > 0 && (
            <div className="mt-2 p-2 bg-neu-shadow-dark/30 rounded border border-neu-shadow-light/20">
              <pre className="text-xs text-neu-text-muted overflow-x-auto">
                {JSON.stringify(evidence.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Link */}
          {evidence.link && (
            <a
              href={evidence.link}
              className="mt-2 text-xs text-neu-accent hover:text-neu-accent-light inline-block transition-colors"
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
    <div className="relative rounded-lg overflow-hidden neu-inset">
      {/* Copy button */}
      <button
        onClick={handleCopy}
        className={`absolute top-2 right-2 px-3 py-1 text-sm rounded transition-colors z-10 ${
          copied
            ? 'bg-neu-green/20 text-neu-green'
            : 'bg-neu-shadow-light/30 text-neu-text hover:bg-neu-shadow-light/50'
        }`}
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
          background: 'rgba(0,0,0,0.3)',
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
