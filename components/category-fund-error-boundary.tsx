'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface CategoryFundErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
}

export class CategoryFundErrorBoundary extends Component<
  CategoryFundErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: CategoryFundErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error for debugging
    console.error(
      'CategoryFundErrorBoundary caught an error:',
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card className="mx-auto w-full max-w-2xl border-destructive/20 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Error en operación de categorías y fondos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Ha ocurrido un error inesperado en la gestión de categorías y
                fondos.
                {this.props.context && ` Contexto: ${this.props.context}`}
              </p>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  ID: {this.state.errorId}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleString()}
                </Badge>
              </div>
            </div>

            {this.props.showDetails && this.state.error && (
              <Card className="border-muted bg-muted/20">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">Detalles del error:</h4>
                    <div className="max-h-32 overflow-auto rounded bg-muted p-2 font-mono text-xs">
                      <div className="font-semibold text-destructive">
                        {this.state.error.name}: {this.state.error.message}
                      </div>
                      {this.state.error.stack && (
                        <div className="mt-2 text-muted-foreground">
                          {this.state.error.stack}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleRetry}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Reintentar
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReload}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Recargar página
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = '/')}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Ir al inicio
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              Si el problema persiste, por favor contacta al soporte técnico con
              el ID del error.
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier usage with hooks
interface CategoryFundErrorWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  showDetails?: boolean;
}

export function CategoryFundErrorWrapper({
  children,
  fallback,
  context,
  showDetails = false,
}: CategoryFundErrorWrapperProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // You can integrate with error reporting services here
    // Example: Sentry, LogRocket, etc.
    console.error('Category-Fund Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <CategoryFundErrorBoundary
      fallback={fallback}
      onError={handleError}
      context={context}
      showDetails={showDetails}
    >
      {children}
    </CategoryFundErrorBoundary>
  );
}

// Hook for handling async errors in category-fund operations
export function useCategoryFundErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const handleAsyncError = (error: Error, context?: string) => {
    console.error('Async Category-Fund Error:', {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
    setError(error);
  };

  const clearError = () => {
    setError(null);
  };

  const wrapAsyncOperation = async <T,>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | null> => {
    try {
      return await operation();
    } catch (error) {
      handleAsyncError(error as Error, context);
      return null;
    }
  };

  return {
    error,
    handleAsyncError,
    clearError,
    wrapAsyncOperation,
  };
}

// Simple error fallback component
export function CategoryFundErrorFallback({
  error,
  resetError,
  context,
}: {
  error?: Error;
  resetError?: () => void;
  context?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Error en categorías y fondos</h3>
        <p className="max-w-md text-sm text-muted-foreground">
          Ha ocurrido un error al procesar la operación de categorías y fondos.
          {context && ` (${context})`}
        </p>
        {error && (
          <p className="rounded bg-destructive/10 p-2 font-mono text-xs text-destructive">
            {error.message}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {resetError && (
          <Button variant="outline" size="sm" onClick={resetError}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reintentar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Recargar
        </Button>
      </div>
    </div>
  );
}
