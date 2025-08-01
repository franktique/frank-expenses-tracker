/**
 * Active Period Notifications
 *
 * Utility functions for showing user-friendly notifications about active period
 * loading states and errors using the toast system.
 */

import { toast } from "@/hooks/use-toast";
import { PeriodLoadingError } from "./active-period-service";

/**
 * Shows a success notification when active period is loaded
 */
export function showActivePeriodLoadedNotification(periodName: string) {
  toast({
    title: "Periodo activo cargado",
    description: `El periodo "${periodName}" está ahora disponible.`,
    duration: 3000,
  });
}

/**
 * Shows an error notification for active period loading failures
 */
export function showActivePeriodErrorNotification(
  error: PeriodLoadingError,
  onRetry?: () => void
) {
  const getErrorTitle = () => {
    switch (error.type) {
      case "network":
        return "Error de conexión";
      case "authentication":
        return "Sesión expirada";
      case "no_active_period":
        return "No hay periodo activo";
      case "server":
        return "Error del servidor";
      case "timeout":
        return "Tiempo agotado";
      case "invalid_cache":
        return "Datos desactualizados";
      default:
        return "Error al cargar periodo";
    }
  };

  const getErrorDescription = () => {
    switch (error.type) {
      case "network":
        return "Verifica tu conexión a internet e intenta nuevamente.";
      case "authentication":
        return "Tu sesión ha expirado. Inicia sesión nuevamente.";
      case "no_active_period":
        return "Ve a la sección de Periodos para activar uno.";
      case "server":
        return "Intenta nuevamente en unos momentos.";
      case "timeout":
        return "La operación tardó demasiado. Intenta nuevamente.";
      case "invalid_cache":
        return "Los datos se están actualizando automáticamente.";
      default:
        return error.message || "Ocurrió un error inesperado.";
    }
  };

  const toastConfig: any = {
    title: getErrorTitle(),
    description: getErrorDescription(),
    variant: "destructive",
    duration: error.type === "invalid_cache" ? 3000 : 8000,
  };

  // Add retry action for retryable errors
  if (error.retryable && onRetry) {
    toastConfig.action = {
      altText: "Reintentar",
      onClick: onRetry,
      children: "Reintentar",
    };
  }

  toast(toastConfig);
}

/**
 * Shows a loading notification when active period is being loaded
 */
export function showActivePeriodLoadingNotification() {
  return toast({
    title: "Cargando periodo activo",
    description: "Obteniendo información del periodo activo...",
    duration: 2000,
  });
}

/**
 * Shows a notification when active period loading is retried
 */
export function showActivePeriodRetryNotification() {
  toast({
    title: "Reintentando carga",
    description: "Intentando cargar el periodo activo nuevamente...",
    duration: 2000,
  });
}

/**
 * Shows a notification when no active period exists with guidance
 */
export function showNoActivePeriodGuidanceNotification() {
  toast({
    title: "No hay periodo activo",
    description: "Ve a la sección de Periodos para crear o activar uno.",
    duration: 6000,
    action: {
      altText: "Ir a Periodos",
      onClick: () => {
        window.location.href = "/periodos";
      },
      children: "Ir a Periodos",
    },
  });
}

/**
 * Shows a notification when active period changes
 */
export function showActivePeriodChangedNotification(
  oldPeriodName: string | null,
  newPeriodName: string
) {
  const description = oldPeriodName
    ? `Cambiado de "${oldPeriodName}" a "${newPeriodName}".`
    : `Periodo "${newPeriodName}" activado.`;

  toast({
    title: "Periodo activo actualizado",
    description,
    duration: 4000,
  });
}

/**
 * Shows a notification when active period is cleared
 */
export function showActivePeriodClearedNotification() {
  toast({
    title: "Periodo desactivado",
    description: "No hay periodo activo. Activa uno para ver los datos.",
    variant: "destructive",
    duration: 5000,
    action: {
      altText: "Ir a Periodos",
      onClick: () => {
        window.location.href = "/periodos";
      },
      children: "Ir a Periodos",
    },
  });
}

/**
 * Shows a notification when session storage fails
 */
export function showSessionStorageErrorNotification() {
  toast({
    title: "Error de almacenamiento",
    description:
      "No se pudo guardar el periodo en el navegador. Los datos se cargarán desde el servidor.",
    variant: "destructive",
    duration: 4000,
  });
}

/**
 * Shows a notification when cache is invalidated
 */
export function showCacheInvalidatedNotification() {
  toast({
    title: "Datos actualizados",
    description:
      "Los datos del periodo han sido sincronizados con el servidor.",
    duration: 3000,
  });
}
