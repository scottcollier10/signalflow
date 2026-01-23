'use client';

/**
 * App Layout Component
 * Wraps pages with sidebar and proper spacing
 */

import { Sidebar } from './Sidebar';
import { useSidebar } from './SidebarContext';

interface AppLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function AppLayout({ children, fullWidth = false }: AppLayoutProps) {
  const { isCollapsed } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />

      {/* Main content area - adjusts margin based on sidebar state */}
      <main className={`
        transition-all duration-300
        ${isCollapsed ? 'lg:ml-16' : 'lg:ml-64'}
        ${fullWidth ? '' : 'p-4 lg:p-8'}
      `}>
        {/* Mobile padding for hamburger button */}
        <div className="lg:hidden h-16" />

        {children}
      </main>
    </div>
  );
}
