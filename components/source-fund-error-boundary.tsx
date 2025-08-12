"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SourceFundErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  errorType: "validation" | "network" | "server" | "unknown";
}

interface SourceFundErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
  resetOnPropsChange?: boolean;
}

export class SourceFundErrorBoundary extends Component<
  SourceFundErrorBoundaryProps,
  SourceFundErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;

  constructor(props: SourceFundErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      errorType: "unknown",
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<SourceFundErrorBoundaryState> {
    const errorType = SourceFundErrorBoundary.categorizeError(error);
    return {
      hasError: true,
      error,
      errorType,
      errorId: `sf_error_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };
  }

  static categorizeError(
    error: Error
  ): "validation" | "network" | "server" | "unknown" {
    const message = error.message.toLowerCase();

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required")
    ) {
      return "validation";
    }

    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("connection")
    ) {
      return "network";
    }

    if (
      message.includes("server") ||
      message.includes("500") ||
      message.includes("internal")
    ) {
      return "server";
    }

    return "unknown";
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error with context for debugging
    console.error("SourceFundErrorBoundary caught an error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      errorType: this.state.errorType,
      timestamp: new Date().toISOString(),
    });

    // Auto-retry for network errors after 5 seconds
    if (this.state.errorType === "network") {
      this.resetTimeoutId = window.setTimeout(() => {
        this.handleRetry();
      }, 5000);
    }
  }

  componentDidUpdate(prevProps: SourceFundErrorBoundaryProps) {
    // Reset error state when props change if resetOnPropsChange is true
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      prevProps.children !== this.props.children
    ) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: "",
        errorType: "unknown",
      });
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  handleRetry = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      errorType: "unknown",
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  getErrorTitle = (): string => {
    switch (this.state.errorType) {
      case "validation":
        return "Error de validación de fondo origen";
      case "network":
        return "Error de conexión";
      case "server":
        return "Error del servidor";
      default:
        return "Error en fondo origen";
    }
  };

  getErrorDescription = (): string => {
    switch (this.state.errorType) {
      case "validation":
        return "Los datos del fondo origen no son válidos. Verifique la selección y vuelva a intentar.";
      case "network":
        return "No se pudo conectar con el servidor. Verificando conexión...";
      case "server":
        return "Ha ocurrido un error interno del servidor. El equipo técnico ha sido notificado.";
      default:
        return "Ha ocurrido un error inesperado en la gestión de fondos origen.";
    }
  };

  getErrorIcon = () => {
    switch (this.state.errorType) {
      case "validation":
        return <AlertCircle className="h-5 w-5" />;
      case "network":
        return <RefreshCw className="h-5 w-5 animate-spin" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  getErrorVariant = (): "destructive" | "default" => {
    return this.state.errorType === "validation" ? "default" : "destructive";
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <Card
          className={`w-full max-w-2xl mx-auto border-${
            this.getErrorVariant() === "destructive" ? "destructive" : "amber"
          }/20 bg-${
            this.getErrorVariant() === "destructive" ? "destructive" : "amber"
          }/5`}
        >
          <CardHeader>
            <CardTitle
              className={`flex items-center gap-2 text-${
                this.getErrorVariant() === "destructive"
                  ? "destructive"
                  : "amber-700"
              }`}
            >
              {this.getErrorIcon()}
              {this.getErrorTitle()}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {this.getErrorDescription()}
                {this.props.context && ` Contexto: ${this.props.context}`}
              </p>

              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  ID: {this.state.errorId}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Tipo: {this.state.errorType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleString()}
                </Badge>
              </div>
            </div>

            {/* Network error auto-retry indicator */}
            {this.state.errorType === "network" && (
              <Alert>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Reintentando automáticamente en unos segundos...
                </AlertDescription>
              </Alert>
            )}

            {/* Validation error details */}
            {this.state.errorType === "validation" && this.state.error && (
              <Alert variant="default">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Detalles:</strong> {this.state.error.message}
                </AlertDescription>
              </Alert>
            )}

            {/* Technical details for debugging */}
            {this.props.showDetails && this.state.error && (
              <Card className="border-muted bg-muted/20">
                <CardContent className="pt-4">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">
                      Información técnica:
                    </h4>
                    <div className="text-xs font-mono bg-muted p-2 rounded overflow-auto max-h-32">
                      <div className="text-destructive font-semibold">
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
                disabled={this.state.errorType === "network"}
              >
                <RefreshCw
                  className={`h-4 w-4 ${
                    this.state.errorType === "network" ? "animate-spin" : ""
                  }`}
                />
                {this.state.errorType === "network"
                  ? "Reintentando..."
                  : "Reintentar"}
              </Button>

              {this.state.errorType !== "validation" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReload}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Recargar página
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/")}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Ir al inicio
              </Button>
            </div>

            <div className="text-xs text-muted-foreground">
              {this.state.errorType === "server" && (
                <>
                  Si el problema persiste, contacte al soporte técnico con el ID
                  del error.
                </>
              )}
              {this.state.errorType === "validation" && (
                <>
                  Verifique que ha seleccionado un fondo origen válido para la
                  categoría.
                </>
              )}
              {this.state.errorType === "network" && (
                <>Verifique su conexión a internet e intente nuevamente.</>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier usage with hooks
interface SourceFundErrorWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
}

export function SourceFundErrorWrapper({
  children,
  fallback,
  context,
  showDetails = false,
  resetOnPropsChange = true,
}: SourceFundErrorWrapperProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Integration with error reporting services
    console.error("Source Fund Error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // You can add error reporting service integration here
    // Example: Sentry.captureException(error, { contexts: { errorInfo, context } });
  };

  return (
    <SourceFundErrorBoundary
      fallback={fallback}
      onError={handleError}
      context={context}
      showDetails={showDetails}
      resetOnPropsChange={resetOnPropsChange}
    >
      {children}
    </SourceFundErrorBoundary>
  );
}

// Hook for handling async errors in source fund operations
export function useSourceFundErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);

  const handleAsyncError = (error: Error, context?: string) => {
    console.error("Async Source Fund Error:", {
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
    });
    setError(error);
  };

  const clearError = () => {
    setError(null);
    setIsRetrying(false);
  };

  const retryOperation = async <T,>(
    operation: () => Promise<T>,
    context?: string,
    maxRetries: number = 3
  ): Promise<T | null> => {
    setIsRetrying(true);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        clearError();
        return result;
      } catch (error) {
        console.error(
          `Source fund operation attempt ${attempt} failed:`,
          error
        );

        if (attempt === maxRetries) {
          handleAsyncError(error as Error, context);
          setIsRetrying(false);
          return null;
        }

        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }

    setIsRetrying(false);
    return null;
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
    isRetrying,
    handleAsyncError,
    clearError,
    retryOperation,
    wrapAsyncOperation,
  };
}

// Simple error fallback component for source fund operations
export function SourceFundErrorFallback({
  error,
  resetError,
  context,
  type = "unknown",
}: {
  error?: Error;
  resetError?: () => void;
  context?: string;
  type?: "validation" | "network" | "server" | "unknown";
}) {
  const getErrorMessage = () => {
    switch (type) {
      case "validation":
        return "Error de validación en la selección de fondo origen";
      case "network":
        return "Error de conexión al validar el fondo origen";
      case "server":
        return "Error del servidor en la operación de fondo origen";
      default:
        return "Error en la gestión de fondo origen";
    }
  };

  const getErrorIcon = () => {
    switch (type) {
      case "validation":
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      case "network":
        return <RefreshCw className="h-12 w-12 text-blue-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-destructive" />;
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      {getErrorIcon()}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{getErrorMessage()}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {type === "validation" &&
            "Verifique que ha seleccionado un fondo origen válido para la categoría."}
          {type === "network" &&
            "No se pudo conectar con el servidor. Verifique su conexión."}
          {type === "server" &&
            "Ha ocurrido un error interno. Intente nuevamente en unos momentos."}
          {type === "unknown" && "Ha ocurrido un error inesperado."}
          {context && ` (${context})`}
        </p>
        {error && (
          <p className="text-xs text-destructive font-mono bg-destructive/10 p-2 rounded max-w-md">
            {error.message}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        {resetError && (
          <Button variant="outline" size="sm" onClick={resetError}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Reintentar
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Recargar
        </Button>
      </div>
    </div>
  );
}
