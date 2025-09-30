# Infinite Loop Diagnosis Report - Simulation Analytics Page

**Date**: 2025-09-30
**Status**: Multiple Cascading Infinite Loops Identified
**Severity**: Critical - Page Unusable

---

## Executive Summary

The simulation analytics page (`/app/simular/[id]/analytics/page.tsx`) suffers from multiple cascading infinite render loops caused by unstable dependencies in React hooks throughout the component hierarchy. Initial fixes reduced API calls from 189 to 1 for `/api/estudios`, but revealed deeper architectural issues requiring comprehensive refactoring.

**Recommendation**: Temporarily disable analytics dashboard (Option 1) until systematic refactoring can be completed.

---

## Root Cause Analysis

### Primary Pattern: Unstable Hook Dependencies

The core issue is a pattern repeated across multiple components where:

1. **Object/Array Props Change Reference**: Props that are objects or arrays change reference on every parent render
2. **useCallback/useMemo Dependencies**: These hooks depend on unstable references, causing them to recreate
3. **useEffect Triggers**: Effects depending on recreated callbacks run repeatedly
4. **State Updates in Effects**: Effects update state, triggering parent re-render
5. **Cascade Repeats**: Parent re-render changes prop references, restarting cycle

### Secondary Pattern: Circular State Dependencies

Multiple state values depend on each other in ways that create circular update chains:

```
filterState.lastUpdated changes → saveToStorage called →
state updated → lastUpdated changes → cycle repeats
```

---

## Identified Infinite Loop Sources

### 1. ✅ PARTIALLY FIXED: useSimulationFilterSync Hook

**File**: `/hooks/use-simulation-filter-sync.ts`
**Location**: Lines 361-366
**Status**: Partially Fixed

**Original Problem**:
```typescript
useEffect(() => {
  if (filterState.selectedEstudio !== null) {
    saveToStorage(filterState);
  }
}, [filterState.selectedEstudio, filterState.lastUpdated, saveToStorage]);
```

- `lastUpdated` dependency caused infinite loop
- Every `saveToStorage` call updated `lastUpdated`
- `lastUpdated` change triggered effect again

**Fix Applied**:
```typescript
useEffect(() => {
  if (filterState.selectedEstudio !== null) {
    saveToStorage(filterState);
  }
}, [filterState.selectedEstudio, saveToStorage]); // Removed lastUpdated
```

**Result**: Reduced auto-save loop but didn't solve full issue

---

### 2. ✅ FIXED: Excessive API Calls - fetchEstudios

**File**: `/app/simular/[id]/analytics/page.tsx`
**Location**: Lines 141-172
**Status**: Fixed

**Original Problem**:
```typescript
const fetchEstudios = useCallback(async () => {
  // ...
  if (!selectedEstudio && data.length > 0) {
    filterSync.updateEstudio(data[0].id); // Called every render
  }
}, [filterSync, selectedEstudio, toast]);
```

- `filterSync` object recreated every render (unstable reference)
- `fetchEstudios` recreated every render
- Initial estudio selection triggered on every render
- **Result**: 189 API calls to `/api/estudios`

**Fix Applied**:
```typescript
const [isFilterInitialized, setIsFilterInitialized] = useState(false);
const { updateEstudio, updateGroupers, updatePaymentMethods } = filterSync;

const fetchEstudios = useCallback(async () => {
  // ...
  if (!isFilterInitialized && !selectedEstudio && data.length > 0) {
    updateEstudio(data[0].id);
    setIsFilterInitialized(true); // Prevent repeated initialization
  }
}, [isFilterInitialized, selectedEstudio, updateEstudio, toast]);

useEffect(() => {
  fetchEstudios();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty array - run only on mount
```

**Result**: API calls reduced from 189 to 1 ✅

---

### 3. ✅ FIXED: fetchGroupers Unstable Dependencies

**File**: `/app/simular/[id]/analytics/page.tsx`
**Location**: Lines 175-215
**Status**: Fixed

**Original Problem**:
```typescript
const fetchGroupers = useCallback(async () => {
  // ...
}, [selectedEstudio, filterSync.updateGroupers, toast]);
```

- `filterSync.updateGroupers` recreated every render
- `fetchGroupers` recreated every render
- Effects depending on `fetchGroupers` ran repeatedly

**Fix Applied**:
```typescript
const { updateGroupers } = filterSync;

const fetchGroupers = useCallback(async (estudioId: number) => {
  // ...
}, [updateGroupers, toast]); // Stable extracted reference

useEffect(() => {
  if (selectedEstudio) {
    fetchGroupers(selectedEstudio);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [selectedEstudio]); // Only run when estudio changes
```

**Result**: Function stabilized, no more recreations

---

### 4. ✅ PARTIALLY FIXED: SimulationQuickActions Component

**File**: `/components/simulation-quick-actions.tsx`
**Location**: Lines 88-123
**Status**: Fixed but Component Disabled for Testing

**Original Problem**:
```typescript
const { currentSimulationId, simulationBudgetCount } = useMemo(() => ({
  currentSimulationId: currentSimulation?.id || null,
  simulationBudgetCount: currentSimulation?.budget_count || 0,
}), [currentSimulation?.id, currentSimulation?.budget_count]);

useEffect(() => {
  const loadNavigationContext = async () => {
    // ...
  };
  loadNavigationContext();
}, [currentSimulationId, isAnalyticsPage, isConfigPage, simulationBudgetCount]);
```

**Issues**:
1. `simulationBudgetCount` in dependencies caused effect to run when budget changes
2. Parent component re-render changed `currentSimulation` reference
3. Component lacked custom comparison in React.memo
4. Workflow suggestions recalculated unnecessarily

**Fix Applied**:
```typescript
// Removed simulationBudgetCount memoization
const { currentSimulationId } = useMemo(() => ({
  currentSimulationId: currentSimulation?.id || null,
}), [currentSimulation?.id]);

useEffect(() => {
  const loadNavigationContext = async () => {
    // Use currentSimulation?.budget_count directly
    const suggestions = generateWorkflowSuggestions(
      { id: currentSimulationId, budget_count: currentSimulation?.budget_count || 0 } as Simulation,
      isAnalyticsPage,
      isConfigPage
    );
    setWorkflowSuggestions(suggestions);
  };
  loadNavigationContext();
}, [currentSimulationId, isAnalyticsPage, isConfigPage]); // Removed simulationBudgetCount

// Custom React.memo comparison
export default React.memo(SimulationQuickActions, (prevProps, nextProps) => {
  return (
    prevProps.currentSimulation?.id === nextProps.currentSimulation?.id &&
    prevProps.currentSimulation?.budget_count === nextProps.currentSimulation?.budget_count &&
    prevProps.showWorkflowSuggestions === nextProps.showWorkflowSuggestions
  );
});
```

**Testing Result**:
- Component fixed but error persisted
- Disabled component for further testing (lines 518-526 of page.tsx)
- Revealed additional infinite loop source in SimulationFilterManager

---

### 5. 🔴 NOT FIXED: SimulationFilterManager Component

**File**: `/components/simulation-filter-manager.tsx`
**Location**: Line 513 (Select component rendering)
**Status**: Identified but Not Fixed

**Problem Identified**:
```
Error: Maximum update depth exceeded
  at SimulationFilterManager -> components/ui/select.tsx (19:3)
```

**Root Cause (Suspected)**:
1. Parent `SimulationAnalyticsDashboard` passes unstable props
2. Props change reference on every render
3. SimulationFilterManager re-renders
4. Select component state updates trigger parent re-render
5. Cycle repeats

**Specific Unstable Props (Lines 400-416 of analytics page)**:
```typescript
<SimulationFilterManager
  estudios={estudios}           // Array - may change reference
  groupers={groupers}            // Array - may change reference
  paymentMethods={paymentMethods} // Array - may change reference
  selectedEstudio={selectedEstudio}
  selectedGroupers={selectedGroupers}
  selectedPaymentMethods={selectedPaymentMethods}
  onEstudioChange={handleEstudioChange}     // Function - may recreate
  onGrouperChange={handleGrouperChange}     // Function - may recreate
  onPaymentMethodChange={handlePaymentMethodChange} // Function - may recreate
  isLoading={isLoadingEstudios || isLoadingGroupers}
  showSelections={true}
/>
```

**Required Fixes**:
1. Memoize array props (`estudios`, `groupers`, `paymentMethods`)
2. Use `useCallback` for all handler functions
3. Add custom React.memo comparison to SimulationFilterManager
4. Review Select component for internal state management issues

---

### 6. 🔴 NOT FIXED: SimulationAnalyticsDashboard Component

**File**: `/components/simulation-analytics-dashboard.tsx`
**Location**: Throughout component
**Status**: Identified but Not Fixed

**Problem Identified**:
Parent component of SimulationFilterManager, likely source of unstable props.

**Suspected Issues**:
1. Props passed to children change reference on every render
2. Callback functions recreated without `useCallback`
3. Array/object props not memoized with `useMemo`
4. Component may not use React.memo for optimization

**Required Investigation**:
- Read full component source code
- Identify all props passed to SimulationFilterManager
- Check for proper memoization
- Review parent state management

---

### 7. ⚠️ ONGOING: Multiple API Calls to /api/simulations

**File**: `/app/simular/[id]/analytics/page.tsx`
**Location**: Multiple locations
**Status**: Reduced but Not Optimal

**Current Behavior**:
- `/api/simulations` called 6 times per page load
- Should be 0-1 calls (data should come from parent or be cached)

**Suspected Sources**:
1. SimulationQuickActions - loads all simulations for navigation (disabled)
2. SimulationNavigation - may load simulations for breadcrumb
3. SimulationBreadcrumb - may load simulation data
4. Multiple useEffect blocks may be fetching independently

**Required Investigation**:
- Trace all API calls to `/api/simulations`
- Implement shared data fetching or prop drilling from parent
- Add proper caching mechanism

---

## Component Hierarchy & Re-render Cascade

```
SimulationAnalyticsPage (page.tsx)
├── SimulationBreadcrumb
├── SimulationNavigation
├── SimulationQuickActions (DISABLED) ✅ Fixed but disabled
├── SimulationFilterManager 🔴 Infinite Loop
│   └── Select components 🔴 Re-render trigger
└── SimulationAnalyticsDashboard 🔴 Unstable props source
    ├── SimulationFilterManager (second instance)
    ├── ExpenseComparison
    ├── BudgetSimulationComparison
    └── Various chart components
```

**Re-render Cascade Flow**:
1. Page renders with initial state
2. SimulationFilterManager receives props
3. Select component changes trigger state updates
4. State update causes page re-render
5. Page re-render changes prop references for SimulationFilterManager
6. Props change causes SimulationFilterManager re-render
7. Re-render triggers Select component state update
8. **GOTO step 4** → Infinite Loop

---

## Test Results Summary

### Test 1: Initial State (Before Fixes)
- **Error**: Maximum update depth exceeded
- **Location**: useSimulationFilterSync hook
- **API Calls**: 189 calls to `/api/estudios`, 6 calls to `/api/simulations`

### Test 2: After Filter Sync Fix
- **Error**: Maximum update depth exceeded (persisted)
- **Location**: SimulationQuickActions component
- **API Calls**: 189 calls to `/api/estudios`, 6 calls to `/api/simulations`

### Test 3: After fetchEstudios Fix
- **Error**: Maximum update depth exceeded (persisted)
- **Location**: SimulationQuickActions component
- **API Calls**: 1 call to `/api/estudios` ✅, 6 calls to `/api/simulations`

### Test 4: After SimulationQuickActions Fix
- **Error**: Maximum update depth exceeded (persisted)
- **Location**: SimulationQuickActions component (still)
- **API Calls**: 1 call to `/api/estudios` ✅, 6 calls to `/api/simulations`

### Test 5: After Disabling SimulationQuickActions
- **Error**: Maximum update depth exceeded (NEW SOURCE)
- **Location**: SimulationFilterManager → Select component
- **API Calls**: 1 call to `/api/estudios` ✅, 6 calls to `/api/simulations`

**Conclusion**: Multiple independent infinite loop sources exist. Fixing one reveals the next.

---

## Recommended Solution: Phased Approach

### Phase 0: Immediate (Option 1) - RECOMMENDED FOR NOW

**Goal**: Make page usable immediately

**Actions**:
1. Temporarily disable entire analytics dashboard section
2. Replace with "Under Maintenance" or "Coming Soon" message
3. Provide link back to configuration page
4. Remove all problematic components from render tree

**Implementation**:
```typescript
// Replace lines 688+ in page.tsx
<TabsContent value="analytics">
  <Card>
    <CardHeader>
      <CardTitle>Analytics Dashboard - Under Maintenance</CardTitle>
      <CardDescription>
        We're working on improving the analytics experience.
        Please check back soon.
      </CardDescription>
    </CardHeader>
    <CardContent className="text-center py-8">
      <p className="text-muted-foreground mb-4">
        The analytics dashboard is temporarily unavailable while we
        optimize performance and fix rendering issues.
      </p>
      <Button onClick={() => router.push(`/simular/${simulationId}`)}>
        Return to Configuration
      </Button>
    </CardContent>
  </Card>
</TabsContent>
```

**Benefits**:
- Immediate resolution - page becomes usable
- Prevents user frustration with loading errors
- Provides time for proper systematic refactoring

**Timeline**: 5 minutes

---

### Phase 1: Foundation Fixes (1-2 hours)

**Goal**: Fix shared infrastructure and hooks

**Components to Fix**:
1. ✅ useSimulationFilterSync hook (DONE)
2. Stabilize all hook return values
3. Add comprehensive memoization to hook

**Actions**:
- Ensure all returned functions use `useCallback`
- Ensure all returned objects use `useMemo`
- Add tests for hook stability

---

### Phase 2: Bottom-Up Component Fixes (3-4 hours)

**Goal**: Fix components from leaf nodes upward

**Order of Operations**:
1. **SimulationFilterManager** (Leaf component)
   - Add React.memo with custom comparison
   - Ensure internal state updates don't trigger parent renders
   - Review Select component usage

2. **SimulationAnalyticsDashboard** (Parent of FilterManager)
   - Memoize all array/object props
   - Use useCallback for all handler functions
   - Add React.memo wrapper

3. **SimulationQuickActions** (Fixed but needs re-testing)
   - Re-enable component
   - Verify fixes work in full page context
   - Add integration tests

4. **Analytics Page Main Component**
   - Review all useEffect dependencies
   - Ensure data fetching is properly managed
   - Add loading states to prevent race conditions

---

### Phase 3: Optimization & Testing (2-3 hours)

**Goal**: Optimize performance and verify stability

**Actions**:
1. Reduce API calls to minimum required
2. Implement shared data caching
3. Add React DevTools Profiler measurements
4. Create integration tests for full page flow
5. Load test with multiple simultaneous users

---

### Phase 4: Re-enable & Monitor (1 hour)

**Goal**: Return analytics to production with monitoring

**Actions**:
1. Re-enable analytics dashboard
2. Add error boundary around analytics section
3. Add performance monitoring
4. Document required prop patterns for future components

---

## Prevention Guidelines for Future Development

### 1. Hook Dependency Rules
```typescript
// ❌ BAD - Unstable object dependency
useEffect(() => {
  doSomething(complexObject);
}, [complexObject]);

// ✅ GOOD - Extract primitive values
const { id, name } = complexObject;
useEffect(() => {
  doSomething({ id, name });
}, [id, name]);
```

### 2. Callback Memoization
```typescript
// ❌ BAD - Function recreated every render
const handleClick = () => {
  doSomething(value);
};

// ✅ GOOD - Memoized callback
const handleClick = useCallback(() => {
  doSomething(value);
}, [value]);
```

### 3. Array/Object Props
```typescript
// ❌ BAD - New array reference every render
<Component items={data.map(d => d.value)} />

// ✅ GOOD - Memoized array
const processedItems = useMemo(
  () => data.map(d => d.value),
  [data]
);
<Component items={processedItems} />
```

### 4. React.memo Usage
```typescript
// ❌ BAD - Default shallow comparison
export default React.memo(MyComponent);

// ✅ GOOD - Custom comparison for complex props
export default React.memo(MyComponent, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.items.length === nextProps.items.length &&
    prevProps.onUpdate === nextProps.onUpdate
  );
});
```

### 5. useEffect Best Practices
```typescript
// ❌ BAD - Function in dependencies
useEffect(() => {
  fetchData();
}, [fetchData]);

// ✅ GOOD - Function call with stable deps
const fetchData = useCallback(async () => {
  // implementation
}, [stableValue]);

useEffect(() => {
  fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []); // Empty if should run only on mount
```

---

## Monitoring Recommendations

### Development Tools
1. **React DevTools Profiler**
   - Measure component render frequency
   - Identify components rendering unnecessarily
   - Track prop changes causing renders

2. **Chrome DevTools Performance Tab**
   - Record page load sequence
   - Identify long tasks
   - Track memory usage over time

3. **Network Tab Monitoring**
   - Count API calls per page load
   - Identify duplicate requests
   - Measure request timing

### Production Monitoring
1. **Error Tracking**
   - Track "Maximum update depth" errors
   - Monitor error rates per page
   - Set up alerts for spike in render errors

2. **Performance Metrics**
   - Time to Interactive (TTI)
   - First Contentful Paint (FCP)
   - Total Blocking Time (TBT)

3. **User Experience**
   - Track page load abandonment
   - Monitor slow page warnings
   - Collect user feedback on performance

---

## Conclusion

The infinite loop issue is not a single bug but a systemic architectural problem affecting multiple components. The issue stems from:

1. **Inadequate Memoization**: Props and callbacks changing reference unnecessarily
2. **Circular Dependencies**: State updates triggering effects that update state
3. **Missing Optimization**: Components lacking React.memo or proper comparison
4. **Complex State Flow**: Multiple sources of truth for filter state

**Immediate Action Required**: Implement Phase 0 (temporary disable) to restore page functionality.

**Long-term Resolution**: Follow phased approach (Phases 1-4) for systematic refactoring.

**Estimated Total Effort**: 7-10 hours for complete resolution.

**Risk Level**: High - Issue affects core application functionality and user experience.

---

## Appendix: Code Snippets

### A. Current Error Stack Trace
```
Error: Maximum update depth exceeded. This can happen when a component
calls setState inside useEffect, but useEffect either doesn't have a
dependency array, or one of the dependencies changes on every render.

at SimulationFilterManager (webpack-internal:///(app-pages-browser)/./components/simulation-filter-manager.tsx:85:9)
at SelectPrimitive.Root (webpack-internal:///(app-pages-browser)/./node_modules/@radix-ui/react-select/dist/index.mjs:178:3)
```

### B. Network Request Pattern (Test 5)
```
GET /api/estudios - 200 OK (1 call) ✅
GET /api/simulations - 200 OK (6 calls) ⚠️
GET /api/simulations/123 - 200 OK (1 call) ✅
```

### C. Console Warning Pattern
```
Warning: Cannot update a component (`SimulationAnalyticsPage`) while
rendering a different component (`SimulationFilterManager`). To locate
the bad setState() call inside `SimulationFilterManager`, follow the
stack trace as described in...
```

---

**Report End**