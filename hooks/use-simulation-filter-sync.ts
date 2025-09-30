/**
 * Hook for managing simulation filter state synchronization
 *
 * This hook handles filter state persistence and synchronization
 * across tabs and navigation for simulation analytics.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  SimulationFilterState,
  SimulationFilterOptions,
  saveSimulationFilterState,
  loadSimulationFilterState,
  clearSimulationFilterState,
  getDefaultSimulationFilterState,
  useSimulationFilterState,
} from "@/lib/simulation-filter-state";

export interface UseSimulationFilterSyncOptions
  extends SimulationFilterOptions {
  onStateChange?: (state: SimulationFilterState) => void;
  enableStorageSync?: boolean;
  enableTabSync?: boolean;
  syncInterval?: number; // in milliseconds
}

export interface SimulationFilterSyncResult {
  // Current filter state
  filterState: SimulationFilterState;

  // State update functions
  updateEstudio: (estudioId: number | null) => void;
  updateGroupers: (grouperIds: number[]) => void;
  updatePaymentMethods: (methods: string[]) => void;
  updateComparisonPeriods: (periods: number) => void;
  updateSimulation: (simulationId: number | null) => void;

  // Utility functions
  resetFilters: () => void;
  syncWithStorage: () => void;
  clearStorage: () => void;

  // State indicators
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  lastSyncTime: number | null;
}

export function useSimulationFilterSync(
  options: UseSimulationFilterSyncOptions,
  initialState?: Partial<SimulationFilterState>
): SimulationFilterSyncResult {
  const {
    onStateChange,
    enableStorageSync = true,
    enableTabSync = true,
    syncInterval = 1000,
    ...filterOptions
  } = options;

  // Create unique instance ID to prevent conflicts
  const instanceIdRef = useRef(`hook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`);
  const instanceId = instanceIdRef.current;

  // Initialize state with defaults only - we'll load from storage in useEffect
  const [filterState, setFilterState] = useState<SimulationFilterState>(() => {
    return {
      ...getDefaultSimulationFilterState(),
      ...initialState,
      lastUpdated: Date.now(),
    };
  });

  const [isLoading, setIsLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Refs for managing sync
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastStorageCheckRef = useRef<number>(Date.now());

  // Save state to storage
  const saveToStorage = useCallback(
    (state: SimulationFilterState) => {
      if (!enableStorageSync) return;

      try {
        saveSimulationFilterState(state, { ...filterOptions, instanceId });
        setLastSyncTime(Date.now());
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error("Error saving simulation filter state:", error);
      }
    },
    [enableStorageSync, filterOptions, instanceId]
  );

  // Load state from storage
  const loadFromStorage = useCallback(() => {
    if (!enableStorageSync) return null;

    try {
      return loadSimulationFilterState(filterOptions);
    } catch (error) {
      console.error("Error loading simulation filter state:", error);
      return null;
    }
  }, [enableStorageSync, filterOptions]);

  // Update filter state with automatic persistence
  const updateFilterState = useCallback(
    (updates: Partial<SimulationFilterState>, immediate = false) => {
      setFilterState((prevState) => {
        const newState: SimulationFilterState = {
          ...prevState,
          ...updates,
          lastUpdated: Date.now(),
        };

        // Notify parent component
        onStateChange?.(newState);

        // Save to storage (debounced or immediate)
        if (enableStorageSync) {
          if (immediate) {
            saveToStorage(newState);
          } else {
            // Clear existing timeout
            if (syncTimeoutRef.current) {
              clearTimeout(syncTimeoutRef.current);
            }

            // Set new timeout for debounced save
            syncTimeoutRef.current = setTimeout(() => {
              saveToStorage(newState);
            }, syncInterval);
          }
        }

        return newState;
      });

      setHasUnsavedChanges(true);
    },
    [onStateChange, enableStorageSync, saveToStorage, syncInterval]
  );

  // Individual update functions
  const updateEstudio = useCallback(
    (estudioId: number | null) => {
      updateFilterState({
        selectedEstudio: estudioId,
        // Reset groupers when estudio changes
        selectedGroupers: [],
      });
    },
    [updateFilterState]
  );

  const updateGroupers = useCallback(
    (grouperIds: number[]) => {
      updateFilterState({ selectedGroupers: grouperIds });
    },
    [updateFilterState]
  );

  const updatePaymentMethods = useCallback(
    (methods: string[]) => {
      updateFilterState({ selectedPaymentMethods: methods });
    },
    [updateFilterState]
  );

  const updateComparisonPeriods = useCallback(
    (periods: number) => {
      updateFilterState({ comparisonPeriods: periods });
    },
    [updateFilterState]
  );

  const updateSimulation = useCallback(
    (simulationId: number | null) => {
      // This doesn't update the filter state directly since simulation selection
      // is typically handled separately from filter persistence
      setFilterState((prevState) => {
        const newState = {
          ...prevState,
          lastUpdated: Date.now(),
        };
        onStateChange?.(newState);
        return newState;
      });
    },
    [onStateChange]
  );

  // Reset filters to defaults
  const resetFilters = useCallback(() => {
    const defaultState = {
      ...getDefaultSimulationFilterState(),
      lastUpdated: Date.now(),
    };

    setFilterState(defaultState);
    setHasUnsavedChanges(false);

    // Clear storage
    if (enableStorageSync) {
      clearSimulationFilterState(filterOptions);
    }

    onStateChange?.(defaultState);
  }, [enableStorageSync, filterOptions, onStateChange]);

  // Manually sync with storage
  const syncWithStorage = useCallback(() => {
    if (!enableStorageSync) return;

    setIsLoading(true);
    try {
      const savedState = loadFromStorage();
      if (savedState) {
        setFilterState((prevState) => {
          if (savedState.lastUpdated > prevState.lastUpdated) {
            onStateChange?.(savedState);
            return savedState;
          }
          return prevState;
        });
      }
    } catch (error) {
      console.error("Error syncing with storage:", error);
    } finally {
      setIsLoading(false);
    }
  }, [enableStorageSync, loadFromStorage, onStateChange]);

  // Clear storage
  const clearStorage = useCallback(() => {
    if (enableStorageSync) {
      clearSimulationFilterState(filterOptions);
      setLastSyncTime(null);
      setHasUnsavedChanges(false);
    }
  }, [enableStorageSync, filterOptions]);

  // Tab synchronization effect
  useEffect(() => {
    if (!enableTabSync || !enableStorageSync) return;

    const handleStorageChange = (event: StorageEvent) => {
      // Check if the change is related to our simulation filter state
      const sessionKey = `simulation-${filterOptions.simulationId}-filter-state-session`;
      const localKey = `simulation-${filterOptions.simulationId}-filter-state-local`;

      if (event.key === sessionKey || event.key === localKey) {
        // Check if this change was made by a different instance
        try {
          const data = event.newValue ? JSON.parse(event.newValue) : null;
          if (data && data.instanceId && data.instanceId !== instanceId) {
            // Only sync if the change came from a different instance
            syncWithStorage();
          }
        } catch (error) {
          console.error("Error parsing storage change event:", error);
          // Fallback: sync anyway in case of parsing error
          syncWithStorage();
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check for updates when tab becomes visible
        const now = Date.now();
        if (now - lastStorageCheckRef.current > syncInterval) {
          syncWithStorage();
          lastStorageCheckRef.current = now;
        }
      }
    };

    // Add event listeners
    window.addEventListener("storage", handleStorageChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [
    enableTabSync,
    enableStorageSync,
    filterOptions.simulationId,
    syncWithStorage,
    syncInterval,
  ]);

  // Initialize state from storage on mount
  useEffect(() => {
    if (!enableStorageSync) return;

    setIsLoading(true);
    try {
      const savedState = loadFromStorage();
      if (savedState) {
        setFilterState((currentState) => {
          // Merge saved state with any initial state provided
          const mergedState = {
            ...currentState,
            ...savedState,
            // Preserve any initial state values that are newer
            ...(initialState && currentState.lastUpdated > savedState.lastUpdated ? initialState : {}),
            lastUpdated: Math.max(currentState.lastUpdated, savedState.lastUpdated),
          };
          
          onStateChange?.(mergedState);
          return mergedState;
        });
      }
    } catch (error) {
      console.error("Error initializing simulation filter state:", error);
    } finally {
      setIsLoading(false);
    }
  }, [enableStorageSync]); // Only run on mount

  // Refs to access latest values in cleanup without dependencies
  const filterStateRef = useRef(filterState);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);

  // Update refs when values change
  useEffect(() => {
    filterStateRef.current = filterState;
  }, [filterState]);

  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Cleanup effect - only runs on mount/unmount
  useEffect(() => {
    return () => {
      // Clear any pending sync timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }

      // Save any unsaved changes before unmount using refs to avoid dependencies
      if (hasUnsavedChangesRef.current && enableStorageSync) {
        try {
          saveToStorage(filterStateRef.current);
        } catch (error) {
          console.error("Error saving state during cleanup:", error);
        }
      }
    };
  }, [enableStorageSync, saveToStorage]); // Removed filterState and hasUnsavedChanges

  // Auto-save effect for immediate persistence of critical changes
  useEffect(() => {
    // Save immediately when estudio changes (critical filter)
    if (filterState.selectedEstudio !== null) {
      saveToStorage(filterState);
    }
  }, [filterState.selectedEstudio, saveToStorage]); // Fixed: Removed lastUpdated to prevent infinite loop

  return {
    filterState,
    updateEstudio,
    updateGroupers,
    updatePaymentMethods,
    updateComparisonPeriods,
    updateSimulation,
    resetFilters,
    syncWithStorage,
    clearStorage,
    isLoading,
    hasUnsavedChanges,
    lastSyncTime,
  };
}

/**
 * Hook for managing filter state synchronization across multiple tabs
 * within the same simulation analytics session
 */
export function useSimulationTabSync(
  simulationId: number,
  onTabStateChange?: (state: SimulationFilterState) => void
) {
  const [tabStates, setTabStates] = useState<
    Map<string, SimulationFilterState>
  >(new Map());
  const [activeTabId] = useState(() => `tab-${Date.now()}-${Math.random()}`);

  // Broadcast state changes to other tabs
  const broadcastStateChange = useCallback(
    (state: SimulationFilterState) => {
      try {
        const broadcastData = {
          type: "simulation-filter-state-change",
          simulationId,
          tabId: activeTabId,
          state,
          timestamp: Date.now(),
        };

        // Use BroadcastChannel if available, otherwise use localStorage
        if (typeof BroadcastChannel !== "undefined") {
          const channel = new BroadcastChannel(
            `simulation-${simulationId}-sync`
          );
          channel.postMessage(broadcastData);
          channel.close();
        } else {
          // Fallback to localStorage for cross-tab communication
          const key = `simulation-${simulationId}-tab-sync`;
          localStorage.setItem(key, JSON.stringify(broadcastData));
          // Remove immediately to trigger storage event
          localStorage.removeItem(key);
        }
      } catch (error) {
        console.error("Error broadcasting state change:", error);
      }
    },
    [simulationId, activeTabId]
  );

  // Listen for state changes from other tabs
  useEffect(() => {
    const handleBroadcastMessage = (event: MessageEvent) => {
      if (
        event.data?.type === "simulation-filter-state-change" &&
        event.data?.simulationId === simulationId &&
        event.data?.tabId !== activeTabId
      ) {
        setTabStates((prev) =>
          new Map(prev).set(event.data.tabId, event.data.state)
        );
        onTabStateChange?.(event.data.state);
      }
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (
        event.key === `simulation-${simulationId}-tab-sync` &&
        event.newValue
      ) {
        try {
          const data = JSON.parse(event.newValue);
          if (
            data.type === "simulation-filter-state-change" &&
            data.simulationId === simulationId &&
            data.tabId !== activeTabId
          ) {
            setTabStates((prev) => new Map(prev).set(data.tabId, data.state));
            onTabStateChange?.(data.state);
          }
        } catch (error) {
          console.error("Error parsing tab sync data:", error);
        }
      }
    };

    // Set up listeners
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(`simulation-${simulationId}-sync`);
      channel.addEventListener("message", handleBroadcastMessage);

      return () => {
        channel.removeEventListener("message", handleBroadcastMessage);
        channel.close();
      };
    } else {
      window.addEventListener("storage", handleStorageChange);
      return () => window.removeEventListener("storage", handleStorageChange);
    }
  }, [simulationId, activeTabId, onTabStateChange]);

  return {
    tabStates,
    activeTabId,
    broadcastStateChange,
  };
}
