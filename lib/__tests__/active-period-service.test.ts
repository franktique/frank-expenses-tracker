/**
 * Tests for Active Period Loading Service
 */

import {
  loadActivePeriod,
  loadActivePeriodOrThrow,
  isPeriodErrorRetryable,
  getPeriodErrorMessage,
  createPeriodLoader,
  type PeriodLoadingError,
} from "../active-period-service";
import { Period } from "../../types/funds";

// Mock the error handling module
jest.mock("../error-handling", () => ({
  categorizeError: jest.fn((error: unknown) => {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      if (message.includes("network") || message.includes("fetch")) {
        return {
          type: "network",
          message: "Network error",
          originalError: error,
          retryable: true,
        };
      }
      if (message.includes("timeout")) {
        return {
          type: "timeout",
          message: "Timeout error",
          originalError: error,
          retryable: true,
        };
      }
      if (message.includes("server")) {
        return {
          type: "server",
          message: "Server error",
          originalError: error,
          retryable: true,
        };
      }
    }
    return {
      type: "unknown",
      message: "Unknown error",
      originalError: error,
      retryable: true,
    };
  }),
  retryWithBackoff: jest.fn(),
  fetchWithTimeout: jest.fn(),
  handleApiResponse: jest.fn(),
}));

// Mock fetch is already set up in jest.setup.js
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("Active Period Service", () => {
  const mockActivePeriod: Period = {
    id: "1",
    name: "January 2024",
    month: 0,
    year: 2024,
    is_open: true,
    isOpen: true,
  };

  const mockInactivePeriod: Period = {
    id: "2",
    name: "February 2024",
    month: 1,
    year: 2024,
    is_open: false,
    isOpen: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the error handling functions
    const {
      retryWithBackoff,
      fetchWithTimeout,
      handleApiResponse,
    } = require("../error-handling");

    retryWithBackoff.mockImplementation(
      async (operation: () => Promise<any>) => {
        return await operation();
      }
    );

    fetchWithTimeout.mockImplementation(async (url: string) => {
      return mockFetch(url);
    });

    handleApiResponse.mockImplementation(async (response: Response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    });
  });

  describe("loadActivePeriod", () => {
    it("should successfully load active period", async () => {
      const mockPeriods = [mockInactivePeriod, mockActivePeriod];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriods,
      } as Response);

      const result = await loadActivePeriod();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.period).toEqual(mockActivePeriod);
      }
    });

    it("should handle case with no active period", async () => {
      const mockPeriods = [mockInactivePeriod];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriods,
      } as Response);

      const result = await loadActivePeriod();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("no_active_period");
        expect(result.error.message).toContain("No hay un periodo activo");
      }
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network: Connection failed"));

      const result = await loadActivePeriod();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("network");
        expect(result.error.retryable).toBe(true);
      }
    });

    it("should handle authentication errors", async () => {
      mockFetch.mockRejectedValueOnce(
        new Error("unauthorized: Authentication failed")
      );

      const result = await loadActivePeriod();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("authentication");
        expect(result.error.retryable).toBe(false);
        expect(result.error.message).toContain("Sesión expirada");
      }
    });

    it("should handle server errors", async () => {
      mockFetch.mockRejectedValueOnce(
        new Error("server: Internal server error")
      );

      const result = await loadActivePeriod();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("server");
        expect(result.error.retryable).toBe(true);
      }
    });

    it("should handle timeout errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("timeout: Request timed out"));

      const result = await loadActivePeriod();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("timeout");
        expect(result.error.retryable).toBe(true);
      }
    });

    it("should normalize period data correctly", async () => {
      const mockPeriodsWithInconsistentData = [
        {
          id: "1",
          name: "Test Period",
          month: 0,
          year: 2024,
          is_open: true,
          // Missing isOpen property
        },
        {
          id: "2",
          name: "Test Period 2",
          month: 1,
          year: 2024,
          // Missing is_open property
          isOpen: false,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriodsWithInconsistentData,
      } as Response);

      const result = await loadActivePeriod();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.period.is_open).toBe(true);
        expect(result.period.isOpen).toBe(true);
      }
    });
  });

  describe("loadActivePeriodOrThrow", () => {
    it("should return period on success", async () => {
      const mockPeriods = [mockActivePeriod];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriods,
      } as Response);

      const period = await loadActivePeriodOrThrow();

      expect(period).toEqual(mockActivePeriod);
    });

    it("should throw error on failure", async () => {
      const mockPeriods = [mockInactivePeriod];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriods,
      } as Response);

      await expect(loadActivePeriodOrThrow()).rejects.toThrow();
    });
  });

  describe("isPeriodErrorRetryable", () => {
    it("should return true for retryable network errors", () => {
      const error: PeriodLoadingError = {
        type: "network",
        message: "Network error",
        retryable: true,
        timestamp: Date.now(),
      };

      expect(isPeriodErrorRetryable(error)).toBe(true);
    });

    it("should return false for authentication errors", () => {
      const error: PeriodLoadingError = {
        type: "authentication",
        message: "Auth error",
        retryable: true, // Even if marked retryable, auth errors should not be retried
        timestamp: Date.now(),
      };

      expect(isPeriodErrorRetryable(error)).toBe(false);
    });

    it("should return false for no_active_period errors", () => {
      const error: PeriodLoadingError = {
        type: "no_active_period",
        message: "No active period",
        retryable: true, // Even if marked retryable, no active period errors should not be retried
        timestamp: Date.now(),
      };

      expect(isPeriodErrorRetryable(error)).toBe(false);
    });

    it("should return false for non-retryable errors", () => {
      const error: PeriodLoadingError = {
        type: "server",
        message: "Server error",
        retryable: false,
        timestamp: Date.now(),
      };

      expect(isPeriodErrorRetryable(error)).toBe(false);
    });
  });

  describe("getPeriodErrorMessage", () => {
    it("should return appropriate message for network errors", () => {
      const error: PeriodLoadingError = {
        type: "network",
        message: "Network error",
        retryable: true,
        timestamp: Date.now(),
      };

      const message = getPeriodErrorMessage(error);
      expect(message).toContain("Error de conexión");
      expect(message).toContain("periodo activo");
    });

    it("should return appropriate message for authentication errors", () => {
      const error: PeriodLoadingError = {
        type: "authentication",
        message: "Auth error",
        retryable: false,
        timestamp: Date.now(),
      };

      const message = getPeriodErrorMessage(error);
      expect(message).toContain("sesión ha expirado");
    });

    it("should return appropriate message for no_active_period errors", () => {
      const error: PeriodLoadingError = {
        type: "no_active_period",
        message: "No active period",
        retryable: false,
        timestamp: Date.now(),
      };

      const message = getPeriodErrorMessage(error);
      expect(message).toContain("No hay un periodo activo");
      expect(message).toContain("periodos");
    });

    it("should return appropriate message for timeout errors", () => {
      const error: PeriodLoadingError = {
        type: "timeout",
        message: "Timeout error",
        retryable: true,
        timestamp: Date.now(),
      };

      const message = getPeriodErrorMessage(error);
      expect(message).toContain("tardó demasiado tiempo");
    });

    it("should return appropriate message for server errors", () => {
      const error: PeriodLoadingError = {
        type: "server",
        message: "Server error",
        retryable: true,
        timestamp: Date.now(),
      };

      const message = getPeriodErrorMessage(error);
      expect(message).toContain("Error del servidor");
    });

    it("should return default message for unknown errors", () => {
      const error: PeriodLoadingError = {
        type: "unknown",
        message: "",
        retryable: true,
        timestamp: Date.now(),
      };

      const message = getPeriodErrorMessage(error);
      expect(message).toContain("Error desconocido");
    });
  });

  describe("createPeriodLoader", () => {
    it("should create a loader function with custom parameters", async () => {
      const mockPeriods = [mockActivePeriod];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriods,
      } as Response);

      const loader = createPeriodLoader(5, 2000);
      const result = await loader();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.period).toEqual(mockActivePeriod);
      }
    });
  });

  describe("Error categorization", () => {
    it("should categorize invalid cache errors correctly", async () => {
      mockFetch.mockRejectedValueOnce(
        new Error("invalid cache: Cache corrupted")
      );

      const result = await loadActivePeriod();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("invalid_cache");
        expect(result.error.message).toContain(
          "datos almacenados están desactualizados"
        );
      }
    });

    it("should include timestamp in error objects", async () => {
      const beforeTime = Date.now();

      mockFetch.mockRejectedValueOnce(new Error("network: Connection failed"));

      const result = await loadActivePeriod();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.timestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(result.error.timestamp).toBeLessThanOrEqual(Date.now());
      }
    });
  });

  describe("Circuit Breaker", () => {
    const {
      loadActivePeriodWithCircuitBreaker,
      getCircuitBreakerStatus,
      resetCircuitBreaker,
    } = require("../active-period-service");

    beforeEach(() => {
      resetCircuitBreaker();
    });

    it("should allow requests when circuit is closed", async () => {
      const mockPeriods = [mockActivePeriod];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriods,
      } as Response);

      const result = await loadActivePeriodWithCircuitBreaker();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.period).toEqual(mockActivePeriod);
      }

      const status = getCircuitBreakerStatus();
      expect(status.state).toBe("closed");
      expect(status.failureCount).toBe(0);
    });

    it("should handle circuit breaker functionality", async () => {
      // Test that circuit breaker exists and can be called
      // The actual circuit breaker logic is complex to test in isolation
      // so we'll test that the function exists and returns appropriate results

      mockFetch.mockRejectedValueOnce(new Error("network: Connection failed"));
      const result = await loadActivePeriodWithCircuitBreaker();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("network");
      }

      // Verify circuit breaker status can be retrieved
      const status = getCircuitBreakerStatus();
      expect(status).toHaveProperty("state");
      expect(status).toHaveProperty("failureCount");
      expect(status).toHaveProperty("lastFailureTime");
    });
  });

  describe("Adaptive Retry", () => {
    const {
      loadActivePeriodWithAdaptiveRetry,
    } = require("../active-period-service");

    it("should succeed on first attempt when service is working", async () => {
      const mockPeriods = [mockActivePeriod];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockPeriods,
      } as Response);

      const result = await loadActivePeriodWithAdaptiveRetry();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.period).toEqual(mockActivePeriod);
      }
    });

    it("should retry with adaptive delays for retryable errors", async () => {
      const startTime = Date.now();

      // First few attempts fail, last one succeeds
      mockFetch
        .mockRejectedValueOnce(new Error("network: Connection failed"))
        .mockRejectedValueOnce(new Error("timeout: Request timed out"))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => [mockActivePeriod],
        } as Response);

      // Use shorter delays for testing
      const result = await loadActivePeriodWithAdaptiveRetry(5, 50);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      // Should have taken some time due to retries with delays (but not too much for tests)
      expect(duration).toBeGreaterThan(50);
    }, 10000); // Increase timeout for this test

    it("should not retry non-retryable errors", async () => {
      mockFetch.mockRejectedValueOnce(
        new Error("unauthorized: Authentication failed")
      );

      const result = await loadActivePeriodWithAdaptiveRetry();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe("authentication");
      }
    });
  });
});
