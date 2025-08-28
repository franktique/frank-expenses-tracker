"use client";

import React, { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home, AlertCircle, Bug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SimulationErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
  errorType:
    | "validation"
    | "network"
    | "server"
    | "simulation_not_found"
    | "data_consistency"
    | "unknown";
  retryCount: number;
}

interface SimulationErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  showDetails?: boolean;
  context?: string;
  resetOnPropsChange?: boolean;
  maxRetries?: number;
  simulationId?: number;
}

export class SimulationErrorBoundary extends Component<
  SimulationErrorBoundaryProps,
  SimulationErrorBoundaryState
> {
  private resetTimeoutId: number | null = null;
  private maxRetries: number;

  constructor(props: SimulationErrorBoundaryProps) {
    super(props);
    this.maxRetries = props.maxRetries || 3;
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      errorType: "unknown",
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(
    error: Error
  ): Partial<SimulationErrorBoundaryState> {
    const errorType = SimulationErrorBoundary.categorizeError(error);
    return {
      hasError: true,
      error,
      errorType,
      errorId: `sim_error_${Date.now()}_${Math.random()
        .toString(36)
        .substr(2, 9)}`,
    };
  }

  static categorizeError(
    error: Error
  ):
    | "validation"
    | "network"
    | "server"
    | "simulation_not_found"
    | "data_consistency"
    | "unknown" {
    const message = error.message.toLowerCase();

    if (
      message.includes("simulation not found") ||
      message.includes("simulación no encontrada")
    ) {
      return "simulation_not_found";
    }

    if (
      message.includes("validation") ||
      message.includes("invalid") ||
      message.includes("required") ||
      message.includes("debe ser un número positivo")
    ) {
      return "validation";
    }

    if (
      message.includes("fetch") ||
      message.includes("network") ||
      message.includes("connection") ||
      message.includes("failed to fetch")
    ) {
      return "network";
    }

    if (
      message.includes("server") ||
      message.includes("500") ||
      message.includes("internal") ||
      message.includes("database")
    ) {
      return "server";
    }

    if (
      message.includes("consistency") ||
      message.includes("category") ||
      message.includes("budget") ||
      message.includes("mismatch")
    ) {
      return "data_consistency";
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
    console.error("SimulationErrorBoundary caught an error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.context,
      simulationId: this.props.simulationId,
      errorType: this.state.errorType,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // Auto-retry for network errors after 3 seconds
    if (
      this.state.errorType === "network" &&
      this.state.retryCount < this.maxRetries
    ) {
      this.resetTimeoutId = window.setTimeout(() => {
        this.handleRetry();
      }, 3000);
    }
  }

  componentDidUpdate(prevProps: SimulationErrorBoundaryProps) {
    // Reset error state when props change if resetOnPropsChange is true
    if (
      this.props.resetOnPropsChange &&
      this.state.hasError &&
      (prevProps.children !== this.props.children ||
        prevProps.simulationId !== this.props.simulationId)
    ) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: "",
        errorType: "unknown",
        retryCount: 0,
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

    if (this.state.retryCount < this.maxRetries) {
      this.setState((prevState) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: "",
        errorType: "unknown",
        retryCount: prevState.retryCount + 1,
      }));
    }
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
      errorType: "unknown",
      retryCount: 0,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleGoToSimulations = () => {
    window.location.href = "/simular";
  };

  getErrorTitle = (): string => {
    switch (this.state.errorType) {
      case "simulation_not_found":
        return "Simulación no encontrada";
      case "validation":
        return "Error de validación";
      case "network":
        return "Error de conexión";
      case "server":
        return "Error del servidor";
      case "data_consistency":
        return "Error de consistencia de datos";
      default:
        return "Error en simulación";
    }
  };

  getErrorDescription = (): string => {
    switch (this.state.errorType) {
      case "simulation_not_found":
        return "La simulación solicitada no existe o ha sido eliminada. Verifique que el ID de simulación sea correcto.";
      case "validation":
        return "Los datos ingresados no son válidos. Verifique los valores y vuelva a intentar.";
      case "network":
        return "No se pudo conectar con el servidor. Verificando conexión...";
      case "server":
        return "Ha ocurrido un error interno del servidor. El equipo técnico ha sido notificado.";
      case "data_consistency":
        return "Los datos de la simulación no son consistentes. Esto puede deberse a cambios en las categorías o configuración.";
      default:
        return "Ha ocurrido un error inesperado en la simulación.";
    }
  };

  getErrorIcon = () => {
    switch (this.state.errorType) {
      case "simulation_not_found":
        return <AlertCircle className="h-5 w-5" />;
      case "validation":
        return <AlertCircle className="h-5 w-5" />;
      case "network":
        return <RefreshCw className="h-5 w-5 animate-spin" />;
      case "data_consistency":
        return <Bug className="h-5 w-5" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  getErrorVariant = (): "destructive" | "default" => {
    return this.state.errorType === "validation" ? "default" : "destructive";
  };

  getActionButtons = () => {
    const buttons = [];

    // Retry button for retryable errors
    if (
      this.state.retryCount < this.maxRetries &&
      ["network", "server", "data_consistency"].includes(this.state.errorType)
    ) {
      buttons.push(
        <Button
          key="retry"
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
            : `Reintentar (${this.state.retryCount + 1}/${this.maxRetries})`}
        </Button>
      );
    }

    // Reset button for max retries reached
    if (this.state.retryCount >= this.maxRetries) {
      buttons.push(
        <Button
          key="reset"
          variant="outline"
          size="sm"
          onClick={this.handleReset}
          className="flex items-center gap-2"
        >
          <Bug className="h-4 w-4" />
          Restablecer
        </Button>
      );
    }

    // Go to simulations list for simulation not found
    if (this.state.errorType === "simulation_not_found") {
      buttons.push(
        <Button
          key="simulations"
          variant="outline"
          size="sm"
          onClick={this.handleGoToSimulations}
          className="flex items-center gap-2"
        >
          <Home className="h-4 w-4" />
          Ver Simulaciones
        </Button>
      );
    }

    // Reload page button
    if (
      !["validation", "simulation_not_found"].includes(this.state.errorType)
    ) {
      buttons.push(
        <Button
          key="reload"
          variant="outline"
          size="sm"
          onClick={this.handleReload}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Recargar página
        </Button>
      );
    }

    // Go home button
    buttons.push(
      <Button
        key="home"
        variant="outline"
        size="sm"
        onClick={this.handleGoHome}
        className="flex items-center gap-2"
      >
        <Home className="h-4 w-4" />
        Ir al inicio
      </Button>
    );

    return buttons;
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
                {this.props.simulationId &&
                  ` (Simulación #${this.props.simulationId})`}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  ID: {this.state.errorId}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Tipo: {this.state.errorType}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  Intentos: {this.state.retryCount}/{this.maxRetries}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {new Date().toLocaleString()}
                </Badge>
              </div>
            </div>

            {/* Network error auto-retry indicator */}
            {this.state.errorType === "network" &&
              this.state.retryCount < this.maxRetries && (
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

            {/* Data consistency error guidance */}
            {this.state.errorType === "data_consistency" && (
              <Alert variant="default">
                <Bug className="h-4 w-4" />
                <AlertDescription>
                  <strong>Posibles causas:</strong>
                  <ul className="list-disc list-inside mt-1 text-xs">
                    <li>Categorías eliminadas o modificadas</li>
                    <li>Configuración de presupuestos inconsistente</li>
                    <li>Datos de simulación corruptos</li>
                  </ul>
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
                      {this.state.errorInfo && (
                        <div className="mt-2 text-muted-foreground">
                          <strong>Component Stack:</strong>
                          {this.state.errorInfo.componentStack}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-2 flex-wrap">
              {this.getActionButtons()}
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
                  Verifique que todos los campos tengan valores válidos y
                  positivos.
                </>
              )}
              {this.state.errorType === "network" && (
                <>Verifique su conexión a internet e intente nuevamente.</>
              )}
              {this.state.errorType === "simulation_not_found" && (
                <>
                  La simulación puede haber sido eliminada por otro usuario o
                  proceso.
                </>
              )}
              {this.state.errorType === "data_consistency" && (
                <>
                  Intente recargar la página o crear una nueva simulación si el
                  problema persiste.
                </>
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
interface SimulationErrorWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  context?: string;
  showDetails?: boolean;
  resetOnPropsChange?: boolean;
  maxRetries?: number;
  simulationId?: number;
}

export function SimulationErrorWrapper({
  children,
  fallback,
  context,
  showDetails = false,
  resetOnPropsChange = true,
  maxRetries = 3,
  simulationId,
}: SimulationErrorWrapperProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Integration with error reporting services
    console.error("Simulation Error:", {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context,
      simulationId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    });

    // You can add error reporting service integration here
    // Example: Sentry.captureException(error, { contexts: { errorInfo, context, simulationId } });
  };

  return (
    <SimulationErrorBoundary
      fallback={fallback}
      onError={handleError}
      context={context}
      showDetails={showDetails}
      resetOnPropsChange={resetOnPropsChange}
      maxRetries={maxRetries}
      simulationId={simulationId}
    >
      {children}
    </SimulationErrorBoundary>
  );
}

// Hook for handling async errors in simulation operations
export function useSimulationErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);
  const [isRetrying, setIsRetrying] = React.useState(false);
  const [retryCount, setRetryCount] = React.useState(0);

  const handleAsyncError = (
    error: Error,
    context?: string,
    simulationId?: number
  ) => {
    console.error("Async Simulation Error:", {
      error: error.message,
      stack: error.stack,
      context,
      simulationId,
      timestamp: new Date().toISOString(),
    });
    setError(error);
  };

  const clearError = () => {
    setError(null);
    setIsRetrying(false);
    setRetryCount(0);
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
        console.error(`Simulation operation attempt ${attempt} failed:`, error);

        setRetryCount(attempt);

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
    retryCount,
    handleAsyncError,
    clearError,
    retryOperation,
    wrapAsyncOperation,
  };
}

// Simple error fallback component for simulation operations
export function SimulationErrorFallback({
  error,
  resetError,
  context,
  type = "unknown",
  simulationId,
}: {
  error?: Error;
  resetError?: () => void;
  context?: string;
  type?:
    | "validation"
    | "network"
    | "server"
    | "simulation_not_found"
    | "data_consistency"
    | "unknown";
  simulationId?: number;
}) {
  const getErrorMessage = () => {
    switch (type) {
      case "simulation_not_found":
        return "Simulación no encontrada";
      case "validation":
        return "Error de validación en simulación";
      case "network":
        return "Error de conexión en simulación";
      case "server":
        return "Error del servidor en simulación";
      case "data_consistency":
        return "Error de consistencia de datos";
      default:
        return "Error en simulación";
    }
  };

  const getErrorIcon = () => {
    switch (type) {
      case "simulation_not_found":
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      case "validation":
        return <AlertCircle className="h-12 w-12 text-amber-500" />;
      case "network":
        return <RefreshCw className="h-12 w-12 text-blue-500" />;
      case "data_consistency":
        return <Bug className="h-12 w-12 text-orange-500" />;
      default:
        return <AlertTriangle className="h-12 w-12 text-destructive" />;
    }
  };

  const getErrorDescription = () => {
    switch (type) {
      case "simulation_not_found":
        return "La simulación solicitada no existe o ha sido eliminada.";
      case "validation":
        return "Los datos de la simulación no son válidos.";
      case "network":
        return "No se pudo conectar con el servidor.";
      case "server":
        return "Ha ocurrido un error interno del servidor.";
      case "data_consistency":
        return "Los datos de la simulación no son consistentes.";
      default:
        return "Ha ocurrido un error inesperado.";
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
      {getErrorIcon()}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">{getErrorMessage()}</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          {getErrorDescription()}
          {context && ` (${context})`}
          {simulationId && ` - Simulación #${simulationId}`}
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
        {type === "simulation_not_found" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/simular")}
          >
            <Home className="h-4 w-4 mr-2" />
            Ver Simulaciones
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
