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

describe("Simulate Mode State Management", () => {
  // Mock state management functions (extracted from component)
  let simulateMode = false;
  let activePeriod = { id: 1, name: "Test Period" };
  let selectedEstudio = 1;
  let selectedGroupers = [1, 2, 3];
  let paymentMethod = "all";
  let activeTab = "current";

  const setSimulateMode = jest.fn((mode: boolean) => {
    simulateMode = mode;
  });

  const setGrouperData = jest.fn();
  const setCategoryData = jest.fn();
  const setSelectedGrouper = jest.fn();
  const setShowCategoryChart = jest.fn();

  // Session storage utilities (extracted from component)
  const saveSimulateModeToSession = (mode: boolean) => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const simulationState = {
          simulateMode: mode,
          lastUpdated: Date.now(),
        };
        sessionStorage.setItem(
          "dashboard-simulate-mode",
          JSON.stringify(simulationState)
        );
      }
    } catch (error) {
      console.error("Error saving simulate mode to session storage:", error);
    }
  };

  const loadSimulateModeFromSession = (): boolean => {
    try {
      if (typeof window !== "undefined" && window.sessionStorage) {
        const saved = sessionStorage.getItem("dashboard-simulate-mode");
        if (saved) {
          const simulationState = JSON.parse(saved);

          // Handle legacy format (direct boolean)
          if (typeof simulationState === "boolean") {
            return simulationState;
          }

          // Handle new format with metadata
          if (
            simulationState &&
            typeof simulationState.simulateMode === "boolean"
          ) {
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            const isExpired =
              simulationState.lastUpdated &&
              Date.now() - simulationState.lastUpdated > maxAge;

            if (isExpired) {
              sessionStorage.removeItem("dashboard-simulate-mode");
              return false;
            }

            return simulationState.simulateMode;
          }
        }
      }
      return false;
    } catch (error) {
      console.error("Error loading simulate mode from session storage:", error);
      try {
        if (typeof window !== "undefined" && window.sessionStorage) {
          sessionStorage.removeItem("dashboard-simulate-mode");
        }
      } catch (clearError) {
        console.error("Error clearing corrupted session storage:", clearError);
      }
      return false;
    }
  };

  const setSimulateModeWithPersistence = (mode: boolean) => {
    try {
      setSimulateMode(mode);
      saveSimulateModeToSession(mode);
    } catch (error) {
      console.error("Error setting simulate mode with persistence:", error);
      setSimulateMode(mode);
      mockToast({
        title: "Advertencia",
        description:
          "El modo simulación se activó pero no se pudo guardar la preferencia",
        variant: "default",
      });
    }
  };

  const handleSimulateModeToggle = (checked: boolean) => {
    setSimulateModeWithPersistence(checked);

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
    simulateMode = false;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Basic State Management", () => {
    it("should initialize simulate mode as false", () => {
      expect(simulateMode).toBe(false);
    });

    it("should toggle simulate mode on", () => {
      handleSimulateModeToggle(true);
      expect(setSimulateMode).toHaveBeenCalledWith(true);
    });

    it("should toggle simulate mode off", () => {
      simulateMode = true;
      handleSimulateModeToggle(false);
      expect(setSimulateMode).toHaveBeenCalledWith(false);
    });

    it("should clear data when toggling simulate mode", () => {
      activeTab = "current";
      handleSimulateModeToggle(true);

      expect(setGrouperData).toHaveBeenCalledWith([]);
      expect(setCategoryData).toHaveBeenCalledWith([]);
      expect(setSelectedGrouper).toHaveBeenCalledWith(null);
      expect(setShowCategoryChart).toHaveBeenCalledWith(false);
    });

    it("should not clear data when not on current tab", () => {
      activeTab = "period-comparison";
      handleSimulateModeToggle(true);

      expect(setGrouperData).not.toHaveBeenCalled();
      expect(setCategoryData).not.toHaveBeenCalled();
    });
  });

  describe("Session Storage Integration", () => {
    it("should save simulate mode to session storage", () => {
      handleSimulateModeToggle(true);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        "dashboard-simulate-mode",
        expect.stringContaining('"simulateMode":true')
      );
    });

    it("should load simulate mode from session storage", () => {
      const simulationState = {
        simulateMode: true,
        lastUpdated: Date.now(),
      };
      mockSessionStorage.setItem(
        "dashboard-simulate-mode",
        JSON.stringify(simulationState)
      );

      const result = loadSimulateModeFromSession();
      expect(result).toBe(true);
    });

    it("should handle legacy boolean format in session storage", () => {
      mockSessionStorage.setItem("dashboard-simulate-mode", "true");

      const result = loadSimulateModeFromSession();
      expect(result).toBe(true);
    });

    it("should handle expired session storage data", () => {
      const expiredState = {
        simulateMode: true,
        lastUpdated: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
      };
      mockSessionStorage.setItem(
        "dashboard-simulate-mode",
        JSON.stringify(expiredState)
      );

      const result = loadSimulateModeFromSession();
      expect(result).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "dashboard-simulate-mode"
      );
    });

    it("should handle corrupted session storage data", () => {
      mockSessionStorage.setItem("dashboard-simulate-mode", "invalid-json");

      const result = loadSimulateModeFromSession();
      expect(result).toBe(false);
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith(
        "dashboard-simulate-mode"
      );
    });

    it("should handle session storage errors gracefully", () => {
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error("Storage quota exceeded");
      });

      handleSimulateModeToggle(true);

      expect(setSimulateMode).toHaveBeenCalledWith(true);
      expect(mockToast).toHaveBeenCalledWith({
        title: "Advertencia",
        description:
          "El modo simulación se activó pero no se pudo guardar la preferencia",
        variant: "default",
      });
    });
  });

  describe("Filter State Management", () => {
    it("should maintain filter state when toggling simulate mode", () => {
      const initialEstudio = selectedEstudio;
      const initialGroupers = [...selectedGroupers];
      const initialPaymentMethod = paymentMethod;

      handleSimulateModeToggle(true);

      // Filters should remain unchanged
      expect(selectedEstudio).toBe(initialEstudio);
      expect(selectedGroupers).toEqual(initialGroupers);
      expect(paymentMethod).toBe(initialPaymentMethod);
    });

    it("should work with estudio filter", () => {
      selectedEstudio = 2;
      handleSimulateModeToggle(true);

      expect(setSimulateMode).toHaveBeenCalledWith(true);
      expect(selectedEstudio).toBe(2);
    });

    it("should work with grouper filter", () => {
      selectedGroupers = [1, 3];
      handleSimulateModeToggle(true);

      expect(setSimulateMode).toHaveBeenCalledWith(true);
      expect(selectedGroupers).toEqual([1, 3]);
    });

    it("should work with payment method filter", () => {
      paymentMethod = "credit";
      handleSimulateModeToggle(true);

      expect(setSimulateMode).toHaveBeenCalledWith(true);
      expect(paymentMethod).toBe("credit");
    });
  });

  describe("Tab State Management", () => {
    it("should only be available on current tab", () => {
      activeTab = "current";
      const isSimulateAvailable = activeTab === "current";
      expect(isSimulateAvailable).toBe(true);
    });

    it("should not be available on period comparison tab", () => {
      activeTab = "period-comparison";
      const isSimulateAvailable = activeTab === "current";
      expect(isSimulateAvailable).toBe(false);
    });

    it("should not be available on weekly cumulative tab", () => {
      activeTab = "weekly-cumulative";
      const isSimulateAvailable = activeTab === "current";
      expect(isSimulateAvailable).toBe(false);
    });

    it("should maintain simulate mode preference when switching tabs", () => {
      activeTab = "current";
      handleSimulateModeToggle(true);

      // Switch to another tab
      activeTab = "period-comparison";
      // Simulate mode state should be preserved
      expect(simulateMode).toBe(true);

      // Switch back to current tab
      activeTab = "current";
      // Simulate mode should still be active
      expect(simulateMode).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should handle session storage unavailable", () => {
      Object.defineProperty(window, "sessionStorage", {
        value: undefined,
        writable: true,
      });

      expect(() => handleSimulateModeToggle(true)).not.toThrow();
      expect(setSimulateMode).toHaveBeenCalledWith(true);

      // Restore session storage
      Object.defineProperty(window, "sessionStorage", {
        value: mockSessionStorage,
        writable: true,
      });
    });

    it("should handle JSON parse errors", () => {
      mockSessionStorage.getItem.mockReturnValue("invalid-json");

      const result = loadSimulateModeFromSession();
      expect(result).toBe(false);
    });

    it("should handle missing lastUpdated field", () => {
      const stateWithoutTimestamp = {
        simulateMode: true,
        // missing lastUpdated
      };
      mockSessionStorage.setItem(
        "dashboard-simulate-mode",
        JSON.stringify(stateWithoutTimestamp)
      );

      const result = loadSimulateModeFromSession();
      expect(result).toBe(true); // Should still work without timestamp
    });
  });

  describe("Component Lifecycle", () => {
    it("should restore simulate mode on component mount", () => {
      const simulationState = {
        simulateMode: true,
        lastUpdated: Date.now(),
      };
      mockSessionStorage.setItem(
        "dashboard-simulate-mode",
        JSON.stringify(simulationState)
      );

      // Simulate component mount
      const savedSimulateMode = loadSimulateModeFromSession();
      setSimulateMode(savedSimulateMode);

      expect(setSimulateMode).toHaveBeenCalledWith(true);
    });

    it("should handle restoration errors gracefully", () => {
      mockSessionStorage.getItem.mockImplementation(() => {
        throw new Error("Storage error");
      });

      // Simulate component mount with error
      const savedSimulateMode = loadSimulateModeFromSession();
      setSimulateMode(savedSimulateMode);

      expect(setSimulateMode).toHaveBeenCalledWith(false); // Fallback to default
    });
  });
});
