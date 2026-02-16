/**
 * Error handling utilities for the agrupadores filtering and budget comparison feature
 */

export type ErrorType =
  | 'network'
  | 'validation'
  | 'server'
  | 'timeout'
  | 'not_found'
  | 'unknown';

export interface AppError {
  type: ErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
}

/**
 * Categorizes errors and provides user-friendly messages
 */
export function categorizeError(error: unknown): AppError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Network/Connection errors
    if (
      message.includes('fetch') ||
      message.includes('network') ||
      message.includes('connection')
    ) {
      return {
        type: 'network',
        message: 'Error de conexión. Verifica tu conexión a internet.',
        originalError: error,
        retryable: true,
      };
    }

    // Timeout errors
    if (message.includes('timeout') || message.includes('tardó demasiado')) {
      return {
        type: 'timeout',
        message: 'La operación tardó demasiado tiempo. Intenta nuevamente.',
        originalError: error,
        retryable: true,
      };
    }

    // Validation errors
    if (
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('inválido')
    ) {
      return {
        type: 'validation',
        message: 'Datos inválidos. Verifica los parámetros.',
        originalError: error,
        retryable: false,
      };
    }

    // Not found errors
    if (
      message.includes('not found') ||
      message.includes('no existe') ||
      message.includes('does not exist')
    ) {
      return {
        type: 'not_found',
        message: 'Los datos solicitados no fueron encontrados.',
        originalError: error,
        retryable: false,
      };
    }

    // Server errors
    if (
      message.includes('server') ||
      message.includes('internal') ||
      message.includes('servidor')
    ) {
      return {
        type: 'server',
        message: 'Error del servidor. Intenta nuevamente en unos momentos.',
        originalError: error,
        retryable: true,
      };
    }

    // Default to server error for unknown Error instances
    return {
      type: 'server',
      message: error.message || 'Error del servidor. Intenta nuevamente.',
      originalError: error,
      retryable: true,
    };
  }

  // Handle non-Error objects
  return {
    type: 'unknown',
    message: 'Error desconocido. Intenta nuevamente.',
    originalError: error instanceof Error ? error : new Error(String(error)),
    retryable: true,
  };
}

/**
 * Retry mechanism with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      const categorizedError = categorizeError(error);

      // Don't retry non-retryable errors
      if (!categorizedError.retryable) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Handles API response errors
 */
export async function handleApiResponse(response: Response): Promise<any> {
  if (!response.ok) {
    let errorMessage = 'Error en la respuesta del servidor';

    try {
      const errorData = await response.json();
      errorMessage = errorData.error || errorMessage;
    } catch {
      // If we can't parse the error response, use status text
      errorMessage = response.statusText || errorMessage;
    }

    const error = new Error(errorMessage);

    // Add status code information for better error categorization
    if (response.status >= 400 && response.status < 500) {
      if (response.status === 404) {
        throw new Error(`not found: ${errorMessage}`);
      } else if (response.status === 400) {
        throw new Error(`invalid: ${errorMessage}`);
      } else if (response.status === 408) {
        throw new Error(`timeout: ${errorMessage}`);
      }
    } else if (response.status >= 500) {
      throw new Error(`server: ${errorMessage}`);
    }

    throw error;
  }

  return response.json();
}

/**
 * Creates a fetch operation with timeout
 */
export function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = 10000
): Promise<Response> {
  return Promise.race([
    fetch(url, options),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout: Request timed out')), timeout)
    ),
  ]);
}

/**
 * Enhanced fetch with error handling and retry logic
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = 3,
  timeout: number = 10000
): Promise<any> {
  return retryWithBackoff(async () => {
    const response = await fetchWithTimeout(url, options, timeout);
    return handleApiResponse(response);
  }, maxRetries);
}

/**
 * Specific error messages for different scenarios
 */
export const ERROR_MESSAGES = {
  FILTER_LOAD_FAILED: 'Error al cargar los filtros de agrupadores',
  BUDGET_LOAD_FAILED: 'Error al cargar los datos de presupuesto',
  DATA_FETCH_FAILED: 'Error al cargar los datos',
  NETWORK_ERROR: 'Error de conexión. Verifica tu conexión a internet',
  SERVER_ERROR: 'Error del servidor. Intenta nuevamente en unos momentos',
  TIMEOUT_ERROR: 'La operación tardó demasiado tiempo. Intenta nuevamente',
  VALIDATION_ERROR: 'Datos inválidos. Verifica los parámetros',
  NOT_FOUND_ERROR: 'Los datos solicitados no fueron encontrados',
  RETRY_SUGGESTION: "Haz clic en 'Reintentar' para volver a cargar",
} as const;

/**
 * Get user-friendly error message based on error type and context
 */
export function getErrorMessage(error: AppError, context?: string): string {
  const baseMessage = error.message;

  switch (error.type) {
    case 'network':
      return context
        ? `${ERROR_MESSAGES.NETWORK_ERROR}. ${ERROR_MESSAGES.RETRY_SUGGESTION}.`
        : ERROR_MESSAGES.NETWORK_ERROR;

    case 'timeout':
      return context
        ? `${ERROR_MESSAGES.TIMEOUT_ERROR}. ${ERROR_MESSAGES.RETRY_SUGGESTION}.`
        : ERROR_MESSAGES.TIMEOUT_ERROR;

    case 'server':
      return context
        ? `${ERROR_MESSAGES.SERVER_ERROR}. ${ERROR_MESSAGES.RETRY_SUGGESTION}.`
        : ERROR_MESSAGES.SERVER_ERROR;

    case 'validation':
      return ERROR_MESSAGES.VALIDATION_ERROR;

    case 'not_found':
      return ERROR_MESSAGES.NOT_FOUND_ERROR;

    default:
      return baseMessage || 'Error desconocido';
  }
}
