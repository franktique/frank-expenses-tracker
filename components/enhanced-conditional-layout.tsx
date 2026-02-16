'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppSidebar } from '@/components/app-sidebar';
import { TabLayout } from '@/components/tabs/tab-layout';

export function EnhancedConditionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Don't show tabs on login page or when not authenticated
  const isLoginPage = pathname === '/login';
  const showTabSystem = isAuthenticated && !isLoginPage;

  // For now, we'll use the tab system for all authenticated users
  // In the future, this could be a user preference
  const useTabSystem = showTabSystem;

  if (useTabSystem) {
    return <TabLayout>{children}</TabLayout>;
  }

  // Fallback to original layout
  return (
    <div className="flex min-h-screen">
      {/* Only render sidebar if authenticated and not on login page */}
      {showTabSystem && <AppSidebar />}

      {/* Adjust main content padding based on sidebar presence */}
      <main className={`flex-1 ${showTabSystem ? 'p-6' : 'p-0'}`}>
        {children}
      </main>
    </div>
  );
}

// Layout with a toggle for tab system
export function TabToggleLayout({
  children,
  enableTabs = true,
}: {
  children: React.ReactNode;
  enableTabs?: boolean;
}) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  const isLoginPage = pathname === '/login';
  const showTabSystem = enableTabs && isAuthenticated && !isLoginPage;

  if (showTabSystem) {
    return <TabLayout>{children}</TabLayout>;
  }

  // Original layout
  return (
    <div className="flex min-h-screen">
      {isAuthenticated && !isLoginPage && <AppSidebar />}
      <main
        className={`flex-1 ${isAuthenticated && !isLoginPage ? 'p-6' : 'p-0'}`}
      >
        {children}
      </main>
    </div>
  );
}
