# Tipo Gasto Sorting Improvements - Plan

**Branch:** `tipo-gasto-sim-improvements`
**Date:** 2025-11-05

## Overview
Modify the Tipo Gasto column sorting behavior in the simulation budget form to use a custom 3-cycle pattern instead of standard ascending/descending sorting.

## Current Behavior
- **1st click:** Sorts records A-Z (ascending)
- **2nd click:** Sorts records Z-A (descending)
- **3rd click:** Resets to default (alphabetical by category name)

## Desired Behavior
- **1st click:** Groups and orders records: Fijo (F) → Semi-Fijo (SF) → Variable (V) → Eventual (E)
- **2nd click:** Groups and orders records: Variable (V) → Semi-Fijo (SF) → Fijo (F) → Eventual (E)
- **3rd click:** Resets to default (alphabetical by category name, no sorting)

## Implementation Plan

### Task 1: Define Sort Order Constants
**File:** `/types/funds.ts`
- [ ] Add a constant that defines the custom sort order mapping for tipo_gasto values
- Example: `TIPO_GASTO_SORT_ORDERS` with different ordering sequences

### Task 2: Create Custom Sorting Logic
**File:** `/components/simulation-budget-form.tsx`
- [ ] Create a new helper function `getTipoGastoSortValue()` that maps tipo_gasto values to numeric sort keys
- [ ] This function will change behavior based on the current sort state
- Function signature: `getTipoGastoSortValue(tipoGasto: TipoGasto, sortState: number): number`

### Task 3: Update Sort State Management
**File:** `/components/simulation-budget-form.tsx`
- [ ] Modify the sort state to track custom Tipo Gasto sort cycles
- [ ] Convert `sortDirection` from "asc"/"desc" to support custom states (0, 1, 2)
- [ ] States: 0 = none, 1 = Fijo first, 2 = Variable first

### Task 4: Update Sort Click Handler
**File:** `/components/simulation-budget-form.tsx`
- [ ] Modify `handleSortClick` function to cycle through custom sort states (0 → 1 → 2 → 0)
- [ ] Only affect Tipo Gasto column behavior
- [ ] Preserve existing category_name sorting behavior

### Task 5: Update Sorting Logic
**File:** `/components/simulation-budget-form.tsx`
- [ ] Modify `getSortedCategories` memoized selector
- [ ] Implement custom sorting using the new helper function
- [ ] Maintain performance with memoization

### Task 6: Add Visual Indicator Updates
**File:** `/components/simulation-budget-form.tsx`
- [ ] Update the ArrowUpDown icon display logic
- [ ] Consider adding additional visual indicators for different sort states
- [ ] Update icon styling if needed to differentiate between sort cycles

### Task 7: Test Implementation
**Testing Coverage:**
- [ ] Verify 1st click shows Fijo → Semi-Fijo → Variable → Eventual order
- [ ] Verify 2nd click shows Variable → Semi-Fijo → Fijo → Eventual order
- [ ] Verify 3rd click resets to default alphabetical order
- [ ] Verify category_name sorting still works independently
- [ ] Verify sorting persists when filtering or changing periods
- [ ] Test with categories that have undefined tipo_gasto values

### Task 8: Update Documentation
**File:** `/CLAUDE.md`
- [ ] Add notes about the custom Tipo Gasto sorting behavior
- [ ] Document the implementation pattern for reference

## Implementation Details

### Sort Order Mapping
```
State 1 (Fijo First):
  F (Fijo) → 1
  SF (Semi-Fijo) → 2
  V (Variable) → 3
  E (Eventual) → 4
  null/undefined → 5

State 2 (Variable First):
  V (Variable) → 1
  SF (Semi-Fijo) → 2
  F (Fijo) → 3
  E (Eventual) → 4
  null/undefined → 5
```

### Files to Modify
1. `/types/funds.ts` - Add constants
2. `/components/simulation-budget-form.tsx` - Update sorting logic and state management

### Testing Files
- Manual testing in the simulation budget form
- No new test files required initially (can add Jest tests if needed)

## Success Criteria
- ✅ Clicking Tipo Gasto header cycles through 3 states
- ✅ Each state applies the correct sort order
- ✅ Third click returns to default (no sort)
- ✅ Visual indicator updates appropriately
- ✅ No performance degradation
- ✅ Category name sorting unaffected

## Timeline Estimate
- Task 1: 5 minutes
- Task 2: 10 minutes
- Task 3: 10 minutes
- Task 4: 10 minutes
- Task 5: 15 minutes
- Task 6: 10 minutes
- Task 7: 15 minutes
- Task 8: 5 minutes

**Total Estimated Time: ~80 minutes**
