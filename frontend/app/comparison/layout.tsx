'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ComparisonLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const execA = searchParams.get('exec_a');
  const execB = searchParams.get('exec_b');

  // Check if we're viewing a prototype variant
  const isPrototype = pathname.includes('/variant-');

  // Prototype variants for development
  const variants = [
    { href: '/comparison/variant-d', label: 'D: Hybrid ✨' },
  ];

  return (
    <div className="min-h-screen bg-neu-bg p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Link
              href="/dashboard"
              className="btn-icon-sm text-neu-text-muted hover:text-neu-accent"
              title="Back to Dashboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h1 className="font-display text-3xl font-bold text-neu-text">
              {isPrototype ? 'Layout Prototype' : 'Execution Comparison'}
            </h1>
          </div>
          <p className="text-neu-text-muted">
            {execA && execB ? (
              <>Comparing #{execA.slice(-4)} → #{execB.slice(-4)}</>
            ) : isPrototype ? (
              <>Prototype Layout • Variant D (Hybrid)</>
            ) : (
              <>Select two executions to compare</>
            )}
          </p>
        </div>

        {/* Prototype Navigation (only show on variant pages) */}
        {isPrototype && (
          <div className="flex gap-3 mb-8">
            {variants.map((variant) => {
              const isActive = pathname === variant.href;
              return (
                <Link
                  key={variant.href}
                  href={variant.href}
                  className={`px-5 py-2.5 rounded-neu font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-neu-accent text-neu-bg shadow-neu-raised-sm'
                      : 'neu-flat text-neu-text hover:text-neu-accent'
                  }`}
                >
                  {variant.label}
                </Link>
              );
            })}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
}

export default function ComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neu-bg p-8">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <div className="h-10 w-64 bg-neu-shadow-light/30 rounded animate-pulse mb-2" />
            <div className="h-5 w-48 bg-neu-shadow-light/30 rounded animate-pulse" />
          </div>
        </div>
      </div>
    }>
      <ComparisonLayoutContent>{children}</ComparisonLayoutContent>
    </Suspense>
  );
}
