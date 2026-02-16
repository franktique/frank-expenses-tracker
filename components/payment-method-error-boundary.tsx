'use client';

import React, { Component, ReactNode } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface PaymentMethodErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
}

interface PaymentMethodErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  maxRetries?: number;
}

export class PaymentMethodErrorBoundary extends Component<
  PaymentMethodErrorBoundaryProps,
  PaymentMethodErrorBoundaryState
> {
  private maxRetries: number;

  constructor(props: PaymentMethodErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
    this.maxRetries = props.maxRetries || 3;
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<PaymentMethodErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error for debugging
    console.error(
      'PaymentMethodErrorBoundary caught an error:',
      error,
      errorInfo
    );
  }

  handleRetry = () => {
    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Alert variant="destructive" className="my-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error en Métodos de Pago</AlertTitle>
          <AlertDescription className="mt-2">
            <div className="space-y-3">
              <p>
                Ocurrió un error al cargar o procesar los métodos de pago. Esto
                puede deberse a datos inválidos o un problema temporal.
              </p>

              {this.state.error && (
                <details className="rounded bg-muted p-2 text-xs">
                  <summary className="cursor-pointer font-medium">
                    Detalles técnicos
                  </summary>
                  <div className="mt-2 space-y-1">
                    <p>
                      <strong>Error:</strong> {this.state.error.message}
                    </p>
                    {this.state.errorInfo && (
                      <p>
                        <strong>Stack:</strong>{' '}
                        {this.state.errorInfo.componentStack}
                      </p>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2 pt-2">
                {this.state.retryCount < this.maxRetries ? (
                  <Button
                    onClick={this.handleRetry}
                    size="sm"
                    variant="outline"
                  >
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Reintentar ({this.state.retryCount + 1}/{this.maxRetries})
                  </Button>
                ) : (
                  <Button
                    onClick={this.handleReset}
                    size="sm"
                    variant="outline"
                  >
                    <Bug className="mr-1 h-3 w-3" />
                    Restablecer
                  </Button>
                )}

                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="secondary"
                >
                  Recargar página
                </Button>
              </div>

              <div className="border-t pt-2 text-xs text-muted-foreground">
                <p>
                  <strong>Soluciones sugeridas:</strong>
                </p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>
                    Verifica que los métodos de pago estén configurados
                    correctamente
                  </li>
                  <li>Intenta recargar la página</li>
                  <li>Si el problema persiste, contacta al administrador</li>
                </ul>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function usePaymentMethodErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      console.error('Payment method error captured:', error);
    }
  }, [error]);

  return {
    error,
    resetError,
    captureError,
    hasError: error !== null,
  };
}
