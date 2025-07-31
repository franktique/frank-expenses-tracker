"use client";

import { useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  FundErrorDetails,
  formatErrorForUser,
} from "@/lib/fund-error-handling";

interface FundErrorDisplayProps {
  error: FundErrorDetails | string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
  showDetails?: boolean;
}

export function FundErrorDisplay({
  error,
  onRetry,
  onDismiss,
  className,
  showDetails = false,
}: FundErrorDisplayProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  if (!error) return null;

  // Handle string errors
  if (typeof error === "string") {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription className="flex items-center justify-between">
          <span>{error}</span>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="ml-2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const formattedError = formatErrorForUser(error);

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Alert variant="destructive" className={className}>
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <AlertTitle className="flex items-center gap-2">
            {formattedError.title}
            <Badge variant="outline" className="text-xs">
              {error.code}
            </Badge>
          </AlertTitle>
          <div className="flex items-center gap-1">
            {formattedError.canRetry && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-7"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Reintentando..." : "Reintentar"}
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        <AlertDescription className="mt-2">
          <div className="space-y-2">
            <p>{formattedError.message}</p>

            {formattedError.suggestions.length > 0 && (
              <div>
                <p className="font-medium text-sm mb-1">Sugerencias:</p>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {formattedError.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {showDetails && error.details && (
              <Collapsible open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 p-0 text-xs">
                    <span>Detalles técnicos</span>
                    {isDetailsOpen ? (
                      <ChevronUp className="h-3 w-3 ml-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
                    {error.details}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </AlertDescription>
      </div>
    </Alert>
  );
}

// Specialized error displays for common scenarios
export function FundValidationErrorDisplay({
  errors,
  onDismiss,
}: {
  errors: Array<{ field: string; message: string }>;
  onDismiss?: () => void;
}) {
  if (errors.length === 0) return null;

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <AlertTitle>Errores de validación</AlertTitle>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <AlertDescription className="mt-2">
          <ul className="list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={index}>
                <span className="font-medium">{error.field}:</span>{" "}
                {error.message}
              </li>
            ))}
          </ul>
        </AlertDescription>
      </div>
    </Alert>
  );
}

export function FundBalanceErrorDisplay({
  fundName,
  error,
  onRecalculate,
  onDismiss,
}: {
  fundName: string;
  error: string;
  onRecalculate?: () => void;
  onDismiss?: () => void;
}) {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleRecalculate = async () => {
    if (!onRecalculate) return;

    setIsRecalculating(true);
    try {
      await onRecalculate();
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <AlertTitle>Error en el balance del fondo</AlertTitle>
          <div className="flex items-center gap-1">
            {onRecalculate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="h-7"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${
                    isRecalculating ? "animate-spin" : ""
                  }`}
                />
                {isRecalculating ? "Recalculando..." : "Recalcular"}
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <AlertDescription className="mt-2">
          <p>
            Error al calcular el balance del fondo <strong>{fundName}</strong>:{" "}
            {error}
          </p>
          <p className="text-sm mt-1">
            El balance mostrado puede no ser preciso. Intenta recalcular el
            balance manualmente.
          </p>
        </AlertDescription>
      </div>
    </Alert>
  );
}

export function FundConnectionErrorDisplay({
  onRetry,
  onDismiss,
}: {
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    if (!onRetry) return;

    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <AlertTitle>Error de conexión</AlertTitle>
          <div className="flex items-center gap-1">
            {onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                disabled={isRetrying}
                className="h-7"
              >
                <RefreshCw
                  className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`}
                />
                {isRetrying ? "Reintentando..." : "Reintentar"}
              </Button>
            )}
            {onDismiss && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <AlertDescription className="mt-2">
          <p>
            No se pudo conectar con el servidor. Verifica tu conexión a internet
            e inténtalo de nuevo.
          </p>
        </AlertDescription>
      </div>
    </Alert>
  );
}
