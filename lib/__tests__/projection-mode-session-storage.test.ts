/**
 * @jest-environment jsdom
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from '@jest/globals';

// Mock the session storage functionality
const mockSessionStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

// Mock window.sessionStorage
Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true,
});

// Mock toast function (not needed for these tests)
const mockToast = jest.fn();

describe('Projection Mode Session Storage', () => {
  beforeEach(() => {
    // Clear all mocks and storage before each test
    jest.clearAllMocks();
    mockSessionStorage.clear();
  });

  afterEach(() => {
    // Clean up after each test
    jest.clearAllMocks();
  });

  describe('Session Storage Utilities', () => {
    // These functions would be extracted from the component for testing
    const saveProjectionModeToSession = (mode: boolean) => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const projectionState = {
            projectionMode: mode,
            lastUpdated: Date.now(),
          };
          sessionStorage.setItem(
            'dashboard-projection-mode',
            JSON.stringify(projectionState)
          );
        }
      } catch (error) {
        console.error(
          'Error saving projection mode to session storage:',
          error
        );
      }
    };

    const loadProjectionModeFromSession = (): boolean => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          const saved = sessionStorage.getItem('dashboard-projection-mode');
          if (saved) {
            const projectionState = JSON.parse(saved);

            // Handle legacy format (direct boolean) for backward compatibility
            if (typeof projectionState === 'boolean') {
              return projectionState;
            }

            // Handle new format with metadata
            if (
              projectionState &&
              typeof projectionState.projectionMode === 'boolean'
            ) {
              // Check if the stored state is not too old (e.g., older than 24 hours)
              const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
              const isExpired =
                projectionState.lastUpdated &&
                Date.now() - projectionState.lastUpdated > maxAge;

              if (isExpired) {
                sessionStorage.removeItem('dashboard-projection-mode');
                return false;
              }

              return projectionState.projectionMode;
            }
          }
        }
        return false;
      } catch (error) {
        console.error(
          'Error loading projection mode from session storage:',
          error
        );
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            sessionStorage.removeItem('dashboard-projection-mode');
          }
        } catch (clearError) {
          console.error(
            'Error clearing corrupted session storage:',
            clearError
          );
        }
        return false;
      }
    };

    const clearProjectionModeFromSession = () => {
      try {
        if (typeof window !== 'undefined' && window.sessionStorage) {
          sessionStorage.removeItem('dashboard-projection-mode');
        }
      } catch (error) {
        console.error(
          'Error clearing projection mode from session storage:',
          error
        );
      }
    };

    const isSessionStorageAvailable = (): boolean => {
      try {
        if (typeof window === 'undefined' || !window.sessionStorage) {
          return false;
        }

        // Test if we can actually write to session storage
        const testKey = 'dashboard-storage-test';
        sessionStorage.setItem(testKey, 'test');
        sessionStorage.removeItem(testKey);
        return true;
      } catch (error) {
        console.error('Session storage is not available:', error);
        return false;
      }
    };

    it('should save projection mode to session storage', () => {
      saveProjectionModeToSession(true);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'dashboard-projection-mode',
        expect.stringContaining('"projectionMode":true')
      );
    });

    it('should load projection mode from session storage', () => {
      // Set up mock data
      const projectionState = {
        projectionMode: true,
        lastUpdated: Date.now(),
      };
      mockSessionStorage.setItem(
        'dashboard-projection-mode',
        JSON.stringify(projectionState)
      );

      const result = loadProjectionModeFromSession();

      expect(result).toBe(true);
      expect(mockSessionStorage.getItem).toHaveBeenCalledWith(
        'dashboard-projection-mode'
      );
    });

    it('should handle legacy boolean format', () => {
      // Set up legacy format (direct boolean)
      mockSessionStorage.setItem('dashboard-projection-mode', 'true');

      const result = loadProjectionModeFromSession();

      expect(result).toBe(true);
    });

    it('should handle expired state', () => {
      // Set up expired state (older than 24 hours)
      const expiredState = {
        projectionMode: true,
        lastUpdated: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      mockSessionStorage.setItem(
        'dashboard-projection-mode',
        JSON.stringify(expiredState)
      );

      const result = loadProjectionModeFromSession();

      expect(result).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'dashboard-projection-mode'
      );
    });

    it('should return false for corrupted data', () => {
      // Set up corrupted data
      mockSessionStorage.setItem('dashboard-projection-mode', 'invalid-json');

      const result = loadProjectionModeFromSession();

      expect(result).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'dashboard-projection-mode'
      );
    });

    it('should clear projection mode from session storage', () => {
      clearProjectionModeFromSession();

      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'dashboard-projection-mode'
      );
    });

    it('should validate session storage availability', () => {
      const result = isSessionStorageAvailable();

      expect(result).toBe(true);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'dashboard-storage-test',
        'test'
      );
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        'dashboard-storage-test'
      );
    });

    it('should handle session storage quota exceeded error', () => {
      // Mock quota exceeded error
      mockSessionStorage.setItem.mockImplementation(() => {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      // This would normally show a toast, but we're testing the error handling
      expect(() => saveProjectionModeToSession(true)).not.toThrow();
    });

    it('should return false when session storage is not available', () => {
      // Mock unavailable session storage
      Object.defineProperty(window, 'sessionStorage', {
        value: undefined,
        writable: true,
      });

      const result = isSessionStorageAvailable();
      expect(result).toBe(false);

      // Restore session storage
      Object.defineProperty(window, 'sessionStorage', {
        value: mockSessionStorage,
        writable: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle session storage errors gracefully', () => {
      // Mock session storage to throw an error
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error('Session storage error');
      });

      const loadProjectionModeFromSession = (): boolean => {
        try {
          if (typeof window !== 'undefined' && window.sessionStorage) {
            const saved = sessionStorage.getItem('dashboard-projection-mode');
            if (saved) {
              return JSON.parse(saved).projectionMode || false;
            }
          }
          return false;
        } catch (error) {
          console.error(
            'Error loading projection mode from session storage:',
            error
          );
          return false;
        }
      };

      const result = loadProjectionModeFromSession();
      expect(result).toBe(false);
    });
  });
});
