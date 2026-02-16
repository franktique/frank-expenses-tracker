'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { ActivePeriodErrorHandler } from '@/components/active-period-error-handler';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const {
    isAuthenticated,
    isLoadingActivePeriod,
    activePeriodError,
    retryActivePeriodLoading,
  } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not authenticated, redirect to login
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Don't render children until authentication is verified
  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
      </div>
    );
  }

  // Show authentication-related active period errors at the app level
  if (activePeriodError && activePeriodError.type === 'authentication') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md">
          <ActivePeriodErrorHandler
            error={activePeriodError}
            onRetry={retryActivePeriodLoading}
            isRetrying={isLoadingActivePeriod}
            showFullCard={true}
          />
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
