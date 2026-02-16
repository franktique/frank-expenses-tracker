'use client';

import { useState, useCallback } from 'react';
import {
  categorizeError,
  fetchWithRetry,
  getErrorMessage,
  AppError,
} from '@/lib/error-handling';

interface UseDataFetchingOptions {
  maxRetries?: number;
  timeout?: number;
  onError?: (error: AppError) => void;
  onSuccess?: (data: any) => void;
}

interface UseDataFetchingReturn<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
  fetchData: (url: string, options?: RequestInit) => Promise<void>;
  reset: () => void;
}

/**
 * Custom hook for data fetching with error handling and retry logic
 */
export function useDataFetching<T = any>(
  options: UseDataFetchingOptions = {}
): UseDataFetchingReturn<T> {
  const { maxRetries = 3, timeout = 10000, onError, onSuccess } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRequest, setLastRequest] = useState<{
    url: string;
    options?: RequestInit;
  } | null>(null);

  const fetchData = useCallback(
    async (url: string, requestOptions?: RequestInit) => {
      setIsLoading(true);
      setError(null);
      setLastRequest({ url, options: requestOptions });

      try {
        const result = await fetchWithRetry(
          url,
          requestOptions,
          maxRetries,
          timeout
        );
        setData(result);

        if (onSuccess) {
          onSuccess(result);
        }
      } catch (err) {
        const categorizedError = categorizeError(err);
        const errorMessage = getErrorMessage(categorizedError, 'data fetching');

        setError(errorMessage);
        setData(null);

        if (onError) {
          onError(categorizedError);
        }

        console.error('Data fetching error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [maxRetries, timeout, onError, onSuccess]
  );

  const retry = useCallback(async () => {
    if (lastRequest) {
      await fetchData(lastRequest.url, lastRequest.options);
    }
  }, [lastRequest, fetchData]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setLastRequest(null);
  }, []);

  return {
    data,
    isLoading,
    error,
    retry,
    fetchData,
    reset,
  };
}

/**
 * Specialized hook for grouper data fetching
 */
export function useGrouperDataFetching() {
  return useDataFetching({
    maxRetries: 3,
    timeout: 15000, // Longer timeout for complex queries
    onError: (error) => {
      // Log specific grouper data errors
      console.error('Grouper data fetch error:', error);
    },
  });
}

/**
 * Specialized hook for budget data fetching
 */
export function useBudgetDataFetching() {
  return useDataFetching({
    maxRetries: 2, // Fewer retries for budget data as it's optional
    timeout: 10000,
    onError: (error) => {
      // Budget errors are less critical, just log them
      console.warn('Budget data fetch error:', error);
    },
  });
}

/**
 * Specialized hook for filter data fetching
 */
export function useFilterDataFetching() {
  return useDataFetching({
    maxRetries: 3,
    timeout: 8000,
    onError: (error) => {
      console.error('Filter data fetch error:', error);
    },
  });
}
