'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppSidebar } from '@/components/app-sidebar';
import { SimpleTabLayout } from '@/components/simple-tab-layout';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();

  // Don't show sidebar on login page or when not authenticated
  const isLoginPage = pathname === '/login';
  const showSidebar = isAuthenticated && !isLoginPage;

  // Use tab layout when authenticated, otherwise use regular layout
  if (showSidebar) {
    return <SimpleTabLayout>{children}</SimpleTabLayout>;
  }

  // Regular layout for non-authenticated users
  return (
    <div className="flex min-h-screen">
      <main className="flex-1">{children}</main>
    </div>
  );
}
