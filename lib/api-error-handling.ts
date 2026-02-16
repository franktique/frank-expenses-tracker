import { toast } from '@/components/ui/use-toast';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  retryable?: boolean;
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

/**
 * Enhanced fetch with retry mechanism and error handling
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
  } = retryOptions;

  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If successful or non-retryable error, return response
      if (response.ok || !isRetryableStatus(response.status)) {
        return response;
      }

      // For retryable errors, throw to trigger retry
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        baseDelay * Math.pow(backoffFactor, attempt),
        maxDelay
      );

      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;

      await new Promise((resolve) => setTimeout(resolve, jitteredDelay));
    }
  }

  throw lastError;
}

/**
 * Determine if an HTTP status code is retryable
 */
function isRetryableStatus(status: number): boolean {
  // Retry on server errors and some client errors
  return status >= 500 || status === 408 || status === 429;
}

/**
 * Parse API error response and return structured error
 */
export async function parseApiError(response: Response): Promise<ApiError> {
  let errorData: any = {};

  try {
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      errorData = await response.json();
    } else {
      errorData = { message: await response.text() };
    }
  } catch (e) {
    // If parsing fails, use status text
    errorData = { message: response.statusText };
  }

  return {
    message: errorData.error || errorData.message || `Error ${response.status}`,
    status: response.status,
    code: errorData.code,
    retryable: isRetryableStatus(response.status),
  };
}

/**
 * Handle API errors with appropriate user feedback
 */
export function handleApiError(error: ApiError, context: string = 'operación') {
  const isConnectionError =
    error.message.toLowerCase().includes('fetch') ||
    error.message.toLowerCase().includes('network') ||
    error.message.toLowerCase().includes('connection');

  let title = `Error en ${context}`;
  let description = error.message;

  if (isConnectionError) {
    title = 'Error de conexión';
    description = 'Verifique su conexión a internet e intente nuevamente.';
  } else if (error.status === 404) {
    title = 'Recurso no encontrado';
    description = 'El recurso solicitado no existe o ha sido eliminado.';
  } else if (error.status === 409) {
    title = 'Conflicto de datos';
    // Keep original message for conflict errors as they're usually specific
  } else if (error.status === 503) {
    title = 'Servicio no disponible';
    description =
      'El servicio está temporalmente no disponible. Intente más tarde.';
  } else if (error.status && error.status >= 500) {
    title = 'Error del servidor';
    description = 'Ocurrió un error interno. Intente nuevamente.';
  }

  toast({
    title,
    description,
    variant: 'destructive',
  });
}

/**
 * Validate estudio name with comprehensive checks
 */
export function validateEstudioName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: 'El nombre del estudio es requerido' };
  }

  if (trimmedName.length > 255) {
    return { valid: false, error: 'El nombre no puede exceder 255 caracteres' };
  }

  if (trimmedName.length < 2) {
    return {
      valid: false,
      error: 'El nombre debe tener al menos 2 caracteres',
    };
  }

  // Check for invalid characters (optional)
  const invalidChars = /[<>:"\/\\|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    return { valid: false, error: 'El nombre contiene caracteres no válidos' };
  }

  return { valid: true };
}

/**
 * Check for duplicate estudio names
 */
export function checkDuplicateEstudioName(
  name: string,
  estudios: any[],
  excludeId?: number
): boolean {
  const trimmedName = name.trim().toLowerCase();
  return estudios.some(
    (estudio) =>
      estudio.id !== excludeId && estudio.name.toLowerCase() === trimmedName
  );
}

/**
 * Validate grouper IDs array
 */
export function validateGrouperIds(grouperIds: any[]): {
  valid: boolean;
  error?: string;
} {
  if (!Array.isArray(grouperIds)) {
    return {
      valid: false,
      error: 'Se requiere un array de IDs de agrupadores',
    };
  }

  if (grouperIds.length === 0) {
    return { valid: false, error: 'Debe seleccionar al menos un agrupador' };
  }

  const invalidIds = grouperIds.filter(
    (id) => !Number.isInteger(id) || id <= 0
  );
  if (invalidIds.length > 0) {
    return { valid: false, error: 'Algunos IDs de agrupadores son inválidos' };
  }

  return { valid: true };
}

/**
 * Create a loading state manager for async operations
 */
export function createLoadingManager() {
  const loadingStates = new Map<string, boolean>();
  const errorStates = new Map<string, string | null>();

  return {
    setLoading: (key: string, loading: boolean) => {
      loadingStates.set(key, loading);
    },
    isLoading: (key: string) => loadingStates.get(key) || false,
    setError: (key: string, error: string | null) => {
      errorStates.set(key, error);
    },
    getError: (key: string) => errorStates.get(key) || null,
    clearError: (key: string) => {
      errorStates.set(key, null);
    },
    reset: (key: string) => {
      loadingStates.set(key, false);
      errorStates.set(key, null);
    },
  };
}
