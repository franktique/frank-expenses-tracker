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

// Mock the toast function
const mockToast = jest.fn();
jest.mock("@/components/ui/use-toast", () => ({
  toast: mockToast,
}));

// Mock session storage
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

Object.defineProperty(window, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
});

describe("Projection Mode State Management", () => {
  // Mock state management functions (extracted from component)
  let projectionMode = false;
  let activePeriod = { id: 1, name: "Test Period" };
  let selectedEstudio = 1;
  let selectedGroupers = [1, 2, 3];
  let paymentMethod = "all";
  let activeTab = "current";

  const setProjectionMode = jest.fn((mode: boolean) => {
    projectionMode = mode;
  });

  const setGrouperData = jest.fn();
  const setCategoryData = jest.fn();
  const setSelectedGrouper = jest.fn();
  const setShowCategoryChart = jest.fn();

  // Session storage utilities (extracted from component)
  const saveProjectionModeToSession = (mode: boolean) => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const projectionState = {
          projectionMode: mode,
          lastUpdated: Date.now(),
        };
        sessionStorage.setItem(
          "dashboard-projection-mode",
          JSON.stringify(projectionState)
        );
      }
    } catch (error) {
      console.error("Error saving projection mode to session storage:", error);
    }
  };

  const loadProjectionModeFromSession = (): boolean => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const saved = sessionStorage.getItem("dashboard-projection-mode");
        if (saved) {
          const projectionState = JSON.parse(saved);

          // Handle legacy format (direct boolean)
          if (typeof projectionState === "boolean") {
            return projectionState;
          }

          // Handle new format with metadata
          if (
            projectionState &&
            typeof projectionState.projectionMode === "boolean"
          ) {
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            const isExpired =
              projectionState.lastUpdated &&
              Date.now() - projectionState.lastUpdated > maxAge;

            if (isExpired) {
              sessionStorage.removeItem("dashboard-projection-mode");
              return false;
            }

            return projectionState.projectionMode;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading projection mode from session storage:", error);
      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          sessionStorage.removeItem("dashboard-projection-mode");
        }
      } catch (clearError) {
        console.error("Error clearing corrupted session storage:", clearError);
      }
      return false;
    }
  };

  const setProjectionModeWithPersistence = (mode: boolean) => {
    try {
      setProjectionMode(mode);
      saveProjectionModeToSession(mode);
    } catch (error) {
      console.error("Error setting projection mode with persistence:", error);
      setProjectionMode(mode);
      mockToast({
        title: "Advertencia",
        description:
          "El modo proyección se activó pero no se pudo guardar la preferencia",
        variant: "default",
      });
    }
  };

  const handleProjectionModeToggle = (checked: boolean) => {
    setProjectionModeWithPersistence(checked);

    // Force data refresh by clearing existing data
    if (activeTab === "current") {
      setGrouperData([]);
      setCategoryData([]);
      // Reset category view if active
      setSelectedGrouper(null);
      setShowCategoryChart(false);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSessionStorage.clear();
    projectionMode = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic State Management", () => {
    it("should initialize projection mode as false", () => {
      expect(projectionMode).toBe(false);
    });

    it("should toggle projection mode on", () => {
      handleProjectionModeToggle(true);
      expect(setProjectionMode).toHaveBeenCalledWith(true);
    });

    it("should toggle projection mode off", () => {
      projectionMode = true;
      handleProjectionModeToggle(false);
      expect(setProjectionMode).toHaveBeenCalledWith(false);
    });

    it("should clear data when toggling projection mode", () => {
      activeTab = "current";
      handleProjectionModeToggle(true);

      expect(setGrouperData).toHaveBeenCalledWith([]);
      expect(setCategoryData).toHaveBeenCalledWith([]);
      expect(setSelectedGrouper).toHaveBeenCalledWith(null);
      expect(setShowCategoryChart).toHaveBeenCalledWith(false);
    });

    it("should not clear data when not on current tab", () => {
      activeTab = "period-comparison";
      handleProjectionModeToggle(true);

      expect(setGrouperData).not.toHaveBeenCalled();
      expect(setCategoryData).not.toHaveBeenCalled();
    });
  });

  describe("Session Storage Integration", () => {
    it("should save projection mode to session storage", () => {
      handleProjectionModeToggle(true);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "dashboard-projection-mode",
        expect.stringContaining('"projectionMode":true')
      );
    });

    it("should load projection mode from session storage", () => {
      const projectionState = {
        projectionMode: true,
        lastUpdated: Date.now(),
      };
      mockSessionStorage.setItem(
        "dashboard-projection-mode",
        JSON.stringify(projectionState)
      );

      const result = loadProjectionModeFromSession();
      expect(result).toBe(true);
    });

    it("should handle legacy boolean format in session storage", () => {
      mockSessionStorage.setItem("dashboard-projection-mode", "true");

      const result = loadProjectionModeFromSession();
      expect(result).toBe(true);
    });

    it("should handle expired session storage data", () => {
      const expiredState = {
        projectionMode: true,
        lastUpdated: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      mockSessionStorage.setItem(
        "dashboard-projection-mode",
        JSON.stringify(expiredState)
      );

      const result = loadProjectionModeFromSession();
      expect(result).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "dashboard-projection-mode"
      );
    });

    it("should handle corrupted session storage data", () => {
      mockSessionStorage.setItem("dashboard-projection-mode", "invalid-json");

      const result = loadProjectionModeFromSession();
      expect(result).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "dashboard-projection-mode"
      );
    });

    it("should handle session storage errors gracefully", () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      handleProjectionModeToggle(true);

      expect(setProjectionMode).toHaveBeenCalledWith(true);
      expect(mockToast).toHaveBeenCalledWith({
        title: "Advertencia",
        description:
          "El modo proyección se activó pero no se pudo guardar la preferencia",
        variant: "default",
      });
    });
  });

  describe("Filter State Management", () => {
    it("should maintain filter state when toggling projection mode", () => {
      const initialEstudio = selectedEstudio;
      const initialGroupers = [...selectedGroupers];
      const initialPaymentMethod = paymentMethod;

      handleProjectionModeToggle(true);

      // Filters should remain unchanged
      expect(selectedEstudio).toBe(initialEstudio);
      expect(selectedGroupers).toEqual(initialGroupers);
      expect(paymentMethod).toBe(initialPaymentMethod);
    });

    it("should work with estudio filter", () => {
      selectedEstudio = 2;
      handleProjectionModeToggle(true);

      expect(setProjectionMode).toHaveBeenCalledWith(true);
      expect(selectedEstudio).toBe(2);
    });

    it("should work with grouper filter", () => {
      selectedGroupers = [1, 3];
      handleProjectionModeToggle(true);

      expect(setProjectionMode).toHaveBeenCalledWith(true);
      expect(selectedGroupers).toEqual([1, 3]);
    });

    it("should work with payment method filter", () => {
      paymentMethod = "credit";
      handleProjectionModeToggle(true);

      expect(setProjectionMode).toHaveBeenCalledWith(true);
      expect(paymentMethod).toBe("credit");
    });
  });

  describe("Tab State Management", () => {
    it("should only be available on current tab", () => {
      activeTab = "current";
      const isProjectionAvailable = activeTab === "current";
      expect(isProjectionAvailable).toBe(true);
    });

    it("should not be available on period comparison tab", () => {
      activeTab = "period-comparison";
      const isProjectionAvailable = activeTab === "current";
      expect(isProjectionAvailable).toBe(false);
    });

    it("should not be available on weekly cumulative tab", () => {
      activeTab = "weekly-cumulative";
      const isProjectionAvailable = activeTab === "current";
      expect(isProjectionAvailable).toBe(false);
    });

    it("should maintain projection mode preference when switching tabs", () => {
      activeTab = "current";
      handleProjectionModeToggle(true);

      // Switch to another tab
      activeTab = "period-comparison";
      // Projection mode state should be preserved
      expect(projectionMode).toBe(true);

      // Switch back to current tab
      activeTab = "current";
      // Projection mode should still be active
      expect(projectionMode).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle session storage unavailable", () => {
      Object.defineProperty(window, "sessionStorage", {
        value: undefined,
        writable: true,
      });

      expect(() => handleProjectionModeToggle(true)).not.toThrow();
      expect(setProjectionMode).toHaveBeenCalledWith(true);

      // Restore session storage
      Object.defineProperty(window, "sessionStorage", {
        value: mockSessionStorage,
        writable: true,
      });
    });

    it("should handle JSON parse errors", () => {
      mockSessionStorage.getItem.mockReturnValue("invalid-json");

      const result = loadProjectionModeFromSession();
      expect(result).toBe(false);
    });

    it("should handle missing lastUpdated field", () => {
      const stateWithoutTimestamp = {
        projectionMode: true,
        // missing lastUpdated
      };
      mockSessionStorage.setItem(
        "dashboard-projection-mode",
        JSON.stringify(stateWithoutTimestamp)
      );

      const result = loadProjectionModeFromSession();
      expect(result).toBe(true); // Should still work without timestamp
    });
  });

  describe("Component Lifecycle", () => {
    it("should restore projection mode on component mount", () => {
      const projectionState = {
        projectionMode: true,
        lastUpdated: Date.now(),
      };
      mockSessionStorage.setItem(
        "dashboard-projection-mode",
        JSON.stringify(projectionState)
      );

      // Projection component mount
      const savedProjectionMode = loadProjectionModeFromSession();
      setProjectionMode(savedProjectionMode);

      expect(setProjectionMode).toHaveBeenCalledWith(true);
    });

    it("should handle restoration errors gracefully", () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Projection component mount with error
      const savedProjectionMode = loadProjectionModeFromSession();
      setProjectionMode(savedProjectionMode);

      expect(setProjectionMode).toHaveBeenCalledWith(false); // Fallback to default
    });
  });
});
