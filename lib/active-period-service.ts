/**
 * Active Period Loading Service
 *
 * Service for fetching and managing active period data with robust error handling
 * and retry logic for network failures.
 */

import { Period } from '../types/funds';
import {
  categorizeError,
  retryWithBackoff,
  fetchWithTimeout,
  handleApiResponse,
} from './error-handling';

export type PeriodLoadingErrorType =
  | 'network'
  | 'authentication'
  | 'no_active_period'
  | 'invalid_cache'
  | 'server'
  | 'timeout'
  | 'unknown';

export interface PeriodLoadingError {
  type: PeriodLoadingErrorType;
  message: string;
  originalError?: Error;
  retryable: boolean;
  timestamp: number;
}

export type ActivePeriodResult =
  | {
      success: true;
      period: Period;
    }
  | {
      success: false;
      error: PeriodLoadingError;
    };

/**
 * Categorizes period loading specific errors
 */
function categorizePeriodError(error: unknown): PeriodLoadingError {
  const baseError = categorizeError(error);
  const timestamp = Date.now();

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('login')
    ) {
      return {
        type: 'authentication',
        message: 'Sesión expirada. Por favor, inicia sesión nuevamente.',
        originalError: error,
        retryable: false,
        timestamp,
      };
    }

    // No active period found
    if (
      message.includes('no active period') ||
      message.includes('no hay periodo activo') ||
      message.includes('active period not found')
    ) {
      return {
        type: 'no_active_period',
        message:
          'No hay un periodo activo configurado. Activa un periodo para continuar.',
        originalError: error,
        retryable: false,
        timestamp,
      };
    }

    // Invalid cache errors
    if (
      message.includes('invalid cache') ||
      message.includes('cache corrupted') ||
      message.includes('cache expired')
    ) {
      return {
        type: 'invalid_cache',
        message:
          'Los datos almacenados están desactualizados. Recargando información...',
        originalError: error,
        retryable: true,
        timestamp,
      };
    }
  }

  // Map base error types to period loading error types
  const periodErrorType: PeriodLoadingErrorType =
    baseError.type === 'not_found'
      ? 'no_active_period'
      : (baseError.type as PeriodLoadingErrorType);

  return {
    ...baseError,
    type: periodErrorType,
    timestamp,
  };
}

/**
 * Fetches all periods from the API and identifies the active one
 */
async function fetchPeriodsFromAPI(): Promise<Period[]> {
  const response = await fetchWithTimeout('/api/periods', {}, 10000);
  const data = await handleApiResponse(response);

  // Normalize period data to ensure consistent property names
  return data.map((period: any) => ({
    ...period,
    // Ensure both properties exist for compatibility
    is_open: period.is_open || period.isOpen || false,
    isOpen: period.is_open || period.isOpen || false,
  }));
}

/**
 * Identifies the active period from a list of periods
 */
function findActivePeriod(periods: Period[]): Period | null {
  return periods.find((period) => period.is_open || period.isOpen) || null;
}

/**
 * Loads the active period with retry logic and error categorization
 *
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns Promise resolving to ActivePeriodResult
 */
export async function loadActivePeriod(
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<ActivePeriodResult> {
  try {
    const periods = await retryWithBackoff(
      fetchPeriodsFromAPI,
      maxRetries,
      baseDelay
    );

    const activePeriod = findActivePeriod(periods);

    if (!activePeriod) {
      const error = new Error(
        'no active period: No active period found in the system'
      );
      throw error;
    }

    return {
      success: true,
      period: activePeriod,
    };
  } catch (error) {
    const categorizedError = categorizePeriodError(error);

    return {
      success: false,
      error: categorizedError,
    };
  }
}

/**
 * Loads the active period with a simplified interface that throws on error
 * Useful for contexts where you want to handle errors at a higher level
 *
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param baseDelay - Base delay in milliseconds for exponential backoff (default: 1000)
 * @returns Promise resolving to Period or throwing PeriodLoadingError
 */
export async function loadActivePeriodOrThrow(
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<Period> {
  const result = await loadActivePeriod(maxRetries, baseDelay);

  if (result.success) {
    return result.period;
  } else {
    const errorResult = result as { success: false; error: PeriodLoadingError };
    const error = new Error(errorResult.error.message);
    (error as any).type = errorResult.error.type;
    (error as any).timestamp = errorResult.error.timestamp;
    throw error;
  }
}

/**
 * Checks if an error is retryable based on its type
 */
export function isPeriodErrorRetryable(error: PeriodLoadingError): boolean {
  return (
    error.retryable &&
    !['authentication', 'no_active_period'].includes(error.type)
  );
}

/**
 * Gets a user-friendly error message for period loading errors
 */
export function getPeriodErrorMessage(error: PeriodLoadingError): string {
  switch (error.type) {
    case 'network':
      return 'Error de conexión al cargar el periodo activo. Verifica tu conexión a internet.';

    case 'authentication':
      return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';

    case 'no_active_period':
      return 'No hay un periodo activo configurado. Ve a la sección de periodos para activar uno.';

    case 'invalid_cache':
      return 'Los datos almacenados están desactualizados. Recargando información...';

    case 'timeout':
      return 'La carga del periodo tardó demasiado tiempo. Intenta nuevamente.';

    case 'server':
      return 'Error del servidor al cargar el periodo activo. Intenta nuevamente en unos momentos.';

    default:
      return error.message || 'Error desconocido al cargar el periodo activo.';
  }
}

/**
 * Creates a retry function for period loading with custom parameters
 */
export function createPeriodLoader(
  maxRetries: number = 3,
  baseDelay: number = 1000
) {
  return () => loadActivePeriod(maxRetries, baseDelay);
}

/**
 * Advanced retry mechanism with circuit breaker pattern
 * Prevents excessive retries when the service is consistently failing
 */
class PeriodLoadingCircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold = 5,
    private recoveryTimeout = 60000 // 1 minute
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
        this.state = 'half-open';
      } else {
        throw new Error(
          'Circuit breaker is open - service temporarily unavailable'
        );
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'open';
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  reset() {
    this.failureCount = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
  }
}

// Global circuit breaker instance
const periodLoadingCircuitBreaker = new PeriodLoadingCircuitBreaker();

/**
 * Enhanced period loading with circuit breaker protection
 * Automatically prevents excessive retries when service is consistently failing
 */
export async function loadActivePeriodWithCircuitBreaker(
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<ActivePeriodResult> {
  try {
    return await periodLoadingCircuitBreaker.execute(() =>
      loadActivePeriod(maxRetries, baseDelay)
    );
  } catch (error) {
    const circuitBreakerError: PeriodLoadingError = {
      type: 'server',
      message:
        'Servicio temporalmente no disponible. Intenta nuevamente en unos minutos.',
      originalError: error instanceof Error ? error : new Error(String(error)),
      retryable: false, // Don't retry when circuit breaker is open
      timestamp: Date.now(),
    };

    return {
      success: false,
      error: circuitBreakerError,
    };
  }
}

/**
 * Intelligent retry with adaptive backoff
 * Adjusts retry strategy based on error type and previous failures
 */
export async function loadActivePeriodWithAdaptiveRetry(
  maxRetries: number = 5,
  baseDelay: number = 100 // Shorter base delay for better test performance
): Promise<ActivePeriodResult> {
  let attempt = 0;
  let lastError: PeriodLoadingError | null = null;

  while (attempt <= maxRetries) {
    const result = await loadActivePeriod(1, baseDelay); // Single attempt per call

    if (result.success) {
      return result;
    }

    lastError = result.error;

    // Don't retry non-retryable errors
    if (!isPeriodErrorRetryable(lastError)) {
      return result;
    }

    // Don't retry on last attempt
    if (attempt === maxRetries) {
      return result;
    }

    // Adaptive delay based on error type
    let delay = baseDelay * Math.pow(2, attempt); // Base exponential backoff

    switch (lastError.type) {
      case 'network':
        delay *= 1.5; // Longer delays for network issues
        break;
      case 'timeout':
        delay *= 2; // Much longer delays for timeouts
        break;
      case 'server':
        delay *= 1.2; // Slightly longer for server errors
        break;
      default:
        // Use base delay
        break;
    }

    // Cap maximum delay (shorter for tests, longer for production)
    const maxDelay = process.env.NODE_ENV === 'test' ? 1000 : 30000;
    delay = Math.min(delay, maxDelay);

    console.log(
      `Retrying period loading in ${delay}ms (attempt ${
        attempt + 1
      }/${maxRetries})`
    );
    await new Promise((resolve) => setTimeout(resolve, delay));

    attempt++;
  }

  // This should never be reached, but return the last error as fallback
  return {
    success: false,
    error: lastError!,
  };
}

/**
 * Get circuit breaker status for monitoring
 */
export function getCircuitBreakerStatus() {
  return periodLoadingCircuitBreaker.getState();
}

/**
 * Reset circuit breaker (useful for manual recovery)
 */
export function resetCircuitBreaker() {
  periodLoadingCircuitBreaker.reset();
}
