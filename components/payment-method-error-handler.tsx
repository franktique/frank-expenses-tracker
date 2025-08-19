"use client";

import React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  RefreshCw,
  Wifi,
  Database,
  Clock,
  Bug,
  CheckCircle,
  Info,
} from "lucide-react";
import type { ApiError } from "@/hooks/use-payment-method-validation";

interface PaymentMethodErrorHandlerProps {
  error: ApiError | Error | null;
  onRetry?: () => void;
  onClear?: () => void;
  canRetry?: boolean;
  retryCount?: number;
  maxRetries?: number;
  className?: string;
}

export function PaymentMethodErrorHandler({
  error,
  onRetry,
  onClear,
  canRetry = false,
  retryCount = 0,
  maxRetries = 3,
  className = "",
}: PaymentMethodErrorHandlerProps) {
  if (!error) return null;

  // Determine error type and appropriate icon/styling
  const getErrorInfo = (error: ApiError | Error) => {
    if ("code" in error) {
      const apiError = error as ApiError;
      switch (apiError.code) {
        case "NETWORK_ERROR":
          return {
            icon: Wifi,
            variant: "destructive" as const,
            title: "Error de Conexión",
            canAutoRetry: true,
          };
        case "DATABASE_CONNECTION_ERROR":
          return {
            icon: Database,
            variant: "destructive" as const,
            title: "Error de Base de Datos",
            canAutoRetry: true,
          };
        case "TIMEOUT_ERROR":
          return {
            icon: Clock,
            variant: "destructive" as const,
            title: "Tiempo Agotado",
            canAutoRetry: true,
          };
        case "INVALID_TYPE":
        case "EMPTY_ARRAY":
        case "INVALID_METHODS":
        case "DUPLICATE_METHODS":
        case "TOO_MANY_METHODS":
          return {
            icon: AlertTriangle,
            variant: "destructive" as const,
            title: "Error de Validación",
            canAutoRetry: false,
          };
        case "DATABASE_CONSTRAINT_ERROR":
          return {
            icon: Database,
            variant: "destructive" as const,
            title: "Error de Datos",
            canAutoRetry: false,
          };
        default:
          return {
            icon: Bug,
            variant: "destructive" as const,
            title: "Error del Sistema",
            canAutoRetry: true,
          };
      }
    }

    return {
      icon: AlertTriangle,
      variant: "destructive" as const,
      title: "Error",
      canAutoRetry: false,
    };
  };

  const errorInfo = getErrorInfo(error);
  const Icon = errorInfo.icon;
  const isApiError = "code" in error;
  const apiError = isApiError ? (error as ApiError) : null;

  return (
    <Alert variant={errorInfo.variant} className={className}>
      <Icon className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {errorInfo.title}
        {apiError?.code && (
          <Badge variant="outline" className="text-xs">
            {apiError.code}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="mt-2">
        <div className="space-y-3">
          {/* Main error message */}
          <p className="font-medium">
            {isApiError ? apiError!.error : error.message}
          </p>

          {/* Additional details */}
          {apiError?.details && (
            <div className="text-sm space-y-2">
              {typeof apiError.details === "string" ? (
                <p className="text-muted-foreground">{apiError.details}</p>
              ) : (
                <details className="bg-muted/50 p-2 rounded text-xs">
                  <summary className="cursor-pointer font-medium">
                    Detalles técnicos
                  </summary>
                  <pre className="mt-2 whitespace-pre-wrap">
                    {JSON.stringify(apiError.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}

          {/* Suggestions based on error type */}
          {apiError?.code && (
            <div className="text-sm">
              <p className="font-medium text-muted-foreground mb-1">
                Soluciones sugeridas:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                {getSuggestions(apiError.code).map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {canRetry && onRetry && (
              <Button
                onClick={onRetry}
                size="sm"
                variant="outline"
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {retryCount >= maxRetries
                  ? "Máximo de reintentos alcanzado"
                  : `Reintentar (${retryCount}/${maxRetries})`}
              </Button>
            )}

            {onClear && (
              <Button onClick={onClear} size="sm" variant="secondary">
                Cerrar
              </Button>
            )}

            <Button
              onClick={() => window.location.reload()}
              size="sm"
              variant="ghost"
            >
              Recargar página
            </Button>
          </div>

          {/* Retry information */}
          {canRetry && retryCount > 0 && (
            <div className="text-xs text-muted-foreground pt-2 border-t">
              <Info className="h-3 w-3 inline mr-1" />
              Intento {retryCount} de {maxRetries}.
              {retryCount < maxRetries &&
                " El próximo intento será en unos segundos."}
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function getSuggestions(errorCode: string): string[] {
  switch (errorCode) {
    case "NETWORK_ERROR":
      return [
        "Verifica tu conexión a internet",
        "Intenta recargar la página",
        "Verifica que el servidor esté disponible",
      ];

    case "DATABASE_CONNECTION_ERROR":
      return [
        "Espera unos momentos e intenta nuevamente",
        "Verifica que el servicio esté funcionando",
        "Contacta al administrador si el problema persiste",
      ];

    case "TIMEOUT_ERROR":
      return [
        "Intenta nuevamente con una conexión más estable",
        "Verifica que no haya problemas de red",
        "Reduce la cantidad de datos si es posible",
      ];

    case "INVALID_TYPE":
      return [
        "Verifica que los datos enviados sean del tipo correcto",
        "Revisa la configuración de métodos de pago",
        "Recarga la página para restablecer el formulario",
      ];

    case "EMPTY_ARRAY":
      return [
        "Selecciona al menos un método de pago o usa 'Todos los métodos'",
        "Verifica que la selección no esté vacía",
        "Usa la opción 'Todos los métodos' si quieres incluir todos",
      ];

    case "INVALID_METHODS":
      return [
        "Verifica que solo uses métodos válidos: Efectivo, Crédito, Débito",
        "Recarga la página para restablecer las opciones",
        "Contacta al administrador si el problema persiste",
      ];

    case "DUPLICATE_METHODS":
      return [
        "Elimina los métodos de pago duplicados",
        "Verifica que cada método esté seleccionado solo una vez",
        "Recarga la página para restablecer la selección",
      ];

    case "TOO_MANY_METHODS":
      return [
        "Verifica que no hayas seleccionado métodos duplicados",
        "Solo puedes seleccionar hasta 3 métodos diferentes",
        "Recarga la página para restablecer la selección",
      ];

    case "DATABASE_CONSTRAINT_ERROR":
      return [
        "Verifica que los datos cumplan con los requisitos",
        "Revisa que no haya conflictos con datos existentes",
        "Contacta al administrador para revisar las restricciones",
      ];

    default:
      return [
        "Intenta recargar la página",
        "Verifica tu conexión a internet",
        "Contacta al administrador si el problema persiste",
      ];
  }
}

// Success handler component
interface PaymentMethodSuccessHandlerProps {
  message: string;
  details?: string;
  onDismiss?: () => void;
  className?: string;
}

export function PaymentMethodSuccessHandler({
  message,
  details,
  onDismiss,
  className = "",
}: PaymentMethodSuccessHandlerProps) {
  return (
    <Alert className={`border-green-200 bg-green-50 ${className}`}>
      <CheckCircle className="h-4 w-4 text-green-600" />
      <AlertTitle className="text-green-800">Operación Exitosa</AlertTitle>
      <AlertDescription className="text-green-700">
        <div className="space-y-2">
          <p className="font-medium">{message}</p>
          {details && <p className="text-sm text-green-600">{details}</p>}
          {onDismiss && (
            <Button
              onClick={onDismiss}
              size="sm"
              variant="outline"
              className="mt-2 border-green-300 text-green-700 hover:bg-green-100"
            >
              Cerrar
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
