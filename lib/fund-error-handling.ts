import { FUND_ERROR_MESSAGES } from "@/types/funds";

// Enhanced error types for fund operations
export interface FundErrorDetails {
  code: string;
  message: string;
  field?: string;
  details?: string;
  recoverable?: boolean;
  retryable?: boolean;
}

export interface FundValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FundOperationError {
  operation: string;
  errors: FundErrorDetails[];
  timestamp: string;
  context?: Record<string, any>;
}

// Error codes for different types of fund errors
export const FUND_ERROR_CODES = {
  // Validation errors
  VALIDATION_FAILED: "VALIDATION_FAILED",
  REQUIRED_FIELD_MISSING: "REQUIRED_FIELD_MISSING",
  INVALID_FORMAT: "INVALID_FORMAT",
  VALUE_OUT_OF_RANGE: "VALUE_OUT_OF_RANGE",

  // Business logic errors
  FUND_NOT_FOUND: "FUND_NOT_FOUND",
  DUPLICATE_FUND_NAME: "DUPLICATE_FUND_NAME",
  REFERENTIAL_INTEGRITY_VIOLATION: "REFERENTIAL_INTEGRITY_VIOLATION",
  INSUFFICIENT_BALANCE: "INSUFFICIENT_BALANCE",
  INVALID_FUND_OPERATION: "INVALID_FUND_OPERATION",

  // System errors
  DATABASE_ERROR: "DATABASE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  CALCULATION_ERROR: "CALCULATION_ERROR",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",

  // Permission errors
  UNAUTHORIZED_OPERATION: "UNAUTHORIZED_OPERATION",
  FORBIDDEN_OPERATION: "FORBIDDEN_OPERATION",
} as const;

// User-friendly error messages mapping
export const USER_FRIENDLY_ERROR_MESSAGES: Record<string, string> = {
  [FUND_ERROR_CODES.VALIDATION_FAILED]:
    "Los datos proporcionados no son válidos",
  [FUND_ERROR_CODES.REQUIRED_FIELD_MISSING]: "Faltan campos obligatorios",
  [FUND_ERROR_CODES.INVALID_FORMAT]: "El formato de los datos no es correcto",
  [FUND_ERROR_CODES.VALUE_OUT_OF_RANGE]:
    "El valor está fuera del rango permitido",

  [FUND_ERROR_CODES.FUND_NOT_FOUND]: FUND_ERROR_MESSAGES.FUND_NOT_FOUND,
  [FUND_ERROR_CODES.DUPLICATE_FUND_NAME]:
    FUND_ERROR_MESSAGES.FUND_NAME_DUPLICATE,
  [FUND_ERROR_CODES.REFERENTIAL_INTEGRITY_VIOLATION]:
    FUND_ERROR_MESSAGES.FUND_DELETE_RESTRICTED,
  [FUND_ERROR_CODES.INSUFFICIENT_BALANCE]:
    "Balance insuficiente para realizar la operación",
  [FUND_ERROR_CODES.INVALID_FUND_OPERATION]: "Operación de fondo no válida",

  [FUND_ERROR_CODES.DATABASE_ERROR]:
    "Error en la base de datos. Por favor, inténtalo de nuevo",
  [FUND_ERROR_CODES.NETWORK_ERROR]:
    "Error de conexión. Verifica tu conexión a internet",
  [FUND_ERROR_CODES.CALCULATION_ERROR]:
    FUND_ERROR_MESSAGES.FUND_BALANCE_CALCULATION_ERROR,
  [FUND_ERROR_CODES.TIMEOUT_ERROR]:
    "La operación tardó demasiado tiempo. Inténtalo de nuevo",

  [FUND_ERROR_CODES.UNAUTHORIZED_OPERATION]:
    "No tienes permisos para realizar esta operación",
  [FUND_ERROR_CODES.FORBIDDEN_OPERATION]: "Esta operación no está permitida",
};

// Error recovery suggestions
export const ERROR_RECOVERY_SUGGESTIONS: Record<string, string[]> = {
  [FUND_ERROR_CODES.VALIDATION_FAILED]: [
    "Revisa los campos marcados en rojo",
    "Asegúrate de completar todos los campos obligatorios",
    "Verifica que los valores estén en el formato correcto",
  ],
  [FUND_ERROR_CODES.FUND_NOT_FOUND]: [
    "Verifica que el fondo aún existe",
    "Actualiza la página para obtener los datos más recientes",
    "Selecciona un fondo diferente",
  ],
  [FUND_ERROR_CODES.DUPLICATE_FUND_NAME]: [
    "Elige un nombre diferente para el fondo",
    "Verifica si ya existe un fondo con ese nombre",
    "Agrega un sufijo o número al nombre",
  ],
  [FUND_ERROR_CODES.REFERENTIAL_INTEGRITY_VIOLATION]: [
    "Elimina primero las categorías asociadas al fondo",
    "Reasigna las transacciones a otro fondo",
    "Considera desactivar el fondo en lugar de eliminarlo",
  ],
  [FUND_ERROR_CODES.DATABASE_ERROR]: [
    "Inténtalo de nuevo en unos momentos",
    "Verifica tu conexión a internet",
    "Si el problema persiste, contacta al soporte técnico",
  ],
  [FUND_ERROR_CODES.NETWORK_ERROR]: [
    "Verifica tu conexión a internet",
    "Inténtalo de nuevo",
    "Recarga la página si es necesario",
  ],
  [FUND_ERROR_CODES.CALCULATION_ERROR]: [
    "Intenta recalcular el balance manualmente",
    "Verifica que no haya transacciones duplicadas",
    "Si el problema persiste, contacta al soporte técnico",
  ],
};

// Error classification helper
export function classifyError(error: any): FundErrorDetails {
  // Handle Zod validation errors
  if (error.name === "ZodError") {
    return {
      code: FUND_ERROR_CODES.VALIDATION_FAILED,
      message: "Datos de entrada no válidos",
      details: error.errors
        .map((e: any) => `${e.path.join(".")}: ${e.message}`)
        .join(", "),
      recoverable: true,
      retryable: false,
    };
  }

  // Handle database constraint errors
  if (error.code === "23505") {
    // PostgreSQL unique constraint violation
    return {
      code: FUND_ERROR_CODES.DUPLICATE_FUND_NAME,
      message:
        USER_FRIENDLY_ERROR_MESSAGES[FUND_ERROR_CODES.DUPLICATE_FUND_NAME],
      recoverable: true,
      retryable: false,
    };
  }

  if (error.code === "23503") {
    // PostgreSQL foreign key constraint violation
    return {
      code: FUND_ERROR_CODES.REFERENTIAL_INTEGRITY_VIOLATION,
      message:
        USER_FRIENDLY_ERROR_MESSAGES[
          FUND_ERROR_CODES.REFERENTIAL_INTEGRITY_VIOLATION
        ],
      recoverable: true,
      retryable: false,
    };
  }

  // Handle network errors
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return {
      code: FUND_ERROR_CODES.NETWORK_ERROR,
      message: USER_FRIENDLY_ERROR_MESSAGES[FUND_ERROR_CODES.NETWORK_ERROR],
      recoverable: true,
      retryable: true,
    };
  }

  // Handle timeout errors
  if (error.name === "AbortError" || error.message.includes("timeout")) {
    return {
      code: FUND_ERROR_CODES.TIMEOUT_ERROR,
      message: USER_FRIENDLY_ERROR_MESSAGES[FUND_ERROR_CODES.TIMEOUT_ERROR],
      recoverable: true,
      retryable: true,
    };
  }

  // Default to database error for unknown errors
  return {
    code: FUND_ERROR_CODES.DATABASE_ERROR,
    message:
      error.message ||
      USER_FRIENDLY_ERROR_MESSAGES[FUND_ERROR_CODES.DATABASE_ERROR],
    details: error.stack,
    recoverable: true,
    retryable: true,
  };
}

// Error formatting for user display
export function formatErrorForUser(error: FundErrorDetails): {
  title: string;
  message: string;
  suggestions: string[];
  canRetry: boolean;
} {
  const suggestions = ERROR_RECOVERY_SUGGESTIONS[error.code] || [
    "Inténtalo de nuevo",
    "Si el problema persiste, contacta al soporte técnico",
  ];

  return {
    title: "Error en la operación",
    message: error.message,
    suggestions,
    canRetry: error.retryable || false,
  };
}

// Validation error formatter for forms
export function formatValidationErrors(errors: any[]): FundValidationError[] {
  return errors.map((error) => ({
    field: error.path?.join(".") || "unknown",
    message: error.message,
    code: error.code || FUND_ERROR_CODES.VALIDATION_FAILED,
  }));
}

// Error logging helper
export function logFundError(
  operation: string,
  error: any,
  context?: Record<string, any>
) {
  const errorDetails = classifyError(error);
  const logEntry: FundOperationError = {
    operation,
    errors: [errorDetails],
    timestamp: new Date().toISOString(),
    context,
  };

  console.error("Fund operation error:", logEntry);

  // In a production environment, you might want to send this to a logging service
  // Example: sendToLoggingService(logEntry);
}

// Retry mechanism with exponential backoff
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorDetails = classifyError(error);

      // Don't retry if the error is not retryable
      if (!errorDetails.retryable || attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// Error boundary helper for React components
export function createErrorBoundaryHandler(componentName: string) {
  return (error: Error, errorInfo: any) => {
    logFundError(`${componentName}_render_error`, error, {
      componentStack: errorInfo.componentStack,
    });
  };
}

// API error response helper
export function createErrorResponse(error: any, status: number = 500) {
  const errorDetails = classifyError(error);

  return {
    error: {
      code: errorDetails.code,
      message: errorDetails.message,
      details: errorDetails.details,
      recoverable: errorDetails.recoverable,
      retryable: errorDetails.retryable,
    },
    timestamp: new Date().toISOString(),
  };
}

// Form validation helper
export function validateFundForm(
  data: any,
  schema: any
): {
  isValid: boolean;
  errors: FundValidationError[];
  data?: any;
} {
  try {
    const validatedData = schema.parse(data);
    return {
      isValid: true,
      errors: [],
      data: validatedData,
    };
  } catch (error: any) {
    if (error.name === "ZodError") {
      return {
        isValid: false,
        errors: formatValidationErrors(error.errors),
      };
    }

    return {
      isValid: false,
      errors: [
        {
          field: "general",
          message: error.message || "Error de validación desconocido",
          code: FUND_ERROR_CODES.VALIDATION_FAILED,
        },
      ],
    };
  }
}
