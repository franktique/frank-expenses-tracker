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
} from "@jest/globals";

import {
  categorizeProjectionError,
  validateBudgetData,
  createErrorRecoveryStrategies,
  PROJECTION_ERROR_MESSAGES,
} from "../projection-mode-error-handling";

describe("Projection Mode Error Handling", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("categorizeProjectionError", () => {
    it("should categorize missing budget data error", () => {
      const error = new Error("No budget data available");
      const result = categorizeProjectionError(error);

      expect(result.projectionType).toBe("missing_budget_data");
      expect(result.message).toBe(
        "No hay datos de presupuesto disponibles para la proyección"
      );
      expect(result.retryable).toBe(false);
    });

    it("should categorize partial budget data error", () => {
      const error = new Error("Partial budget data available");
      const result = categorizeProjectionError(error);

      expect(result.projectionType).toBe("partial_budget_data");
      expect(result.message).toBe(
        "Algunos agrupadores no tienen presupuesto asignado"
      );
      expect(result.retryable).toBe(false);
    });

    it("should categorize projection API failure", () => {
      const error = new Error("Projection API failed");
      const result = categorizeProjectionError(error);

      expect(result.projectionType).toBe("projection_api_failure");
      expect(result.message).toBe("Error al cargar datos de proyección");
      expect(result.retryable).toBe(true);
    });

    it("should categorize filter conflict error", () => {
      const error = new Error("Filter conflict detected");
      const result = categorizeProjectionError(error);

      expect(result.projectionType).toBe("filter_conflict");
      expect(result.message).toBe("Conflicto entre filtros y modo proyección");
      expect(result.retryable).toBe(false);
    });

    it("should categorize session storage error", () => {
      const error = new Error("Session storage failed");
      const result = categorizeProjectionError(error);

      expect(result.projectionType).toBe("session_storage_error");
      expect(result.message).toBe(
        "Error al guardar preferencias de proyección"
      );
      expect(result.retryable).toBe(true);
    });

    it("should categorize category projection failure", () => {
      const error = new Error("Error al proyectar datos de categorías");
      const result = categorizeProjectionError(error);

      expect(result.projectionType).toBe("category_projection_failure");
      expect(result.message).toBe("Error al proyectar datos de categorías");
      expect(result.retryable).toBe(true);
    });

    it("should include context information", () => {
      const error = new Error("Test error");
      const context = {
        selectedEstudio: 1,
        selectedGroupers: [1, 2],
        paymentMethod: "credit",
        activeTab: "current",
      };

      const result = categorizeProjectionError(error, context);

      expect(result.context).toEqual(context);
    });

    it("should handle non-Error objects", () => {
      const error = "String error";
      const result = categorizeProjectionError(error);

      expect(result.type).toBe("unknown");
      expect(result.retryable).toBe(false);
    });
  });

  describe("validateBudgetData", () => {
    it("should validate empty data", () => {
      const result = validateBudgetData([], {});

      expect(result.isValid).toBe(false);
      expect(result.error?.projectionType).toBe("missing_budget_data");
    });

    it("should validate null data", () => {
      const result = validateBudgetData(null as any, {});

      expect(result.isValid).toBe(false);
      expect(result.error?.projectionType).toBe("missing_budget_data");
    });

    it("should validate data with no budget amounts", () => {
      const data = [
        { id: 1, name: "Test 1", total_amount: 100, budget_amount: null },
        { id: 2, name: "Test 2", total_amount: 200, budget_amount: 0 },
      ];

      const result = validateBudgetData(data, {});

      expect(result.isValid).toBe(false);
      expect(result.error?.projectionType).toBe("missing_budget_data");
    });

    it("should validate data with partial budget amounts", () => {
      const data = [
        { id: 1, name: "Test 1", total_amount: 100, budget_amount: 50 },
        { id: 2, name: "Test 2", total_amount: 200, budget_amount: null },
      ];

      const result = validateBudgetData(data, {});

      expect(result.isValid).toBe(true);
      expect(result.error?.projectionType).toBe("partial_budget_data");
    });

    it("should validate data with complete budget amounts", () => {
      const data = [
        { id: 1, name: "Test 1", total_amount: 100, budget_amount: 50 },
        { id: 2, name: "Test 2", total_amount: 200, budget_amount: 150 },
      ];

      const result = validateBudgetData(data, {});

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should include context in validation error", () => {
      const context = {
        selectedEstudio: 1,
        selectedGroupers: [1, 2],
      };

      const result = validateBudgetData([], context);

      expect(result.error?.context).toEqual(context);
    });
  });

  describe("createErrorRecoveryStrategies", () => {
    let mockOriginalFetch: jest.Mock;
    let mockFallbackActions: {
      disableProjectionMode: jest.Mock;
      refreshData: jest.Mock;
      showActualData: jest.Mock;
    };

    beforeEach(() => {
      mockOriginalFetch = jest.fn();
      mockFallbackActions = {
        disableProjectionMode: jest.fn(),
        refreshData: jest.fn(),
        showActualData: jest.fn(),
      };
    });

    it("should retry with backoff on retryable errors", async () => {
      mockOriginalFetch
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"))
        .mockResolvedValueOnce({ data: "success" });

      const strategies = createErrorRecoveryStrategies(
        mockOriginalFetch,
        mockFallbackActions
      );

      const result = await strategies.retryWithBackoff(3);

      expect(result).toEqual({ data: "success" });
      expect(mockOriginalFetch).toHaveBeenCalledTimes(3);
    });

    it("should stop retrying after max attempts", async () => {
      const error = new Error("Persistent error");
      mockOriginalFetch.mockRejectedValue(error);

      const strategies = createErrorRecoveryStrategies(
        mockOriginalFetch,
        mockFallbackActions
      );

      await expect(strategies.retryWithBackoff(2)).rejects.toThrow(
        "Persistent error"
      );
      expect(mockOriginalFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it("should fallback to actual data", async () => {
      // Set up mock to succeed when called (after disabling projection mode)
      mockOriginalFetch.mockResolvedValueOnce({ data: "actual data" });

      const strategies = createErrorRecoveryStrategies(
        mockOriginalFetch,
        mockFallbackActions
      );

      const result = await strategies.fallbackToActualData();

      expect(result).toEqual({ data: "actual data" });
      expect(mockFallbackActions.disableProjectionMode).toHaveBeenCalled();
      expect(mockOriginalFetch).toHaveBeenCalledTimes(1);
    });

    it("should use graceful degradation", async () => {
      // Set up mock to always fail
      mockOriginalFetch.mockRejectedValue(new Error("Complete failure"));

      const strategies = createErrorRecoveryStrategies(
        mockOriginalFetch,
        mockFallbackActions
      );

      const result = await strategies.gracefulDegradation();

      expect(result).toEqual([]);
      expect(mockOriginalFetch).toHaveBeenCalledTimes(1);
    });

    it("should handle fallback failure", async () => {
      mockOriginalFetch.mockRejectedValue(new Error("Both failed"));

      const strategies = createErrorRecoveryStrategies(
        mockOriginalFetch,
        mockFallbackActions
      );

      await expect(strategies.fallbackToActualData()).rejects.toThrow(
        "Both failed"
      );
      expect(mockFallbackActions.disableProjectionMode).toHaveBeenCalled();
    });
  });

  describe("Error Messages", () => {
    it("should have all required error messages", () => {
      expect(PROJECTION_ERROR_MESSAGES.NO_BUDGET_DATA).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.PARTIAL_BUDGET_DATA).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.PROJECTION_API_FAILURE).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.FILTER_CONFLICT).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.SESSION_STORAGE_ERROR).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.CATEGORY_PROJECTION_FAILURE).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.FALLBACK_TO_ACTUAL).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.RETRY_PROJECTION).toBeDefined();
      expect(PROJECTION_ERROR_MESSAGES.CONTINUE_WITH_PARTIAL).toBeDefined();
    });

    it("should have Spanish error messages", () => {
      expect(PROJECTION_ERROR_MESSAGES.NO_BUDGET_DATA).toContain("presupuesto");
      expect(PROJECTION_ERROR_MESSAGES.PARTIAL_BUDGET_DATA).toContain(
        "agrupadores"
      );
      expect(PROJECTION_ERROR_MESSAGES.PROJECTION_API_FAILURE).toContain(
        "proyección"
      );
    });

    it("should have user-friendly messages", () => {
      expect(PROJECTION_ERROR_MESSAGES.RETRY_PROJECTION).toContain("Reintentar");
      expect(PROJECTION_ERROR_MESSAGES.CONTINUE_WITH_PARTIAL).toContain(
        "Continuar"
      );
      expect(PROJECTION_ERROR_MESSAGES.FALLBACK_TO_ACTUAL).toContain(
        "datos reales"
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle undefined error", () => {
      const result = categorizeProjectionError(undefined);

      expect(result.type).toBe("unknown");
      expect(result.message).toBe("Error desconocido en modo proyección");
    });

    it("should handle null error", () => {
      const result = categorizeProjectionError(null);

      expect(result.type).toBe("unknown");
      expect(result.retryable).toBe(false);
    });

    it("should validate data with undefined budget_amount", () => {
      const data = [
        { id: 1, name: "Test 1", total_amount: 100, budget_amount: undefined },
      ];

      const result = validateBudgetData(data, {});

      expect(result.isValid).toBe(false);
    });

    it("should handle empty context", () => {
      const error = new Error("Test error");
      const result = categorizeProjectionError(error, {});

      expect(result.context).toEqual({});
    });
  });
});
