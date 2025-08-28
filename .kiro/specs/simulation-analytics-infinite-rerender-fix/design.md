# Design Document

## Overview

The simulation analytics infinite re-render issue is caused by several anti-patterns in React component design:

1. **Unstable useEffect dependencies** - Objects and functions being recreated on every render
2. **Cascading state updates** - Filter changes triggering multiple state updates in sequence
3. **Improper memoization** - Complex objects not being properly memoized
4. **Circular dependencies** - Components updating each other's state in loops

The solution involves stabilizing component dependencies, implementing proper memoization, and restructuring the filter state management to prevent cascading updates.

## Architecture

### Component Hierarchy Stabilization

```
SimulationAnalyticsPage
├── SimulationAnalyticsDashboard (stabilized)
│   ├── SimulationFilterManager (refactored)
│   │   ├── EstudioFilter (stable callbacks)
│   │   ├── AgrupadorFilter (stable callbacks)
│   │   └── PaymentMethodFilter (stable callbacks)
│   └── Chart Components (memoized)
└── Other UI Components
```

### State Management Flow

```
User Action → Filter Change → Debounced Update → Single API Call → UI Update
```

Instead of:

```
User Action → Multiple State Updates → Multiple useEffect Triggers → Infinite Loop
```

## Components and Interfaces

### 1. SimulationAnalyticsDashboard Stabilization

**Issues to Fix:**

- `fetchAnalyticsData` callback recreated on every render
- `useEffect` dependencies include unstable objects
- Filter state changes trigger multiple re-renders

**Solutions:**

- Use `useCallback` with stable dependencies for all callback functions
- Implement proper dependency arrays for `useEffect` hooks
- Add debouncing for filter changes
- Use `useMemo` for complex computed values

### 2. Filter State Management Refactor

**Current Problem:**

```typescript
// This causes infinite loops
useEffect(() => {
  if (selectedEstudio) {
    fetchAnalyticsData();
  }
}, [fetchAnalyticsData, selectedEstudio]); // fetchAnalyticsData changes every render
```

**Solution:**

```typescript
// Stable callback with proper dependencies
const fetchAnalyticsData = useCallback(async () => {
  // Implementation
}, [
  simulationId,
  selectedEstudio,
  selectedGroupers,
  selectedPaymentMethods,
  comparisonPeriods,
]);

// Debounced effect
useEffect(() => {
  const timeoutId = setTimeout(() => {
    if (selectedEstudio) {
      fetchAnalyticsData();
    }
  }, 300);

  return () => clearTimeout(timeoutId);
}, [selectedEstudio, fetchAnalyticsData]);
```

### 3. SimulationFilterManager Optimization

**Issues:**

- Filter change handlers recreated on every render
- State persistence causing additional renders
- Complex filter state objects not memoized

**Solutions:**

- Implement stable callback references using `useCallback`
- Batch filter state updates
- Optimize filter persistence to avoid triggering renders
- Use `React.memo` for filter components

### 4. Custom Hook for Filter Management

Create a custom hook to encapsulate filter logic:

```typescript
function useSimulationFilters(simulationId: number, options: FilterOptions) {
  const [filterState, setFilterState] = useState(defaultState);

  const updateFilters = useCallback((updates: Partial<FilterState>) => {
    setFilterState((prev) => ({ ...prev, ...updates }));
  }, []);

  const debouncedFilterState = useDebounce(filterState, 300);

  return {
    filterState: debouncedFilterState,
    updateFilters,
    resetFilters: useCallback(() => setFilterState(defaultState), []),
  };
}
```

## Data Models

### FilterState Interface

```typescript
interface StableFilterState {
  selectedEstudio: number | null;
  selectedGroupers: number[];
  selectedPaymentMethods: string[];
  comparisonPeriods: number;
  lastUpdated: number; // For change detection
}
```

### Component Props Optimization

```typescript
interface OptimizedAnalyticsDashboardProps {
  simulationId: number;
  simulationName?: string;
  activePeriod?: ActivePeriod | null;
  // Remove unstable props that cause re-renders
}
```

## Error Handling

### 1. Render Error Boundaries

- Wrap analytics components in error boundaries
- Provide fallback UI when infinite loops are detected
- Log detailed error information for debugging

### 2. State Update Guards

```typescript
const safeSetState = useCallback(
  (newState: State) => {
    if (!isEqual(currentState, newState)) {
      setState(newState);
    }
  },
  [currentState]
);
```

### 3. useEffect Cleanup

```typescript
useEffect(() => {
  let isMounted = true;

  const fetchData = async () => {
    const data = await api.getData();
    if (isMounted) {
      setData(data);
    }
  };

  fetchData();

  return () => {
    isMounted = false;
  };
}, [dependencies]);
```

## Testing Strategy

### 1. Re-render Detection Tests

- Test that components don't re-render unnecessarily
- Verify useEffect hooks don't trigger infinite loops
- Check that filter changes cause exactly one re-render

### 2. Performance Tests

- Measure render count for filter changes
- Test with large datasets to ensure stability
- Verify memory usage doesn't grow over time

### 3. Integration Tests

- Test complete user workflows without errors
- Verify all analytics features work after fixes
- Test error recovery scenarios

### 4. Debugging Tools

- Add render counting in development
- Implement useEffect dependency tracking
- Create performance monitoring hooks

## Implementation Approach

### Phase 1: Stabilize Core Components

1. Fix SimulationAnalyticsDashboard useEffect dependencies
2. Implement proper useCallback for all event handlers
3. Add React.memo to prevent unnecessary re-renders

### Phase 2: Refactor Filter Management

1. Create stable filter state management
2. Implement debouncing for filter changes
3. Optimize filter persistence logic

### Phase 3: Add Safeguards

1. Implement error boundaries
2. Add render loop detection
3. Create development debugging tools

### Phase 4: Performance Optimization

1. Optimize memoization strategies
2. Implement lazy loading for heavy components
3. Add performance monitoring

## Key Design Decisions

### 1. Debouncing Strategy

- Use 300ms debounce for filter changes
- Immediate updates for critical state changes
- Cancel pending updates on component unmount

### 2. Memoization Strategy

- Use React.memo for pure components
- useMemo for expensive computations
- useCallback for event handlers and API calls

### 3. State Management

- Keep filter state local to avoid prop drilling
- Use context only for truly global state
- Implement proper state normalization

### 4. Error Recovery

- Graceful degradation when errors occur
- Automatic retry mechanisms for transient issues
- Clear error messages for users
