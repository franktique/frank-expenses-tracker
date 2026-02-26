'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useBudget } from '@/context/budget-context';
import { SimpleTabLayout } from '@/components/simple-tab-layout';
import { Loader2 } from 'lucide-react';

export function ConditionalLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  const { isLoading, dataLoaded, dbConnectionError, error } = useBudget();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Latch: once data has loaded at least once, never show the loading gate again.
  // This prevents infinite loops when page components call refreshData() on mount,
  // which temporarily sets isLoading=true / dataLoaded=false again.
  const hasLoadedOnce = useRef(false);
  if (dataLoaded) hasLoadedOnce.current = true;

  // Don't show sidebar on login page or when not authenticated
  const isLoginPage = pathname === '/login';
  const showSidebar = isAuthenticated && !isLoginPage;
  const isPanelMode = searchParams.get('_layout') === 'panel';

  // Embedded panel mode: strip all chrome (sidebar, tab bar)
  if (isPanelMode && showSidebar) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    );
  }

  // Use tab layout when authenticated, otherwise use regular layout
  if (showSidebar) {
    // Show loading screen only during the initial data load (never during re-fetches).
    // Skip the gate on DB connection errors or data errors so pages show their own UI.
    if (!hasLoadedOnce.current && !dbConnectionError && !error) {
      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <div>
              <h2 className="text-lg font-semibold">Cargando aplicación</h2>
              <p className="text-sm text-muted-foreground">
                Por favor espere mientras se cargan los datos...
              </p>
            </div>
          </div>
        </div>
      );
    }

    return <SimpleTabLayout>{children}</SimpleTabLayout>;
  }

  // Regular layout for non-authenticated users
  return (
    <div className="flex min-h-screen">
      <main className="flex-1">{children}</main>
    </div>
  );
}
