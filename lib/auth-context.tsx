'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Period } from '../types/funds';
import {
  loadActivePeriod,
  loadActivePeriodWithCircuitBreaker,
  loadActivePeriodWithAdaptiveRetry,
  PeriodLoadingError,
  getCircuitBreakerStatus,
  resetCircuitBreaker,
} from './active-period-service';
import { ActivePeriodStorage } from './active-period-storage';
import {
  showActivePeriodLoadedNotification,
  showActivePeriodErrorNotification,
  showActivePeriodRetryNotification,
  showSessionStorageErrorNotification,
} from './active-period-notifications';

type AuthContextType = {
  isAuthenticated: boolean;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  activePeriod: Period | null;
  isLoadingActivePeriod: boolean;
  activePeriodError: PeriodLoadingError | null;
  retryActivePeriodLoading: () => Promise<void>;
  clearActivePeriodError: () => void;
  performCacheHealthCheck: () => void;
  recoverFromCacheCorruption: () => void;
  getServiceStatus: () => {
    circuitBreaker: any;
    cacheHealth: any;
    usingFallback: boolean;
  };
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activePeriod, setActivePeriod] = useState<Period | null>(null);
  const [isLoadingActivePeriod, setIsLoadingActivePeriod] =
    useState<boolean>(false);
  const [activePeriodError, setActivePeriodError] =
    useState<PeriodLoadingError | null>(null);

  // Check for authentication on component mount (from localStorage)
  useEffect(() => {
    const auth = localStorage.getItem('auth');
    if (auth === 'true') {
      setIsAuthenticated(true);
      // Try to load cached active period if user is already authenticated
      loadCachedActivePeriod();
    }
  }, []);

  // Load cached active period from session storage with error recovery
  const loadCachedActivePeriod = () => {
    try {
      // First, perform a health check and auto-repair if needed
      const healthCheck = ActivePeriodStorage.performCacheHealthCheck();

      if (!healthCheck.healthy && !healthCheck.repaired) {
        console.warn('Cache health check failed:', healthCheck.issues);
        return;
      }

      if (healthCheck.repaired) {
        console.log('Cache was repaired:', healthCheck.actions);
      }

      // Use fallback-aware storage
      const storage = ActivePeriodStorage.withFallback();
      const cachedPeriod = storage.loadActivePeriod();

      if (cachedPeriod) {
        setActivePeriod(cachedPeriod);
        setActivePeriodError(null);

        if (storage.usingFallback) {
          console.warn('Using memory fallback for active period storage');
        }
      }
    } catch (error) {
      console.warn('Failed to load cached active period:', error);

      // Attempt cache recovery
      const recovery = ActivePeriodStorage.recoverFromCorruptedCache();
      console.log('Cache recovery attempt:', recovery);

      if (recovery.recovered && recovery.action === 'reconstructed_cache') {
        // Try loading again after recovery
        try {
          const storage = ActivePeriodStorage.withFallback();
          const recoveredPeriod = storage.loadActivePeriod();
          if (recoveredPeriod) {
            setActivePeriod(recoveredPeriod);
            setActivePeriodError(null);
            console.log('Successfully loaded period after cache recovery');
          }
        } catch (recoveryError) {
          console.warn(
            'Failed to load period even after recovery:',
            recoveryError
          );
        }
      }
    }
  };

  // Load active period from server with comprehensive error recovery
  const loadActivePeriodFromServer = async (
    useAdaptiveRetry: boolean = false
  ): Promise<void> => {
    setIsLoadingActivePeriod(true);
    setActivePeriodError(null);

    try {
      // Choose loading strategy based on circuit breaker state and user preference
      const circuitBreakerState = getCircuitBreakerStatus();
      let result: any;

      if (circuitBreakerState.state === 'open') {
        console.log('Circuit breaker is open, using basic retry');
        result = await loadActivePeriod(2, 2000); // Reduced retries when circuit is open
      } else if (useAdaptiveRetry) {
        console.log('Using adaptive retry strategy');
        result = await loadActivePeriodWithAdaptiveRetry();
      } else {
        console.log('Using circuit breaker protected loading');
        result = await loadActivePeriodWithCircuitBreaker();
      }

      if (result.success) {
        setActivePeriod(result.period);
        setActivePeriodError(null);

        // Show success notification
        showActivePeriodLoadedNotification(result.period.name);

        // Save to session storage with fallback
        try {
          const storage = ActivePeriodStorage.withFallback();
          storage.saveActivePeriod(result.period);

          if (storage.usingFallback) {
            console.warn('Saved active period using memory fallback');
            showSessionStorageErrorNotification();
          }
        } catch (storageError) {
          console.warn(
            'Failed to save active period to storage:',
            storageError
          );
          showSessionStorageErrorNotification();
        }
      } else {
        setActivePeriod(null);
        setActivePeriodError(result.error);

        // Show error notification with retry option
        showActivePeriodErrorNotification(result.error, () => {
          retryActivePeriodLoading();
        });

        // Clear any stale cached data with fallback
        try {
          const storage = ActivePeriodStorage.withFallback();
          storage.clearActivePeriod();
        } catch (clearError) {
          console.warn('Failed to clear stale cache:', clearError);
        }
      }
    } catch (error) {
      console.error('Unexpected error loading active period:', error);
      setActivePeriod(null);
      setActivePeriodError({
        type: 'unknown',
        message: 'Error inesperado al cargar el periodo activo',
        retryable: true,
        timestamp: Date.now(),
      });

      // Clear any stale cached data
      try {
        const storage = ActivePeriodStorage.withFallback();
        storage.clearActivePeriod();
      } catch (clearError) {
        console.warn('Failed to clear cache after error:', clearError);
      }
    } finally {
      setIsLoadingActivePeriod(false);
    }
  };

  // Retry active period loading with intelligent strategy selection
  const retryActivePeriodLoading = async (): Promise<void> => {
    if (isLoadingActivePeriod) {
      return; // Already loading, don't start another request
    }

    showActivePeriodRetryNotification();

    // Use adaptive retry for manual retries to be more aggressive
    await loadActivePeriodFromServer(true);
  };

  // Clear active period error
  const clearActivePeriodError = (): void => {
    setActivePeriodError(null);
  };

  // Perform cache health check and repair
  const performCacheHealthCheck = (): void => {
    try {
      const healthCheck = ActivePeriodStorage.performCacheHealthCheck();
      console.log('Cache health check results:', healthCheck);

      if (healthCheck.repaired) {
        console.log('Cache was automatically repaired');
        // Reload cached period after repair
        loadCachedActivePeriod();
      }
    } catch (error) {
      console.error('Cache health check failed:', error);
    }
  };

  // Recover from cache corruption
  const recoverFromCacheCorruption = (): void => {
    try {
      const recovery = ActivePeriodStorage.recoverFromCorruptedCache();
      console.log('Cache recovery results:', recovery);

      if (recovery.recovered) {
        // Try to reload after recovery
        loadCachedActivePeriod();

        // If no cached data after recovery, try loading from server
        if (!activePeriod) {
          loadActivePeriodFromServer();
        }
      }
    } catch (error) {
      console.error('Cache recovery failed:', error);
    }
  };

  // Get comprehensive service status
  const getServiceStatus = () => {
    const circuitBreaker = getCircuitBreakerStatus();
    const cacheHealth = ActivePeriodStorage.performCacheHealthCheck();
    const storage = ActivePeriodStorage.withFallback();

    return {
      circuitBreaker,
      cacheHealth,
      usingFallback: storage.usingFallback,
    };
  };

  const login = async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        setIsAuthenticated(true);
        localStorage.setItem('auth', 'true');

        // Trigger active period loading after successful authentication
        // This runs in the background and doesn't block the login process
        loadActivePeriodFromServer().catch((error) => {
          console.error('Failed to load active period after login:', error);
        });

        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('auth');

    // Clear active period state and session storage
    setActivePeriod(null);
    setIsLoadingActivePeriod(false);
    setActivePeriodError(null);

    // Clear session storage with comprehensive error handling and fallback
    try {
      const storage = ActivePeriodStorage.withFallback();
      storage.clearActivePeriod();

      if (storage.usingFallback) {
        console.log(
          'Cleared active period using memory fallback during logout'
        );
      }
    } catch (error) {
      // Session storage clear errors should not prevent logout
      console.warn(
        'Failed to clear active period from storage during logout:',
        error
      );

      // Last resort: try to clear directly
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          window.sessionStorage.removeItem('budget_tracker_active_period');
        }
      } catch (directClearError) {
        console.warn('Direct cache clear also failed:', directClearError);
      }
    }

    // Reset circuit breaker on logout for fresh start on next login
    try {
      resetCircuitBreaker();
    } catch (resetError) {
      console.warn('Failed to reset circuit breaker:', resetError);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        login,
        logout,
        activePeriod,
        isLoadingActivePeriod,
        activePeriodError,
        retryActivePeriodLoading,
        clearActivePeriodError,
        performCacheHealthCheck,
        recoverFromCacheCorruption,
        getServiceStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
