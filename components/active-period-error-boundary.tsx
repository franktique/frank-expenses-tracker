"use client";

import React from "react";
import { useAuth } from "@/lib/auth-context";
import { ActivePeriodErrorHandler } from "@/components/active-period-error-handler";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivePeriodErrorBoundaryProps {
  children: React.ReactNode;
  showGlobalErrors?: boolean;
  fallbackComponent?: React.ComponentType<{
    error: any;
    onRetry: () => void;
    isRetrying: boolean;
  }>;
}

export function ActivePeriodErrorBoundary({
  children,
  showGlobalErrors = false,
  fallbackComponent: FallbackComponent,
}: ActivePeriodErrorBoundaryProps) {
  const {
    activePeriodError,
    retryActivePeriodLoading,
    isLoadingActivePeriod,
    clearActivePeriodError,
  } = useAuth();

  // Only show global errors if explicitly requested
  if (!showGlobalErrors) {
    return <>{children}</>;
  }

  // Show critical errors that should block the entire app
  if (activePeriodError && activePeriodError.type === "authentication") {
    if (FallbackComponent) {
      return (
        <FallbackComponent
          error={activePeriodError}
          onRetry={retryActivePeriodLoading}
          isRetrying={isLoadingActivePeriod}
        />
      );
    }

    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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

  // Show non-critical errors as a dismissible banner
  if (
    activePeriodError &&
    !["authentication", "no_active_period"].includes(activePeriodError.type)
  ) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              Error al cargar el periodo activo: {activePeriodError.message}
            </span>
            <div className="flex gap-2 ml-4">
              {activePeriodError.retryable && (
                <Button
                  onClick={retryActivePeriodLoading}
                  disabled={isLoadingActivePeriod}
                  size="sm"
                  variant="outline"
                >
                  {isLoadingActivePeriod ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    "Reintentar"
                  )}
                </Button>
              )}
              <Button
                onClick={clearActivePeriodError}
                size="sm"
                variant="ghost"
              >
                Descartar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  return <>{children}</>;
}

// Hook to use active period error boundary functionality
export function useActivePeriodErrorBoundary() {
  const {
    activePeriodError,
    retryActivePeriodLoading,
    isLoadingActivePeriod,
    clearActivePeriodError,
  } = useAuth();

  const hasError = !!activePeriodError;
  const isCriticalError = activePeriodError?.type === "authentication";
  const isRetryableError = activePeriodError?.retryable ?? false;

  return {
    hasError,
    isCriticalError,
    isRetryableError,
    error: activePeriodError,
    retry: retryActivePeriodLoading,
    isRetrying: isLoadingActivePeriod,
    clearError: clearActivePeriodError,
  };
}
