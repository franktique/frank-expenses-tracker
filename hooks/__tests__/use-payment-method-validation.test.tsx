import React from 'react';
import { renderHook, act } from '@testing-library/react';
import {
  usePaymentMethodValidation,
  usePaymentMethodApi,
} from '../use-payment-method-validation';

describe('usePaymentMethodValidation', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePaymentMethodValidation());

    expect(result.current.methods).toEqual([]);
    expect(result.current.isValid).toBe(false); // Empty array is invalid
    expect(result.current.errors).toHaveLength(1); // Should have error about empty array
    expect(result.current.hasUserInteracted).toBe(false);
  });

  it('should initialize with provided initial methods', () => {
    const initialMethods = ['cash', 'credit'];
    const { result } = renderHook(() =>
      usePaymentMethodValidation({ initialMethods })
    );

    expect(result.current.methods).toEqual(initialMethods);
    expect(result.current.isValid).toBe(true);
  });

  it('should validate methods when they change', () => {
    const { result } = renderHook(() =>
      usePaymentMethodValidation({ validateOnChange: true })
    );

    act(() => {
      result.current.setMethods(['invalid_method']);
    });

    expect(result.current.isValid).toBe(false);
    expect(result.current.errors).toHaveLength(1);
    expect(result.current.hasUserInteracted).toBe(true);
  });

  it('should sanitize methods when enabled', () => {
    const { result } = renderHook(() =>
      usePaymentMethodValidation({ sanitizeOnChange: true })
    );

    act(() => {
      result.current.setMethods(['cash', 'invalid', 'credit']);
    });

    expect(result.current.methods).toEqual(['cash', 'credit']);
  });

  it('should not validate when validateOnChange is false', () => {
    const { result } = renderHook(() =>
      usePaymentMethodValidation({ validateOnChange: false })
    );

    act(() => {
      result.current.setMethods(['invalid_method']);
    });

    // Should still be valid because validation is disabled
    expect(result.current.methods).toEqual(['invalid_method']);
  });

  it('should reset validation state', () => {
    const { result } = renderHook(() => usePaymentMethodValidation());

    act(() => {
      result.current.setMethods(['invalid_method']);
    });

    expect(result.current.hasUserInteracted).toBe(true);

    act(() => {
      result.current.resetValidation();
    });

    expect(result.current.hasUserInteracted).toBe(false);
  });

  it('should validate methods manually', () => {
    const { result } = renderHook(() => usePaymentMethodValidation());

    const validationResult = result.current.validateMethods(['cash', 'credit']);
    expect(validationResult.isValid).toBe(true);

    const invalidResult = result.current.validateMethods(['invalid']);
    expect(invalidResult.isValid).toBe(false);
  });

  it('should return sanitized methods', () => {
    const { result } = renderHook(() => usePaymentMethodValidation());

    act(() => {
      result.current.setMethods(['cash', 'credit']);
    });

    expect(result.current.sanitizedMethods).toEqual(['cash', 'credit']);

    act(() => {
      result.current.setMethods([]);
    });

    expect(result.current.sanitizedMethods).toBe(null);
  });
});

describe('usePaymentMethodApi', () => {
  // Mock fetch
  const mockFetch = jest.fn();
  global.fetch = mockFetch;

  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => usePaymentMethodApi());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBeFalsy(); // undefined is falsy
  });

  it('should handle successful API calls', async () => {
    const mockResponse = { success: true, data: { id: 1 } };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const onSuccess = jest.fn();
    const { result } = renderHook(() => usePaymentMethodApi({ onSuccess }));

    let apiResult: any;
    await act(async () => {
      apiResult = await result.current.handleApiCall(() => fetch('/api/test'));
    });

    expect(apiResult.success).toBe(true);
    expect(onSuccess).toHaveBeenCalledWith(mockResponse);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('should handle API errors', async () => {
    const mockError = {
      error: 'Test error',
      code: 'TEST_ERROR',
      retryable: true,
    };
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve(mockError),
    });

    const onError = jest.fn();
    const { result } = renderHook(() => usePaymentMethodApi({ onError }));

    let apiResult: any;
    await act(async () => {
      apiResult = await result.current.handleApiCall(() => fetch('/api/test'));
    });

    expect(apiResult.success).toBe(false);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Test error',
        code: 'TEST_ERROR',
      })
    );
    expect(result.current.error).toEqual(
      expect.objectContaining({
        error: 'Test error',
        code: 'TEST_ERROR',
      })
    );
  });

  it('should handle network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePaymentMethodApi());

    let apiResult: any;
    await act(async () => {
      apiResult = await result.current.handleApiCall(() => fetch('/api/test'));
    });

    expect(apiResult.success).toBe(false);
    expect(result.current.error).toEqual(
      expect.objectContaining({
        code: 'NETWORK_ERROR',
        retryable: true,
      })
    );
  });

  it('should clear errors', () => {
    const { result } = renderHook(() => usePaymentMethodApi());

    // Simulate an error state
    act(() => {
      result.current.handleApiCall(() =>
        Promise.reject(new Error('Test error'))
      );
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
    expect(result.current.retryCount).toBe(0);
  });

  it('should handle retries with exponential backoff', async () => {
    jest.useFakeTimers();

    const mockError = {
      error: 'Retryable error',
      retryable: true,
    };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(mockError),
    });

    const { result } = renderHook(() => usePaymentMethodApi({ maxRetries: 2 }));

    // First call to set up error state
    await act(async () => {
      await result.current.handleApiCall(() => fetch('/api/test'));
    });

    expect(result.current.retryCount).toBe(0);
    expect(result.current.canRetry).toBe(true);

    // Retry
    act(() => {
      result.current.retry(() => fetch('/api/test'));
    });

    // Fast-forward the exponential backoff delay
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.retryCount).toBe(1);

    jest.useRealTimers();
  });

  it('should respect max retries limit', async () => {
    const mockError = {
      error: 'Retryable error',
      retryable: true,
    };
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve(mockError),
    });

    const { result } = renderHook(() => usePaymentMethodApi({ maxRetries: 1 }));

    // First call
    await act(async () => {
      await result.current.handleApiCall(() => fetch('/api/test'));
    });

    // Retry once
    await act(async () => {
      await result.current.retry(() => fetch('/api/test'));
    });

    expect(result.current.retryCount).toBe(1);
    expect(result.current.canRetry).toBe(false);

    // Try to retry again - should fail
    let retryResult: any;
    await act(async () => {
      retryResult = await result.current.retry(() => fetch('/api/test'));
    });

    expect(retryResult.success).toBe(false);
    expect(retryResult.error.error).toContain('Máximo número de reintentos');
  });
});
