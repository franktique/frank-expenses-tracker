"use client";

import { useState, useCallback, useRef } from "react";
import { toast } from "@/components/ui/use-toast";
import {
  SimulationApiError,
  fetchSimulationWithRetry,
  parseSimulationApiError,
  handleSimulationApiError,
  retrySimulationOperation,
} from "@/lib/simulation-error-handling";

interface UseSimulationRetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  showToasts?: boolean;
  onRetry?: (attempt: number, error: SimulationApiError) => void;
  onMaxRetriesReached?: (error: SimulationApiError) => void;
  onSuccess?: () => void;
}

interface RetryState {
  isRetrying: boolean;
  retryCount: number;
  lastError: SimulationApiError | null;
  canRetry: boolean;
}

export function useSimulationRetry(options: UseSimulationRetryOptions = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    showToasts = true,
    onRetry,
    onMaxRetriesReached,
    onSuccess,
  } = options;

  const [retryState, setRetryState] = useState<RetryState>({
    isRetrying: false,
    retryCount: 0,
    lastError: null,
    canRetry: true,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset retry state
  const resetRetry = useCallback(() => {
    setRetryState({
      isRetrying: false,
      retryCount: 0,
      lastError: null,
      canRetry: true,
    });

    // Cancel any ongoing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  // Execute operation with retry logic
  const executeWithRetry = useCallback(
    async <T>(
      operation: (signal?: AbortSignal) => Promise<T>,
      context?: string,
      simulationId?: number
    ): Promise<T | null> => {
      // Reset state at the beginning
      setRetryState((prev) => ({
        ...prev,
        isRetrying: true,
        lastError: null,
      }));

      // Create new abort controller
      abortControllerRef.current = new AbortController();
      const signal = abortControllerRef.current.signal;

      try {
        const result = await retrySimulationOperation(() => operation(signal), {
          maxRetries,
          context,
          simulationId,
          onRetry: (attempt, error) => {
            setRetryState((prev) => ({
              ...prev,
              retryCount: attempt,
              lastError: error,
            }));

            if (onRetry) {
              onRetry(attempt, error);
            }

            if (showToasts && attempt < maxRetries) {
              toast({
                title: "Reintentando operación",
                description: `Intento ${attempt} de ${maxRetries}...`,
                variant: "default",
              });
            }
          },
          onError: (error) => {
            setRetryState((prev) => ({
              ...prev,
              isRetrying: false,
              canRetry: false,
              lastError: error,
            }));

            if (onMaxRetriesReached) {
              onMaxRetriesReached(error);
            }

            if (showToasts) {
              handleSimulationApiError(error, true);
            }
          },
        });

        if (result !== null) {
          setRetryState({
            isRetrying: false,
            retryCount: 0,
            lastError: null,
            canRetry: true,
          });

          if (onSuccess) {
            onSuccess();
          }

          return result;
        }

        return null;
      } catch (error) {
        if (signal.aborted) {
          // Operation was cancelled
          setRetryState((prev) => ({
            ...prev,
            isRetrying: false,
          }));
          return null;
        }

        // Handle unexpected errors
        const simulationError: SimulationApiError = {
          message: error instanceof Error ? error.message : String(error),
          type: "unknown",
          context,
          simulationId,
          retryable: false,
        };

        setRetryState({
          isRetrying: false,
          retryCount: maxRetries,
          lastError: simulationError,
          canRetry: false,
        });

        if (showToasts) {
          handleSimulationApiError(simulationError, true);
        }

        return null;
      } finally {
        abortControllerRef.current = null;
      }
    },
    [maxRetries, onRetry, onMaxRetriesReached, onSuccess, showToasts]
  );

  // Fetch with retry for API calls
  const fetchWithRetry = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      context?: string,
      simulationId?: number
    ): Promise<Response | null> => {
      return executeWithRetry(
        async (signal) => {
          const response = await fetchSimulationWithRetry(
            url,
            { ...options, signal },
            {
              maxRetries,
              baseDelay,
              onRetry: (attempt, error) => {
                if (onRetry) {
                  const simulationError: SimulationApiError = {
                    message: error.message,
                    type: "network",
                    context,
                    simulationId,
                    retryable: true,
                  };
                  onRetry(attempt, simulationError);
                }
              },
            }
          );

          if (!response.ok) {
            const error = await parseSimulationApiError(
              response,
              context,
              simulationId
            );
            throw new Error(error.message);
          }

          return response;
        },
        context,
        simulationId
      );
    },
    [executeWithRetry, maxRetries, baseDelay, onRetry]
  );

  // Manual retry function
  const manualRetry = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: string,
      simulationId?: number
    ): Promise<T | null> => {
      if (!retryState.canRetry) {
        resetRetry();
      }

      return executeWithRetry(() => operation(), context, simulationId);
    },
    [executeWithRetry, retryState.canRetry, resetRetry]
  );

  return {
    // State
    isRetrying: retryState.isRetrying,
    retryCount: retryState.retryCount,
    lastError: retryState.lastError,
    canRetry: retryState.canRetry,

    // Actions
    executeWithRetry,
    fetchWithRetry,
    manualRetry,
    resetRetry,

    // Utilities
    cancel: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    },
  };
}

// Hook specifically for simulation data fetching with built-in error handling
export function useSimulationDataFetch() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<SimulationApiError | null>(null);
  const [data, setData] = useState<any>(null);

  const retry = useSimulationRetry({
    maxRetries: 3,
    showToasts: true,
    onSuccess: () => {
      setError(null);
    },
  });

  const fetchData = useCallback(
    async <T>(
      url: string,
      options: RequestInit = {},
      context?: string,
      simulationId?: number
    ): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await retry.fetchWithRetry(
          url,
          options,
          context,
          simulationId
        );

        if (!response) {
          setError(retry.lastError);
          return null;
        }

        const result = await response.json();
        setData(result);
        return result;
      } catch (err) {
        const simulationError: SimulationApiError = {
          message: err instanceof Error ? err.message : String(err),
          type: "unknown",
          context,
          simulationId,
          retryable: false,
        };
        setError(simulationError);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [retry]
  );

  const clearError = useCallback(() => {
    setError(null);
    retry.resetRetry();
  }, [retry]);

  const refetch = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      context?: string,
      simulationId?: number
    ) => {
      return fetchData(url, options, context, simulationId);
    },
    [fetchData]
  );

  return {
    // State
    isLoading: isLoading || retry.isRetrying,
    error,
    data,
    retryCount: retry.retryCount,
    canRetry: retry.canRetry,

    // Actions
    fetchData,
    refetch,
    clearError,
    cancel: retry.cancel,
  };
}

// Hook for simulation operations (create, update, delete) with retry
export function useSimulationOperations() {
  const [operationStates, setOperationStates] = useState<{
    [key: string]: {
      isLoading: boolean;
      error: SimulationApiError | null;
      retryCount: number;
    };
  }>({});

  const retry = useSimulationRetry({
    maxRetries: 2, // Fewer retries for operations
    showToasts: true,
  });

  const executeOperation = useCallback(
    async <T>(
      operationKey: string,
      operation: () => Promise<T>,
      context?: string,
      simulationId?: number
    ): Promise<T | null> => {
      // Set loading state
      setOperationStates((prev) => ({
        ...prev,
        [operationKey]: {
          isLoading: true,
          error: null,
          retryCount: 0,
        },
      }));

      try {
        const result = await retry.executeWithRetry(
          () => operation(),
          context,
          simulationId
        );

        if (result !== null) {
          // Success
          setOperationStates((prev) => ({
            ...prev,
            [operationKey]: {
              isLoading: false,
              error: null,
              retryCount: 0,
            },
          }));
          return result;
        } else {
          // Failed after retries
          setOperationStates((prev) => ({
            ...prev,
            [operationKey]: {
              isLoading: false,
              error: retry.lastError,
              retryCount: retry.retryCount,
            },
          }));
          return null;
        }
      } catch (err) {
        const simulationError: SimulationApiError = {
          message: err instanceof Error ? err.message : String(err),
          type: "unknown",
          context,
          simulationId,
          retryable: false,
        };

        setOperationStates((prev) => ({
          ...prev,
          [operationKey]: {
            isLoading: false,
            error: simulationError,
            retryCount: 0,
          },
        }));

        return null;
      }
    },
    [retry]
  );

  const getOperationState = useCallback(
    (operationKey: string) => {
      return (
        operationStates[operationKey] || {
          isLoading: false,
          error: null,
          retryCount: 0,
        }
      );
    },
    [operationStates]
  );

  const clearOperationError = useCallback((operationKey: string) => {
    setOperationStates((prev) => ({
      ...prev,
      [operationKey]: {
        ...prev[operationKey],
        error: null,
      },
    }));
  }, []);

  return {
    executeOperation,
    getOperationState,
    clearOperationError,
    isAnyOperationLoading: Object.values(operationStates).some(
      (state) => state.isLoading
    ),
  };
}
