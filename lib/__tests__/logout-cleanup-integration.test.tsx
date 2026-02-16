/**
 * Integration tests for logout cleanup functionality
 * Tests the complete logout flow including session storage cleanup
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
function LogoutTestComponent() {
  const auth = useAuth();
  return (
    <div>
      <div data-testid="authenticated">{auth.isAuthenticated.toString()}</div>
      <div data-testid="active-period">{auth.activePeriod?.name || 'null'}</div>
      <div data-testid="loading-period">
        {auth.isLoadingActivePeriod.toString()}
      </div>
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

describe('Logout Cleanup Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Complete Logout Flow', () => {
    it('should perform complete cleanup on logout', async () => {
      // Setup: User is authenticated with active period
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      );

      // Verify initial authenticated state with active period
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('active-period')).toHaveTextContent(
          'Test Period'
        );
      });

      // Perform logout
      const logoutButton = screen.getByText('Logout');

      await act(async () => {
        logoutButton.click();
      });

      // Verify complete cleanup
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
        expect(screen.getByTestId('period-error')).toHaveTextContent('null');
      });

      // Verify localStorage cleanup
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth');

      // Verify session storage cleanup
      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();
    });

    it('should handle logout with period error state', async () => {
      // Setup: User is authenticated but has period error
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(null);

      render(
        <AuthProvider>
          <LogoutTestComponent />
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

      // Perform logout
      const logoutButton = screen.getByText('Logout');

      await act(async () => {
        logoutButton.click();
      });

      // Verify error state is cleared
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('period-error')).toHaveTextContent('null');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
      });

      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();
    });

    it('should handle session storage errors gracefully during logout', async () => {
      // Setup: User is authenticated
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      // Mock session storage clear to throw error
      mockActivePeriodStorage.clearActivePeriod.mockImplementation(() => {
        throw new Error('Storage clear failed');
      });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      // Perform logout
      const logoutButton = screen.getByText('Logout');

      await act(async () => {
        logoutButton.click();
      });

      // Logout should still work even if storage clear fails
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
      });

      // Should log warning but not prevent logout
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to clear active period from session storage during logout:',
        expect.any(Error)
      );

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth');
      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should clear all states even when logout is called multiple times', async () => {
      // Setup: User is authenticated
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
      });

      const logoutButton = screen.getByText('Logout');

      // Call logout multiple times
      await act(async () => {
        logoutButton.click();
        logoutButton.click();
        logoutButton.click();
      });

      // Should still work correctly
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
        expect(screen.getByTestId('period-error')).toHaveTextContent('null');
      });

      // Should have been called at least once
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('auth');
      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();
    });
  });

  describe('Logout Requirements Verification', () => {
    it('should satisfy requirement 4.4: clear active period from session storage on logout', async () => {
      // This test specifically verifies requirement 4.4 from the spec
      mockLocalStorage.getItem.mockReturnValue('true');
      mockActivePeriodStorage.loadActivePeriod.mockReturnValue(mockPeriod);

      render(
        <AuthProvider>
          <LogoutTestComponent />
        </AuthProvider>
      );

      // Verify initial state
      await waitFor(() => {
        expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
        expect(screen.getByTestId('active-period')).toHaveTextContent(
          'Test Period'
        );
      });

      // Perform logout
      const logoutButton = screen.getByText('Logout');
      await act(async () => {
        logoutButton.click();
      });

      // Verify requirement 4.4 is satisfied:
      // "WHEN users log out THEN the system SHALL clear the active period from session storage"
      expect(mockActivePeriodStorage.clearActivePeriod).toHaveBeenCalled();

      // Verify all period-related state is reset
      await waitFor(() => {
        expect(screen.getByTestId('active-period')).toHaveTextContent('null');
        expect(screen.getByTestId('loading-period')).toHaveTextContent('false');
        expect(screen.getByTestId('period-error')).toHaveTextContent('null');
      });
    });
  });
});
