/**
 * Tests for enhanced auth context with active period loading
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../auth-context';
import { ActivePeriodStorage } from '../active-period-storage';
import { loadActivePeriod } from '../active-period-service';
import { Period } from '../../types/funds';

// Mock dependencies
jest.mock('../active-period-storage');
jest.mock('../active-period-service');

const mockActivePeriodStorage = ActivePeriodStorage as jest.Mocked<
  typeof ActivePeriodStorage
>;
const mockLoadActivePeriod = loadActivePeriod as jest.MockedFunction<
  typeof loadActivePeriod
>;

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Test component to access auth context
function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="loading-period">
        {auth.isLoadingActivePeriod.toString()}
      </div>
      <div data-testid="active-period">{auth.activePeriod?.name || 'null'}</div>
      <div data-testid="period-error">
        {auth.activePeriodError?.message || 'null'}
      </div>
      <button onClick={() => auth.login('test-password')}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

const mockPeriod: Period = {
  id: 'test-period-id',
  name: 'Test Period',
  month: 1,
  year: 2024,
  is_open: true,
  isOpen: true,
};

describe('AuthProvider with Active Period Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Initialization', () => {
    it('should load cached active period on mount when authenticated', async () => {
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('active-period')).toHaveTextContent(
          'Test Period'
        );
      });

      expect(mockActivePeriodStorage.loadActivePeriod).toHaveBeenCalled();
    });

    it('should handle cached period loading errors gracefully', async () => {
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to load cached active period:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Login with Active Period Loading', () => {
    it('should load active period after successful login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      mockLoadActivePeriod.mockResolvedValueOnce({
        success: true,
        period: mockPeriod,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Wait for active period loading to complete
      await waitFor(() => {
        expect(screen.getByTestId('active-period')).toHaveTextContent(
          'Test Period'
        );
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
      });

      expect(mockLoadActivePeriod).toHaveBeenCalled();
      expect(mockActivePeriodStorage.saveActivePeriod).toHaveBeenCalledWith(
        mockPeriod
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth', 'true');
    });

    it('should handle active period loading failure after login', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const periodError = {
        type: 'no_active_period' as const,
        message: 'No active period found',
        retryable: false,
        timestamp: Date.now(),
      };

      mockLoadActivePeriod.mockResolvedValueOnce({
        success: false,
        error: periodError,
      });

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Wait for active period loading to complete with error
      await waitFor(() => {
        expect(screen.getByTestId('period-error')).toHaveTextContent(
          'No active period found'
        );
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
      });

      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();
    });

    it('should handle unexpected errors during period loading', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      mockLoadActivePeriod.mockRejectedValueOnce(new Error('Unexpected error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Wait for error handling
      await waitFor(() => {
        expect(screen.getByTestId('period-error')).toHaveTextContent(
          'Error inesperado al cargar el periodo activo'
        );
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Unexpected error loading active period:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should not block login process if period loading fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      // Make period loading fail
      mockLoadActivePeriod.mockRejectedValueOnce(
        new Error('Period loading failed')
      );

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');

      await act(async () => {
        loginButton.click();
      });

      // Login should succeed immediately
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith('auth', 'true');
    });
  });

  describe('Logout with Cleanup', () => {
    it('should clear active period state and session storage on logout', async () => {
      // Set up authenticated state with active period
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('active-period')).toHaveTextContent(
          'Test Period'
        );
      });

      const logoutButton = screen.getByText('Logout');

      await act(async () => {
        logoutButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
        expect(screen.getByTestId('period-error')).toHaveTextContent('null');
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth');
      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();
    });

    it('should clear all period-related state on logout even with loading in progress', async () => {
      // Set up authenticated state with active period
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Wait for initial state to be set
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('active-period')).toHaveTextContent(
          'Test Period'
        );
      });

      // Simulate loading state by triggering login again
      const loginButton = screen.getByText('Login');
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);

      // Mock a slow loading period service
      const slowPromise = new Promise((resolve) => {
        setTimeout(
          () =>
            resolve({
              success: true,
              period: mockPeriod,
            }),
          1000
        );
      });
      mockLoadActivePeriod.mockReturnValue(slowPromise);

      await act(async () => {
        loginButton.click();
      });

      // Verify loading state
      await waitFor(() => {
        expect(screen.getByTestId('loading-period')).toHaveTextContent('true');
      });

      // Logout while loading is in progress
      const logoutButton = screen.getByText('Logout');

      await act(async () => {
        logoutButton.click();
      });

      // Verify all state is cleared immediately
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
        expect(screen.getByTestId('period-error')).toHaveTextContent('null');
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth');
      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();
    });

    it('should clear period error state on logout', async () => {
      // Set up authenticated state with period error
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(null);

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      // Trigger login with period loading error
      const loginButton = screen.getByText('Login');
      mockFetch.mockResolvedValueOnce({ ok: true } as Response);
      mockLoadActivePeriod.mockResolvedValueOnce({
        success: false,
        error: {
          type: 'network',
          message: 'Network error',
          retryable: true,
          timestamp: Date.now(),
        },
      });

      await act(async () => {
        loginButton.click();
      });

      // Verify error state
      await waitFor(() => {
        expect(screen.getByTestId('period-error')).toHaveTextContent(
          'Network error'
        );
      });

      // Logout
      const logoutButton = screen.getByText('Logout');

      await act(async () => {
        logoutButton.click();
      });

      // Verify error state is cleared
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('period-error')).toHaveTextContent('null');
      });

      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();
    });

    it('should handle session storage clear errors gracefully during logout', async () => {
      // Set up authenticated state
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      // Mock session storage clear to throw error
      mockActivePeriodStorage.clearActivePeriod.mockImplementation(() => {
        throw new Error('Storage clear failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByText('Logout');

      await act(async () => {
        logoutButton.click();
      });

      // Logout should still work even if storage clear fails
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
      });

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth');
      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();

      // Should log warning but not prevent logout
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear active period from session storage during logout:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Session Storage Integration', () => {
    it('should handle session storage save errors gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      mockLoadActivePeriod.mockResolvedValueOnce({
        success: true,
        period: mockPeriod,
      });

      mockActivePeriodStorage.saveActivePeriod.mockImplementation(() => {
        throw new Error('Storage save failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <AuthProvider>
          <TestComponent />
        </AuthProvider>
      );

      const loginButton = screen.getByText('Login');

      await act(async () => {
        loginButton.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('active-period')).toHaveTextContent(
          'Test Period'
        );
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to save active period to session storage:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });
});
