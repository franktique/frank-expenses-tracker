# Filter State Persistence Test

## Test Scenario: Filter State Persistence Across Tabs

### Setup

1. Navigate to Dashboard Agrupadores
2. Ensure there are multiple agrupadores available
3. Ensure there are multiple tabs available (Vista Actual, Comparación por Períodos, Acumulado Semanal)

### Test Steps

#### Test 1: Basic Filter Persistence

1. **Initial State**: All agrupadores should be selected by default
2. **Action**: Select only 2-3 specific agrupadores in the filter
3. **Action**: Switch to "Comparación por Períodos" tab
4. **Expected**: The same 2-3 agrupadores should remain selected
5. **Action**: Switch to "Acumulado Semanal" tab
6. **Expected**: The same 2-3 agrupadores should remain selected
7. **Action**: Switch back to "Vista Actual" tab
8. **Expected**: The same 2-3 agrupadores should remain selected

#### Test 2: Budget Toggle Persistence

1. **Action**: In "Vista Actual" tab, enable the "Mostrar Presupuestos" toggle
2. **Expected**: Budget data should be displayed alongside expense data
3. **Action**: Switch to "Comparación por Períodos" tab
4. **Expected**: Budget toggle should remain enabled and budget data should be shown
5. **Action**: Switch to "Acumulado Semanal" tab
6. **Expected**: Budget toggle should not be visible (as it's not supported in this view)
7. **Action**: Switch back to "Vista Actual" tab
8. **Expected**: Budget toggle should remain enabled and budget data should be shown

#### Test 3: Combined Filter and Budget State Persistence

1. **Action**: Select specific agrupadores (e.g., 2 out of 5)
2. **Action**: Enable budget toggle in "Vista Actual"
3. **Action**: Switch to "Comparación por Períodos"
4. **Expected**: Both filter selection and budget toggle should persist
5. **Action**: Change payment method filter to "Efectivo"
6. **Action**: Switch back to "Vista Actual"
7. **Expected**: Agrupador filter, budget toggle, and payment method should all persist

#### Test 4: Data Refresh on Tab Switch

1. **Action**: Apply filters in "Vista Actual"
2. **Action**: Switch to "Comparación por Períodos"
3. **Expected**: Loading state should appear briefly while data is fetched with the applied filters
4. **Expected**: Chart should display data only for the selected agrupadores
5. **Action**: Switch back to "Vista Actual"
6. **Expected**: No loading state should appear if data is already cached with the same filters

### Expected Behavior

#### Filter State Synchronization

- ✅ Selected agrupadores persist across all tabs
- ✅ Budget toggle state persists between "Vista Actual" and "Comparación por Períodos"
- ✅ Payment method filter persists across all tabs
- ✅ Filter changes trigger appropriate data refresh for the active tab

#### Data Loading Behavior

- ✅ Switching tabs shows loading state only when data needs to be refetched
- ✅ Filter changes immediately show loading state for better UX
- ✅ Data is properly filtered according to the current filter state

#### UI State Management

- ✅ Filter controls remain accessible during loading states
- ✅ Current filter selections are always visible in the UI
- ✅ Budget toggle is only shown for supported tabs

### Implementation Details

The implementation uses:

1. **Filter State Tracking**: `lastFilterState` object tracks filter state per tab
2. **Smart Data Fetching**: useEffect hooks check for filter state changes before refetching
3. **Tab Change Handler**: `handleTabChange` ensures proper state synchronization
4. **Loading State Management**: Appropriate loading states are set when switching tabs or changing filters

### Requirements Satisfied

- ✅ Requirement 1.6: Filter selections persist when switching tabs
- ✅ Requirement 5.4: Filter and budget display settings are maintained across tabs
- ✅ Requirement 5.5: Filter state synchronization between different chart views
