/**
 * Error handling utilities specifically for projection mode functionality
 * Extends the general error handling with projection-specific scenarios
 */

import { categorizeError, AppError, ERROR_MESSAGES } from "./error-handling";
import { toast } from "@/components/ui/use-toast";

export type ProjectionErrorType =
  | "missing_budget_data"
  | "partial_budget_data"
  | "projection_api_failure"
  | "filter_conflict"
  | "session_storage_error"
  | "category_projection_failure";

export interface ProjectionError extends AppError {
  projectionType?: ProjectionErrorType;
  context?: {
    selectedEstudio?: number | null;
    selectedGroupers?: number[];
    paymentMethod?: string;
    activeTab?: string;
  };
}

/**
 * Categorizes projection-specific errors
 */
export function categorizeProjectionError(
  error: unknown,
  context?: {
    selectedEstudio?: number | null;
    selectedGroupers?: number[];
    paymentMethod?: string;
    activeTab?: string;
  }
): ProjectionError {
  // Handle null, undefined, or non-error values
  if (!error) {
    return {
      type: "unknown",
      message: "Error desconocido en modo proyección",
      retryable: false,
      context,
    };
  }

  // Handle primitive values (numbers, strings, etc.)
  if (
    typeof error === "number" ||
    typeof error === "string" ||
    typeof error === "boolean"
  ) {
    return {
      type: "unknown",
      message: `Error en modo proyección: ${String(error)}`,
      retryable: false,
      context,
    };
  }

  const baseError = categorizeError(error);

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Missing budget data scenario
    if (message.includes("no budget") || message.includes("sin presupuesto")) {
      return {
        ...baseError,
        projectionType: "missing_budget_data",
        message: "No hay datos de presupuesto disponibles para la proyección",
        retryable: false,
        context,
      };
    }

    // Partial budget data scenario
    if (
      message.includes("partial budget") ||
      message.includes("presupuesto parcial")
    ) {
      return {
        ...baseError,
        projectionType: "partial_budget_data",
        message: "Algunos agrupadores no tienen presupuesto asignado",
        retryable: false,
        context,
      };
    }

    // API failure specific to projection
    if (message.includes("projection") || message.includes("proyección")) {
      return {
        ...baseError,
        projectionType: "projection_api_failure",
        message: "Error al cargar datos de proyección",
        retryable: true,
        context,
      };
    }

    // Filter conflicts in projection mode
    if (
      message.includes("filter conflict") ||
      message.includes("conflicto de filtros")
    ) {
      return {
        ...baseError,
        projectionType: "filter_conflict",
        message: "Conflicto entre filtros y modo proyección",
        retryable: false,
        context,
      };
    }

    // Session storage errors
    if (
      message.includes("session storage") ||
      message.includes("almacenamiento")
    ) {
      return {
        ...baseError,
        projectionType: "session_storage_error",
        message: "Error al guardar preferencias de proyección",
        retryable: true,
        context,
      };
    }

    // Category projection failures
    if (
      message.includes("category projection") ||
      message.includes("categorías")
    ) {
      return {
        ...baseError,
        projectionType: "category_projection_failure",
        message: "Error al proyectar datos de categorías",
        retryable: true,
        context,
      };
    }
  }

  // Return base error with projection context
  return {
    ...baseError,
    context,
  };
}

/**
 * Handles simulate mode errors with appropriate fallback strategies
 */
export function handleProjectionModeError(
  error: unknown,
  context: {
    selectedEstudio?: number | null;
    selectedGroupers?: number[];
    paymentMethod?: string;
    activeTab?: string;
  },
  fallbackActions: {
    disableProjectionMode: () => void;
    refreshData: () => void;
    showActualData: () => void;
  }
): ProjectionError {
  // Safely handle different error types
  let projectionError: ProjectionError;

  try {
    // Check if error is already a ProjectionError
    if (error && typeof error === "object" && "projectionType" in error) {
      projectionError = error as ProjectionError;
    } else {
      // Categorize the error if it's not already a ProjectionError
      projectionError = categorizeProjectionError(error, context);
    }
  } catch (categorizationError) {
    // Fallback if categorization fails
    console.warn("Error categorization failed:", categorizationError);
    projectionError = {
      type: "unknown",
      message: "Error desconocido en modo proyección",
      retryable: false,
      context,
    };
  }

  console.error("Simulate mode error:", {
    error: projectionError,
    context,
    timestamp: new Date().toISOString(),
  });

  // Handle different error types with specific strategies
  switch (projectionError.projectionType) {
    case "missing_budget_data":
      handleMissingBudgetData(projectionError, context, fallbackActions);
      break;

    case "partial_budget_data":
      handlePartialBudgetData(projectionError, context, fallbackActions);
      break;

    case "projection_api_failure":
      handleProjectionApiFailure(projectionError, context, fallbackActions);
      break;

    case "filter_conflict":
      handleFilterConflict(projectionError, context, fallbackActions);
      break;

    case "session_storage_error":
      handleSessionStorageError(projectionError, context, fallbackActions);
      break;

    case "category_projection_failure":
      handleCategoryProjectionFailure(projectionError, context, fallbackActions);
      break;

    default:
      handleGenericProjectionError(projectionError, context, fallbackActions);
      break;
  }

  return projectionError;
}

/**
 * Handle missing budget data scenario
 */
function handleMissingBudgetData(
  error: ProjectionError,
  context: any,
  fallbackActions: any
) {
  let description =
    "No se encontraron datos de presupuesto para mostrar la proyección.";

  if (context.selectedEstudio) {
    description +=
      " Verifica que el estudio seleccionado tenga presupuestos configurados.";
  }

  if (context.selectedGroupers?.length > 0) {
    description +=
      " Los agrupadores seleccionados no tienen presupuesto asignado.";
  }

  toast({
    title: "Sin datos de presupuesto",
    description,
    variant: "destructive",
    action: {
      altText: "Ver datos reales",
      onClick: () => {
        fallbackActions.disableProjectionMode();
        fallbackActions.showActualData();
      },
    },
  });
}

/**
 * Handle partial budget data scenario
 */
function handlePartialBudgetData(
  error: ProjectionError,
  context: any,
  fallbackActions: any
) {
  let description =
    "Algunos agrupadores no tienen presupuesto asignado y se mostrarán con valor cero.";

  if (context.selectedGroupers?.length > 0) {
    description += ` De los ${context.selectedGroupers.length} agrupadores seleccionados, algunos no tienen presupuesto.`;
  }

  toast({
    title: "Presupuesto parcial",
    description,
    variant: "default",
    action: {
      altText: "Continuar proyección",
      onClick: () => {
        // Continue with projection showing zero values for missing budget data
        fallbackActions.refreshData();
      },
    },
  });
}

/**
 * Handle projection API failure
 */
function handleProjectionApiFailure(
  error: ProjectionError,
  context: any,
  fallbackActions: any
) {
  let description =
    "Error al cargar datos de proyección. Mostrando datos reales en su lugar.";

  if (error.retryable) {
    toast({
      title: "Error en proyección",
      description,
      variant: "destructive",
      action: {
        altText: "Reintentar",
        onClick: () => {
          fallbackActions.refreshData();
        },
      },
    });
  } else {
    fallbackActions.disableProjectionMode();
    fallbackActions.showActualData();

    toast({
      title: "Error en proyección",
      description,
      variant: "destructive",
    });
  }
}

/**
 * Handle filter conflicts in projection mode
 */
function handleFilterConflict(
  error: ProjectionError,
  context: any,
  fallbackActions: any
) {
  let description =
    "Los filtros aplicados no son compatibles con el modo proyección.";

  if (context.paymentMethod && context.paymentMethod !== "all") {
    description +=
      " Los presupuestos no dependen del método de pago seleccionado.";
  }

  toast({
    title: "Conflicto de filtros",
    description,
    variant: "default",
    action: {
      altText: "Ajustar filtros",
      onClick: () => {
        // Continue projection but inform about filter behavior
        fallbackActions.refreshData();
      },
    },
  });
}

/**
 * Handle session storage errors
 */
function handleSessionStorageError(
  error: ProjectionError,
  context: any,
  fallbackActions: any
) {
  const description =
    "No se pudo guardar la preferencia de proyección. El modo proyección funcionará pero no se recordará al recargar la página.";

  toast({
    title: "Error de almacenamiento",
    description,
    variant: "default",
  });

  // Continue with projection even if storage fails
}

/**
 * Handle category projection failures
 */
function handleCategoryProjectionFailure(
  error: ProjectionError,
  context: any,
  fallbackActions: any
) {
  const description =
    "Error al proyectar datos de categorías. Mostrando datos reales para el desglose de categorías.";

  toast({
    title: "Error en proyección de categorías",
    description,
    variant: "destructive",
    action: {
      altText: "Reintentar",
      onClick: () => {
        fallbackActions.refreshData();
      },
    },
  });
}

/**
 * Handle generic projection errors
 */
function handleGenericProjectionError(
  error: ProjectionError,
  context: any,
  fallbackActions: any
) {
  const description =
    error.message ||
    "Error desconocido en modo proyección. Mostrando datos reales.";

  fallbackActions.disableProjectionMode();
  fallbackActions.showActualData();

  toast({
    title: "Error en proyección",
    description,
    variant: "destructive",
  });
}

/**
 * Validates budget data and provides specific error information
 */
export function validateBudgetData(
  data: any[],
  context: {
    selectedEstudio?: number | null;
    selectedGroupers?: number[];
  }
): { isValid: boolean; error?: ProjectionError } {
  try {
    if (!data || data.length === 0) {
      return {
        isValid: false,
        error: categorizeProjectionError(
          new Error("No budget data available"),
          context
        ),
      };
    }
  } catch (error) {
    console.error("Error in validateBudgetData initial check:", error);
    return {
      isValid: false,
      error: {
        type: "unknown",
        message: "Error validating budget data",
        retryable: false,
        context,
      },
    };
  }

  try {
    // Check if any items have budget data
    const itemsWithBudget = data.filter(
      (item) =>
        item.budget_amount !== null &&
        item.budget_amount !== undefined &&
        item.budget_amount > 0
    );

    if (itemsWithBudget.length === 0) {
      return {
        isValid: false,
        error: categorizeProjectionError(
          new Error("No budget amounts found in data"),
          context
        ),
      };
    }

    // Check for partial budget data
    if (itemsWithBudget.length < data.length) {
      return {
        isValid: true, // Still valid, but with warning
        error: categorizeProjectionError(
          new Error("Partial budget data available"),
          context
        ),
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error("Error in validateBudgetData processing:", error);
    return {
      isValid: false,
      error: {
        type: "unknown",
        message: "Error processing budget data validation",
        retryable: false,
        context,
      },
    };
  }
}

/**
 * Creates error recovery strategies for API failures
 */
export function createErrorRecoveryStrategies(
  originalFetch: () => Promise<any>,
  fallbackActions: {
    disableProjectionMode: () => void;
    refreshData: () => void;
    showActualData: () => void;
  }
) {
  return {
    // Retry with exponential backoff
    retryWithBackoff: async (maxRetries: number = 3): Promise<any> => {
      let lastError: unknown;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          return await originalFetch();
        } catch (error) {
          lastError = error;

          const projectionError = categorizeProjectionError(error);

          // Don't retry non-retryable errors
          if (!projectionError.retryable || attempt === maxRetries) {
            throw error;
          }

          // Wait before retrying
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }

      throw lastError;
    },

    // Fallback to actual data
    fallbackToActualData: async (): Promise<any> => {
      try {
        fallbackActions.disableProjectionMode();
        return await originalFetch();
      } catch (error) {
        // If even actual data fails, show error
        throw error;
      }
    },

    // Graceful degradation
    gracefulDegradation: async (): Promise<any> => {
      try {
        return await originalFetch();
      } catch (error) {
        // Return empty data structure to prevent UI crashes
        console.warn("Graceful degradation: returning empty data", error);
        return [];
      }
    },
  };
}

/**
 * Simulation-specific error messages
 */
export const PROJECTION_ERROR_MESSAGES = {
  NO_BUDGET_DATA: "No hay datos de presupuesto disponibles para la proyección",
  PARTIAL_BUDGET_DATA: "Algunos agrupadores no tienen presupuesto asignado",
  PROJECTION_API_FAILURE: "Error al cargar datos de proyección",
  FILTER_CONFLICT:
    "Los filtros aplicados no son compatibles con el modo proyección",
  SESSION_STORAGE_ERROR: "Error al guardar preferencias de proyección",
  CATEGORY_PROJECTION_FAILURE: "Error al proyectar datos de categorías",
  FALLBACK_TO_ACTUAL: "Mostrando datos reales en lugar de proyección",
  RETRY_PROJECTION:
    "Haz clic en 'Reintentar' para volver a intentar la proyección",
  CONTINUE_WITH_PARTIAL: "Continuar con proyección parcial",
} as const;

/**
 * Saves projection validation data to session storage
 */
export function saveProjectionValidationToSession(
  validation: any,
  context?: any
): void {
  try {
    const data = {
      validation,
      context,
      timestamp: new Date().toISOString(),
    };
    sessionStorage.setItem("projection-validation", JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to save projection validation to session:", error);
  }
}
