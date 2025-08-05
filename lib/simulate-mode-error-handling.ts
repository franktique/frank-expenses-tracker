/**
 * Error handling utilities specifically for simulate mode functionality
 * Extends the general error handling with simulation-specific scenarios
 */

import { categorizeError, AppError, ERROR_MESSAGES } from "./error-handling";
import { toast } from "@/components/ui/use-toast";

export type SimulateErrorType =
  | "missing_budget_data"
  | "partial_budget_data"
  | "simulation_api_failure"
  | "filter_conflict"
  | "session_storage_error"
  | "category_simulation_failure";

export interface SimulateError extends AppError {
  simulateType?: SimulateErrorType;
  context?: {
    selectedEstudio?: number | null;
    selectedGroupers?: number[];
    paymentMethod?: string;
    activeTab?: string;
  };
}

/**
 * Categorizes simulation-specific errors
 */
export function categorizeSimulateError(
  error: unknown,
  context?: {
    selectedEstudio?: number | null;
    selectedGroupers?: number[];
    paymentMethod?: string;
    activeTab?: string;
  }
): SimulateError {
  // Handle null, undefined, or non-error values
  if (!error) {
    return {
      type: "unknown",
      message: "Error desconocido en modo simulación",
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
      message: `Error en modo simulación: ${String(error)}`,
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
        simulateType: "missing_budget_data",
        message: "No hay datos de presupuesto disponibles para la simulación",
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
        simulateType: "partial_budget_data",
        message: "Algunos agrupadores no tienen presupuesto asignado",
        retryable: false,
        context,
      };
    }

    // API failure specific to simulation
    if (message.includes("simulation") || message.includes("simulación")) {
      return {
        ...baseError,
        simulateType: "simulation_api_failure",
        message: "Error al cargar datos de simulación",
        retryable: true,
        context,
      };
    }

    // Filter conflicts in simulation mode
    if (
      message.includes("filter conflict") ||
      message.includes("conflicto de filtros")
    ) {
      return {
        ...baseError,
        simulateType: "filter_conflict",
        message: "Conflicto entre filtros y modo simulación",
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
        simulateType: "session_storage_error",
        message: "Error al guardar preferencias de simulación",
        retryable: true,
        context,
      };
    }

    // Category simulation failures
    if (
      message.includes("category simulation") ||
      message.includes("categorías")
    ) {
      return {
        ...baseError,
        simulateType: "category_simulation_failure",
        message: "Error al simular datos de categorías",
        retryable: true,
        context,
      };
    }
  }

  // Return base error with simulation context
  return {
    ...baseError,
    context,
  };
}

/**
 * Handles simulate mode errors with appropriate fallback strategies
 */
export function handleSimulateModeError(
  error: unknown,
  context: {
    selectedEstudio?: number | null;
    selectedGroupers?: number[];
    paymentMethod?: string;
    activeTab?: string;
  },
  fallbackActions: {
    disableSimulateMode: () => void;
    refreshData: () => void;
    showActualData: () => void;
  }
): SimulateError {
  // Safely handle different error types
  let simulateError: SimulateError;

  try {
    // Check if error is already a SimulateError
    if (error && typeof error === "object" && "simulateType" in error) {
      simulateError = error as SimulateError;
    } else {
      // Categorize the error if it's not already a SimulateError
      simulateError = categorizeSimulateError(error, context);
    }
  } catch (categorizationError) {
    // Fallback if categorization fails
    console.warn("Error categorization failed:", categorizationError);
    simulateError = {
      type: "unknown",
      message: "Error desconocido en modo simulación",
      retryable: false,
      context,
    };
  }

  console.error("Simulate mode error:", {
    error: simulateError,
    context,
    timestamp: new Date().toISOString(),
  });

  // Handle different error types with specific strategies
  switch (simulateError.simulateType) {
    case "missing_budget_data":
      handleMissingBudgetData(simulateError, context, fallbackActions);
      break;

    case "partial_budget_data":
      handlePartialBudgetData(simulateError, context, fallbackActions);
      break;

    case "simulation_api_failure":
      handleSimulationApiFailure(simulateError, context, fallbackActions);
      break;

    case "filter_conflict":
      handleFilterConflict(simulateError, context, fallbackActions);
      break;

    case "session_storage_error":
      handleSessionStorageError(simulateError, context, fallbackActions);
      break;

    case "category_simulation_failure":
      handleCategorySimulationFailure(simulateError, context, fallbackActions);
      break;

    default:
      handleGenericSimulateError(simulateError, context, fallbackActions);
      break;
  }

  return simulateError;
}

/**
 * Handle missing budget data scenario
 */
function handleMissingBudgetData(
  error: SimulateError,
  context: any,
  fallbackActions: any
) {
  let description =
    "No se encontraron datos de presupuesto para mostrar la simulación.";

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
        fallbackActions.disableSimulateMode();
        fallbackActions.showActualData();
      },
    },
  });
}

/**
 * Handle partial budget data scenario
 */
function handlePartialBudgetData(
  error: SimulateError,
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
      altText: "Continuar simulación",
      onClick: () => {
        // Continue with simulation showing zero values for missing budget data
        fallbackActions.refreshData();
      },
    },
  });
}

/**
 * Handle simulation API failure
 */
function handleSimulationApiFailure(
  error: SimulateError,
  context: any,
  fallbackActions: any
) {
  let description =
    "Error al cargar datos de simulación. Mostrando datos reales en su lugar.";

  if (error.retryable) {
    toast({
      title: "Error en simulación",
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
    fallbackActions.disableSimulateMode();
    fallbackActions.showActualData();

    toast({
      title: "Error en simulación",
      description,
      variant: "destructive",
    });
  }
}

/**
 * Handle filter conflicts in simulation mode
 */
function handleFilterConflict(
  error: SimulateError,
  context: any,
  fallbackActions: any
) {
  let description =
    "Los filtros aplicados no son compatibles con el modo simulación.";

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
        // Continue simulation but inform about filter behavior
        fallbackActions.refreshData();
      },
    },
  });
}

/**
 * Handle session storage errors
 */
function handleSessionStorageError(
  error: SimulateError,
  context: any,
  fallbackActions: any
) {
  const description =
    "No se pudo guardar la preferencia de simulación. El modo simulación funcionará pero no se recordará al recargar la página.";

  toast({
    title: "Error de almacenamiento",
    description,
    variant: "default",
  });

  // Continue with simulation even if storage fails
}

/**
 * Handle category simulation failures
 */
function handleCategorySimulationFailure(
  error: SimulateError,
  context: any,
  fallbackActions: any
) {
  const description =
    "Error al simular datos de categorías. Mostrando datos reales para el desglose de categorías.";

  toast({
    title: "Error en simulación de categorías",
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
 * Handle generic simulation errors
 */
function handleGenericSimulateError(
  error: SimulateError,
  context: any,
  fallbackActions: any
) {
  const description =
    error.message ||
    "Error desconocido en modo simulación. Mostrando datos reales.";

  fallbackActions.disableSimulateMode();
  fallbackActions.showActualData();

  toast({
    title: "Error en simulación",
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
): { isValid: boolean; error?: SimulateError } {
  try {
    if (!data || data.length === 0) {
      return {
        isValid: false,
        error: categorizeSimulateError(
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
        error: categorizeSimulateError(
          new Error("No budget amounts found in data"),
          context
        ),
      };
    }

    // Check for partial budget data
    if (itemsWithBudget.length < data.length) {
      return {
        isValid: true, // Still valid, but with warning
        error: categorizeSimulateError(
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
    disableSimulateMode: () => void;
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

          const simulateError = categorizeSimulateError(error);

          // Don't retry non-retryable errors
          if (!simulateError.retryable || attempt === maxRetries) {
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
        fallbackActions.disableSimulateMode();
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
export const SIMULATE_ERROR_MESSAGES = {
  NO_BUDGET_DATA: "No hay datos de presupuesto disponibles para la simulación",
  PARTIAL_BUDGET_DATA: "Algunos agrupadores no tienen presupuesto asignado",
  SIMULATION_API_FAILURE: "Error al cargar datos de simulación",
  FILTER_CONFLICT:
    "Los filtros aplicados no son compatibles con el modo simulación",
  SESSION_STORAGE_ERROR: "Error al guardar preferencias de simulación",
  CATEGORY_SIMULATION_FAILURE: "Error al simular datos de categorías",
  FALLBACK_TO_ACTUAL: "Mostrando datos reales en lugar de simulación",
  RETRY_SIMULATION:
    "Haz clic en 'Reintentar' para volver a intentar la simulación",
  CONTINUE_WITH_PARTIAL: "Continuar con simulación parcial",
} as const;
