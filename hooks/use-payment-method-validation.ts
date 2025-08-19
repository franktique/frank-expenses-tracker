"use client";

import { useState, useEffect, useCallback } from "react";
import {
  validatePaymentMethods,
  sanitizePaymentMethods,
  type PaymentMethod,
  type PaymentMethodValidationResult,
} from "@/lib/payment-method-validation";

export interface UsePaymentMethodValidationOptions {
  initialMethods?: string[];
  validateOnChange?: boolean;
  sanitizeOnChange?: boolean;
}

export interface UsePaymentMethodValidationReturn {
  methods: string[];
  setMethods: (methods: string[]) => void;
  validation: PaymentMethodValidationResult;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedMethods: PaymentMethod[] | null;
  hasUserInteracted: boolean;
  resetValidation: () => void;
  validateMethods: (methods: string[]) => PaymentMethodValidationResult;
}

export function usePaymentMethodValidation(
  options: UsePaymentMethodValidationOptions = {}
): UsePaymentMethodValidationReturn {
  const {
    initialMethods = [],
    validateOnChange = true,
    sanitizeOnChange = false,
  } = options;

  const [methods, setMethodsState] = useState<string[]>(initialMethods);
  const [validation, setValidation] = useState<PaymentMethodValidationResult>(
    validatePaymentMethods(initialMethods)
  );
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Validate methods
  const validateMethods = useCallback((methodsToValidate: string[]) => {
    return validatePaymentMethods(methodsToValidate);
  }, []);

  // Set methods with optional validation and sanitization
  const setMethods = useCallback(
    (newMethods: string[]) => {
      setHasUserInteracted(true);

      let finalMethods = newMethods;

      // Sanitize if enabled
      if (sanitizeOnChange) {
        const sanitized = sanitizePaymentMethods(newMethods);
        finalMethods = sanitized || [];
      }

      setMethodsState(finalMethods);

      // Validate if enabled
      if (validateOnChange) {
        const validationResult = validatePaymentMethods(finalMethods);
        setValidation(validationResult);
      }
    },
    [validateOnChange, sanitizeOnChange]
  );

  // Update validation when methods change (if not already done in setMethods)
  useEffect(() => {
    if (validateOnChange) {
      const validationResult = validatePaymentMethods(methods);
      setValidation(validationResult);
    }
  }, [methods, validateOnChange]);

  // Reset validation state
  const resetValidation = useCallback(() => {
    setHasUserInteracted(false);
    setValidation(validatePaymentMethods(methods));
  }, [methods]);

  // Get sanitized methods
  const sanitizedMethods = sanitizePaymentMethods(methods);

  return {
    methods,
    setMethods,
    validation,
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    sanitizedMethods,
    hasUserInteracted,
    resetValidation,
    validateMethods,
  };
}

// Hook for API error handling
export interface ApiError {
  error: string;
  code?: string;
  details?: any;
  retryable?: boolean;
}

export interface UsePaymentMethodApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: ApiError) => void;
  maxRetries?: number;
}

export function usePaymentMethodApi(options: UsePaymentMethodApiOptions = {}) {
  const { onSuccess, onError, maxRetries = 3 } = options;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const clearError = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  const handleApiCall = useCallback(
    async (apiCall: () => Promise<Response>, successMessage?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await apiCall();
        const data = await response.json();

        if (response.ok) {
          if (onSuccess) {
            onSuccess(data);
          }
          return { success: true, data };
        } else {
          const apiError: ApiError = {
            error: data.error || `Error ${response.status}`,
            code: data.code,
            details: data.details,
            retryable: data.retryable !== false, // Default to retryable unless explicitly false
          };

          setError(apiError);
          if (onError) {
            onError(apiError);
          }
          return { success: false, error: apiError };
        }
      } catch (networkError) {
        const apiError: ApiError = {
          error:
            networkError instanceof Error
              ? networkError.message.includes("fetch")
                ? "Error de conexión. Verifique su conexión a internet."
                : networkError.message
              : "Error de red desconocido",
          code: "NETWORK_ERROR",
          retryable: true,
        };

        setError(apiError);
        if (onError) {
          onError(apiError);
        }
        return { success: false, error: apiError };
      } finally {
        setIsLoading(false);
      }
    },
    [onSuccess, onError]
  );

  const retry = useCallback(
    async (apiCall: () => Promise<Response>) => {
      if (retryCount >= maxRetries) {
        return {
          success: false,
          error: { error: "Máximo número de reintentos alcanzado" },
        };
      }

      setRetryCount((prev) => prev + 1);

      // Exponential backoff
      const delay = Math.pow(2, retryCount) * 1000;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return handleApiCall(apiCall);
    },
    [retryCount, maxRetries, handleApiCall]
  );

  return {
    isLoading,
    error,
    retryCount,
    maxRetries,
    clearError,
    handleApiCall,
    retry,
    canRetry: error?.retryable && retryCount < maxRetries,
  };
}
