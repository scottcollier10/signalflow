'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function ComparisonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const variants = [
    { href: '/comparison/variant-a', label: 'A: Side-by-Side' },
    { href: '/comparison/variant-b', label: 'B: Timeline' },
    { href: '/comparison/variant-c', label: 'C: Table' },
    { href: '/comparison/variant-d', label: 'D: Hybrid ✨' },
  ];

  return (
    <div className="min-h-screen bg-neu-bg p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-neu-text mb-2">
            Comparison Layout Prototypes
          </h1>
          <p className="text-neu-text-muted">
            Executive Pulse V2 • Execution #4671 → #4733
          </p>
        </div>

        {/* Variant Navigation */}
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

        {/* Content */}
        {children}
      </div>
    </div>
  );
}
