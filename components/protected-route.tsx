"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ActivePeriodErrorHandler } from "@/components/active-period-error-handler";

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
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Don't render children until authentication is verified
  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show authentication-related active period errors at the app level
  if (activePeriodError && activePeriodError.type === "authentication") {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="max-w-md w-full">
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
