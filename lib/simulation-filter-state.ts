/**
 * Simulation Filter State Management
 *
 * This module handles filter state persistence and synchronization
 * for simulation analytics across different tabs and navigation.
 */

export interface SimulationFilterState {
  selectedEstudio: number | null;
  selectedGroupers: number[];
  selectedPaymentMethods: string[];
  comparisonPeriods: number;
  lastUpdated: number;
}

export interface SimulationFilterOptions {
  simulationId: number;
  persistAcrossTabs?: boolean;
  persistAcrossNavigation?: boolean;
  maxAge?: number; // in milliseconds
}

const DEFAULT_FILTER_STATE: Omit<SimulationFilterState, 'lastUpdated'> = {
  selectedEstudio: null,
  selectedGroupers: [],
  selectedPaymentMethods: ['efectivo', 'credito'],
  comparisonPeriods: 3,
};

const DEFAULT_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate storage key for simulation filter state
 */
function getStorageKey(
  simulationId: number,
  scope: 'session' | 'local' = 'session'
): string {
  return `simulation-${simulationId}-filter-state-${scope}`;
}

/**
 * Check if session/local storage is available
 */
function isStorageAvailable(type: 'session' | 'local'): boolean {
  try {
    if (typeof window === 'undefined') return false;

    const storage = type === 'session' ? sessionStorage : localStorage;
    const testKey = `test-${type}-storage`;
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    console.warn(`${type} storage is not available:`, error);
    return false;
  }
}

/**
 * Save simulation filter state to storage
 */
export function saveSimulationFilterState(
  state: Omit<SimulationFilterState, 'lastUpdated'>,
  options: SimulationFilterOptions & { instanceId?: string }
): void {
  try {
    const stateWithMetadata = {
      ...state,
      lastUpdated: Date.now(),
      instanceId: options.instanceId, // Include instance ID for conflict detection
    };

    // Save to session storage for tab persistence
    if (options.persistAcrossTabs && isStorageAvailable('session')) {
      const sessionKey = getStorageKey(options.simulationId, 'session');
      sessionStorage.setItem(sessionKey, JSON.stringify(stateWithMetadata));
    }

    // Save to local storage for navigation persistence
    if (options.persistAcrossNavigation && isStorageAvailable('local')) {
      const localKey = getStorageKey(options.simulationId, 'local');
      localStorage.setItem(localKey, JSON.stringify(stateWithMetadata));
    }
  } catch (error) {
    console.error('Error saving simulation filter state:', error);
  }
}

/**
 * Load simulation filter state from storage
 */
export function loadSimulationFilterState(
  options: SimulationFilterOptions
): SimulationFilterState | null {
  try {
    const maxAge = options.maxAge || DEFAULT_MAX_AGE;
    let savedState: SimulationFilterState | null = null;

    // Try to load from session storage first (more recent)
    if (options.persistAcrossTabs && isStorageAvailable('session')) {
      const sessionKey = getStorageKey(options.simulationId, 'session');
      const sessionData = sessionStorage.getItem(sessionKey);
      if (sessionData) {
        const parsed = JSON.parse(sessionData) as SimulationFilterState;
        if (Date.now() - parsed.lastUpdated < maxAge) {
          savedState = parsed;
        }
      }
    }

    // Fallback to local storage if session storage doesn't have valid data
    if (
      !savedState &&
      options.persistAcrossNavigation &&
      isStorageAvailable('local')
    ) {
      const localKey = getStorageKey(options.simulationId, 'local');
      const localData = localStorage.getItem(localKey);
      if (localData) {
        const parsed = JSON.parse(localData) as SimulationFilterState;
        if (Date.now() - parsed.lastUpdated < maxAge) {
          savedState = parsed;
        }
      }
    }

    return savedState;
  } catch (error) {
    console.error('Error loading simulation filter state:', error);
    return null;
  }
}

/**
 * Clear simulation filter state from storage
 */
export function clearSimulationFilterState(
  options: SimulationFilterOptions
): void {
  try {
    if (options.persistAcrossTabs && isStorageAvailable('session')) {
      const sessionKey = getStorageKey(options.simulationId, 'session');
      sessionStorage.removeItem(sessionKey);
    }

    if (options.persistAcrossNavigation && isStorageAvailable('local')) {
      const localKey = getStorageKey(options.simulationId, 'local');
      localStorage.removeItem(localKey);
    }
  } catch (error) {
    console.error('Error clearing simulation filter state:', error);
  }
}

/**
 * Get default filter state
 */
export function getDefaultSimulationFilterState(): Omit<
  SimulationFilterState,
  'lastUpdated'
> {
  return { ...DEFAULT_FILTER_STATE };
}

/**
 * Merge filter states with priority to newer state
 */
export function mergeSimulationFilterStates(
  currentState: Partial<SimulationFilterState>,
  savedState: SimulationFilterState
): SimulationFilterState {
  return {
    selectedEstudio: currentState.selectedEstudio ?? savedState.selectedEstudio,
    selectedGroupers:
      currentState.selectedGroupers ?? savedState.selectedGroupers,
    selectedPaymentMethods:
      currentState.selectedPaymentMethods ?? savedState.selectedPaymentMethods,
    comparisonPeriods:
      currentState.comparisonPeriods ?? savedState.comparisonPeriods,
    lastUpdated: Date.now(),
  };
}

/**
 * Validate filter state structure
 */
export function validateSimulationFilterState(
  state: any
): state is SimulationFilterState {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state.selectedEstudio === null ||
      typeof state.selectedEstudio === 'number') &&
    Array.isArray(state.selectedGroupers) &&
    Array.isArray(state.selectedPaymentMethods) &&
    typeof state.comparisonPeriods === 'number' &&
    typeof state.lastUpdated === 'number'
  );
}

/**
 * Create filter state change handler with automatic persistence
 */
export function createSimulationFilterStateHandler(
  options: SimulationFilterOptions,
  onStateChange?: (state: SimulationFilterState) => void
) {
  return {
    updateEstudio: (
      selectedEstudio: number | null,
      currentState: Partial<SimulationFilterState>
    ) => {
      const newState = {
        ...getDefaultSimulationFilterState(),
        ...currentState,
        selectedEstudio,
        // Reset groupers when estudio changes
        selectedGroupers: [],
      };

      saveSimulationFilterState(newState, options);
      onStateChange?.({ ...newState, lastUpdated: Date.now() });
    },

    updateGroupers: (
      selectedGroupers: number[],
      currentState: Partial<SimulationFilterState>
    ) => {
      const newState = {
        ...getDefaultSimulationFilterState(),
        ...currentState,
        selectedGroupers,
      };

      saveSimulationFilterState(newState, options);
      onStateChange?.({ ...newState, lastUpdated: Date.now() });
    },

    updatePaymentMethods: (
      selectedPaymentMethods: string[],
      currentState: Partial<SimulationFilterState>
    ) => {
      const newState = {
        ...getDefaultSimulationFilterState(),
        ...currentState,
        selectedPaymentMethods,
      };

      saveSimulationFilterState(newState, options);
      onStateChange?.({ ...newState, lastUpdated: Date.now() });
    },

    updateComparisonPeriods: (
      comparisonPeriods: number,
      currentState: Partial<SimulationFilterState>
    ) => {
      const newState = {
        ...getDefaultSimulationFilterState(),
        ...currentState,
        comparisonPeriods,
      };

      saveSimulationFilterState(newState, options);
      onStateChange?.({ ...newState, lastUpdated: Date.now() });
    },

    resetFilters: () => {
      const newState = getDefaultSimulationFilterState();
      clearSimulationFilterState(options);
      onStateChange?.({ ...newState, lastUpdated: Date.now() });
    },
  };
}

/**
 * Hook-like function to initialize and manage simulation filter state
 */
export function useSimulationFilterState(
  options: SimulationFilterOptions,
  initialState?: Partial<SimulationFilterState>
) {
  // Load saved state
  const savedState = loadSimulationFilterState(options);

  // Merge with initial state and defaults
  const defaultState = getDefaultSimulationFilterState();
  const mergedState = savedState
    ? mergeSimulationFilterStates(initialState || {}, savedState)
    : { ...defaultState, ...initialState, lastUpdated: Date.now() };

  // Validate the merged state
  if (!validateSimulationFilterState(mergedState)) {
    console.warn('Invalid simulation filter state, using defaults');
    return { ...defaultState, lastUpdated: Date.now() };
  }

  return mergedState;
}
