import { toast } from '@/components/ui/use-toast';

export interface SimulationApiError {
  message: string;
  status?: number;
  code?: string;
  retryable?: boolean;
  type:
    | 'validation'
    | 'network'
    | 'server'
    | 'simulation_not_found'
    | 'data_consistency'
    | 'unknown';
  context?: string;
  simulationId?: number;
}

export interface SimulationRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Enhanced fetch with retry mechanism specifically for simulation operations
 */
export async function fetchSimulationWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: SimulationRetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    onRetry,
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

      // Call retry callback if provided
      if (onRetry && attempt < maxRetries) {
        onRetry(attempt + 1, lastError);
      }

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
 * Parse simulation API error response and return structured error
 */
export async function parseSimulationApiError(
  response: Response,
  context?: string,
  simulationId?: number
): Promise<SimulationApiError> {
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

  const message =
    errorData.error || errorData.message || `Error ${response.status}`;
  const type = categorizeSimulationError(message, response.status);

  return {
    message,
    status: response.status,
    code: errorData.code,
    retryable: isRetryableStatus(response.status),
    type,
    context,
    simulationId,
  };
}

/**
 * Categorize simulation errors based on message and status
 */
function categorizeSimulationError(
  message: string,
  status?: number
):
  | 'validation'
  | 'network'
  | 'server'
  | 'simulation_not_found'
  | 'data_consistency'
  | 'unknown' {
  const lowerMessage = message.toLowerCase();

  if (
    status === 404 ||
    lowerMessage.includes('simulation not found') ||
    lowerMessage.includes('simulación no encontrada')
  ) {
    return 'simulation_not_found';
  }

  if (
    lowerMessage.includes('validation') ||
    lowerMessage.includes('invalid') ||
    lowerMessage.includes('required') ||
    lowerMessage.includes('debe ser un número positivo') ||
    lowerMessage.includes('positive number')
  ) {
    return 'validation';
  }

  if (
    lowerMessage.includes('fetch') ||
    lowerMessage.includes('network') ||
    lowerMessage.includes('connection') ||
    lowerMessage.includes('failed to fetch')
  ) {
    return 'network';
  }

  if (
    lowerMessage.includes('server') ||
    (status && status >= 500) ||
    lowerMessage.includes('internal') ||
    lowerMessage.includes('database')
  ) {
    return 'server';
  }

  if (
    lowerMessage.includes('consistency') ||
    lowerMessage.includes('category') ||
    lowerMessage.includes('budget') ||
    lowerMessage.includes('mismatch') ||
    lowerMessage.includes('conflict')
  ) {
    return 'data_consistency';
  }

  return 'unknown';
}

/**
 * Handle simulation API errors with appropriate user feedback
 */
export function handleSimulationApiError(
  error: SimulationApiError,
  showToast: boolean = true
) {
  let title = 'Error en simulación';
  let description = error.message;

  switch (error.type) {
    case 'simulation_not_found':
      title = 'Simulación no encontrada';
      description = 'La simulación solicitada no existe o ha sido eliminada.';
      break;
    case 'validation':
      title = 'Error de validación';
      description =
        'Los datos ingresados no son válidos. Verifique los valores.';
      break;
    case 'network':
      title = 'Error de conexión';
      description = 'Verifique su conexión a internet e intente nuevamente.';
      break;
    case 'server':
      title = 'Error del servidor';
      description = 'Ocurrió un error interno. Intente nuevamente.';
      break;
    case 'data_consistency':
      title = 'Error de consistencia';
      description =
        'Los datos de la simulación no son consistentes. Intente recargar.';
      break;
    default:
      title = 'Error inesperado';
      description = error.message;
  }

  if (error.context) {
    title = `${title} - ${error.context}`;
  }

  if (error.simulationId) {
    description = `${description} (Simulación #${error.simulationId})`;
  }

  if (showToast) {
    toast({
      title,
      description,
      variant: 'destructive',
    });
  }

  return { title, description };
}

/**
 * Validate simulation name with comprehensive checks
 */
export function validateSimulationName(name: string): {
  valid: boolean;
  error?: string;
} {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return { valid: false, error: 'El nombre de la simulación es requerido' };
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

  // Check for invalid characters
  const invalidChars = /[<>:"\/\\|?*\x00-\x1f]/;
  if (invalidChars.test(trimmedName)) {
    return { valid: false, error: 'El nombre contiene caracteres no válidos' };
  }

  return { valid: true };
}

/**
 * Validate simulation budget data
 */
export function validateSimulationBudget(budget: {
  category_id: number;
  efectivo_amount: number;
  credito_amount: number;
}): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!Number.isInteger(budget.category_id) || budget.category_id <= 0) {
    errors.push('ID de categoría inválido');
  }

  if (
    typeof budget.efectivo_amount !== 'number' ||
    isNaN(budget.efectivo_amount)
  ) {
    errors.push('Monto de efectivo debe ser un número');
  } else if (budget.efectivo_amount < 0) {
    errors.push('Monto de efectivo debe ser positivo');
  }

  if (
    typeof budget.credito_amount !== 'number' ||
    isNaN(budget.credito_amount)
  ) {
    errors.push('Monto de crédito debe ser un número');
  } else if (budget.credito_amount < 0) {
    errors.push('Monto de crédito debe ser positivo');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate array of simulation budgets
 */
export function validateSimulationBudgets(budgets: any[]): {
  valid: boolean;
  errors: { [categoryId: number]: string[] };
  globalErrors: string[];
} {
  const errors: { [categoryId: number]: string[] } = {};
  const globalErrors: string[] = [];

  if (!Array.isArray(budgets)) {
    globalErrors.push('Los presupuestos deben ser un array');
    return { valid: false, errors, globalErrors };
  }

  if (budgets.length === 0) {
    globalErrors.push('Debe incluir al menos un presupuesto');
    return { valid: false, errors, globalErrors };
  }

  const categoryIds = new Set<number>();

  budgets.forEach((budget, index) => {
    const validation = validateSimulationBudget(budget);

    if (!validation.valid) {
      errors[budget.category_id || index] = validation.errors;
    }

    // Check for duplicate category IDs
    if (budget.category_id && categoryIds.has(budget.category_id)) {
      if (!errors[budget.category_id]) {
        errors[budget.category_id] = [];
      }
      errors[budget.category_id].push('Categoría duplicada');
    } else if (budget.category_id) {
      categoryIds.add(budget.category_id);
    }
  });

  return {
    valid: Object.keys(errors).length === 0 && globalErrors.length === 0,
    errors,
    globalErrors,
  };
}

/**
 * Check for missing simulation data
 */
export function validateSimulationDataConsistency(
  simulationData: any,
  categories: any[]
): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  if (!simulationData) {
    issues.push('Datos de simulación faltantes');
    return { valid: false, issues };
  }

  if (!simulationData.id) {
    issues.push('ID de simulación faltante');
  }

  if (!simulationData.name || simulationData.name.trim() === '') {
    issues.push('Nombre de simulación faltante');
  }

  // Check if simulation has budgets for non-existent categories
  if (simulationData.budgets && Array.isArray(simulationData.budgets)) {
    const categoryIds = new Set(categories.map((c) => c.id));

    simulationData.budgets.forEach((budget: any) => {
      if (!categoryIds.has(budget.category_id)) {
        issues.push(
          `Presupuesto para categoría inexistente: ${budget.category_id}`
        );
      }
    });
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Create a simulation-specific loading state manager
 */
export function createSimulationLoadingManager() {
  const loadingStates = new Map<string, boolean>();
  const errorStates = new Map<string, SimulationApiError | null>();
  const retryCountStates = new Map<string, number>();

  return {
    setLoading: (key: string, loading: boolean) => {
      loadingStates.set(key, loading);
    },
    isLoading: (key: string) => loadingStates.get(key) || false,
    setError: (key: string, error: SimulationApiError | null) => {
      errorStates.set(key, error);
    },
    getError: (key: string) => errorStates.get(key) || null,
    clearError: (key: string) => {
      errorStates.set(key, null);
      retryCountStates.set(key, 0);
    },
    incrementRetryCount: (key: string) => {
      const current = retryCountStates.get(key) || 0;
      retryCountStates.set(key, current + 1);
      return current + 1;
    },
    getRetryCount: (key: string) => retryCountStates.get(key) || 0,
    reset: (key: string) => {
      loadingStates.set(key, false);
      errorStates.set(key, null);
      retryCountStates.set(key, 0);
    },
    resetAll: () => {
      loadingStates.clear();
      errorStates.clear();
      retryCountStates.clear();
    },
  };
}

/**
 * Graceful fallback data for missing simulation information
 */
export function getSimulationFallbackData(simulationId?: number) {
  return {
    id: simulationId || 0,
    name: 'Simulación sin nombre',
    description: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    budget_count: 0,
  };
}

/**
 * Create fallback analytics data when real data is unavailable
 */
export function getSimulationAnalyticsFallbackData(simulationId: number) {
  return {
    simulation_data: {
      simulation_id: simulationId,
      simulation_name: 'Simulación',
      grouper_data: [],
    },
    historical_data: [],
    comparison_metrics: [],
    metadata: {
      estudio_id: null,
      grouper_ids: null,
      payment_methods: null,
      comparison_periods: 3,
    },
  };
}

/**
 * Retry mechanism specifically for simulation operations
 */
export async function retrySimulationOperation<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    context?: string;
    simulationId?: number;
    onRetry?: (attempt: number, error: SimulationApiError) => void;
    onError?: (error: SimulationApiError) => void;
  } = {}
): Promise<T | null> {
  const { maxRetries = 3, context, simulationId, onRetry, onError } = options;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const simulationError: SimulationApiError = {
        message: error instanceof Error ? error.message : String(error),
        type: categorizeSimulationError(
          error instanceof Error ? error.message : String(error)
        ),
        context,
        simulationId,
        retryable: attempt < maxRetries,
      };

      if (onRetry && attempt < maxRetries) {
        onRetry(attempt, simulationError);
      }

      if (attempt === maxRetries) {
        if (onError) {
          onError(simulationError);
        }
        return null;
      }

      // Wait before retrying (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }

  return null;
}
