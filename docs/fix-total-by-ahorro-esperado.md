# Fix: Total Column Not Reflecting Ahorro Esperado (Expected Savings)

**Branch**: `fix/total-by-ahorro-esperado`
**Date**: 2026-01-13
**Status**: Planning

## Problem Statement

When a user enters a value in the "Ahorro Esperado" (Expected Savings) column in the simulation budget form, the "Total" column does not update to reflect the savings deduction.

**Example from user:**
- Category: "mercado"
- Efectivo: $2,000,000
- Crédito: $0
- Ahorro Esperado: $500,000
- **Current Total**: $2,000,000 ❌ (incorrect)
- **Expected Total**: $1,500,000 ✓ (should be Efectivo + Crédito - Ahorro Esperado)

## Root Cause Analysis

### Current Implementation

The `getCategoryTotal()` function (lines 1117-1124 in `simulation-budget-form.tsx`) calculates:

```typescript
const getCategoryTotal = (categoryId: string | number): number => {
  const data = budgetData[String(categoryId)];
  if (!data) return 0;

  const efectivo = parseFloat(data.efectivo_amount) || 0;
  const credito = parseFloat(data.credito_amount) || 0;
  return efectivo + credito;  // ❌ Missing expected_savings subtraction
};
```

**Issue**: The function only adds `Efectivo + Crédito`, completely ignoring the `expected_savings` field.

### Correct Formula (Already Used Elsewhere)

The application already correctly calculates net spend with savings in multiple places:

1. **Balance calculations** (lines 1278-1281):
   ```typescript
   const netSpend = efectivoAmount - expectedSavings;
   ```

2. **Subgroup subtotals** (`lib/subgroup-calculations.ts`, line 68):
   ```typescript
   const total = efectivoAmount + creditoAmount - expectedSavings;
   ```

3. **Totals summary** (lines 1105):
   ```typescript
   const totalNetSpend = totalEfectivo - totalExpectedSavings;
   ```

## Implementation Plan

### Files to Modify

1. **Primary file**: `/components/simulation-budget-form.tsx`
   - Update `getCategoryTotal()` function (lines 1117-1124)
   - Update `totals.general` calculation (line 1102)

### Changes Required

#### Change 1: Update `getCategoryTotal()` Function

**Location**: Lines 1117-1124

**Current code**:
```typescript
const getCategoryTotal = (categoryId: string | number): number => {
  const data = budgetData[String(categoryId)];
  if (!data) return 0;

  const efectivo = parseFloat(data.efectivo_amount) || 0;
  const credito = parseFloat(data.credito_amount) || 0;
  return efectivo + credito;
};
```

**Updated code**:
```typescript
const getCategoryTotal = (categoryId: string | number): number => {
  const data = budgetData[String(categoryId)];
  if (!data) return 0;

  const efectivo = parseFloat(data.efectivo_amount) || 0;
  const credito = parseFloat(data.credito_amount) || 0;
  const expectedSavings = parseFloat(data.expected_savings) || 0;
  return efectivo + credito - expectedSavings;
};
```

**Impact**: This change will correctly update the Total column in all category rows to reflect: `Efectivo + Crédito - Ahorro Esperado`

#### Change 2: Update `totals.general` Calculation

**Location**: Line 1102

**Current code**:
```typescript
totalGeneral += efectivo + credito;
```

**Updated code**:
```typescript
totalGeneral += efectivo + credito - expectedSavings;
```

**Impact**: This change ensures the "Total General" summary card also correctly reflects the net total after savings.

### Areas Affected

1. **Individual category rows** (rendered at lines 2459-2469)
   - The Total column will now show the correct net amount after savings

2. **Total General summary card** (displayed at lines 1867)
   - Will show the correct aggregate total across all categories

3. **Subgroup subtotal rows** (already correct)
   - These already use `calculateSubgroupSubtotals()` which has the correct formula
   - No changes needed

4. **Balance calculations** (already correct)
   - These already use the correct net spend formula
   - No changes needed

### Testing Strategy

#### Manual Testing

1. **Test Case 1: Basic Calculation**
   - Navigate to simulation budget form
   - Enter values:
     - Efectivo: $2,000,000
     - Crédito: $0
     - Ahorro Esperado: $500,000
   - **Expected**: Total shows $1,500,000
   - **Verify**: Balance column updates correctly

2. **Test Case 2: With Credit Amount**
   - Enter values:
     - Efectivo: $2,000,000
     - Crédito: $500,000
     - Ahorro Esperado: $300,000
   - **Expected**: Total shows $2,200,000 (2M + 500k - 300k)

3. **Test Case 3: Zero Savings**
   - Enter values:
     - Efectivo: $1,000,000
     - Crédito: $200,000
     - Ahorro Esperado: $0
   - **Expected**: Total shows $1,200,000

4. **Test Case 4: Savings Equal to Efectivo**
   - Enter values:
     - Efectivo: $1,000,000
     - Crédito: $0
     - Ahorro Esperado: $1,000,000
   - **Expected**: Total shows $0

5. **Test Case 5: Subgroup Subtotals**
   - Create a subgroup with multiple categories
   - Add expected savings to some categories
   - **Verify**: Subgroup subtotal row correctly reflects net totals
   - **Verify**: Individual category totals match subgroup subtotal sum

6. **Test Case 6: Total General Card**
   - Add expected savings across multiple categories
   - **Verify**: "Total General" summary card shows correct aggregate
   - **Verify**: Matches sum of all individual category totals

7. **Test Case 7: Balance Calculations**
   - Verify running balance calculations still work correctly
   - **Verify**: Balance column reflects cumulative net spend

#### Edge Cases

1. **Negative total**: If expected_savings > (efectivo + credito)
   - Should display negative total (already constrained in UI but test anyway)

2. **Empty/undefined values**: Ensure parseFloat handles missing fields
   - Should default to 0 (already implemented with `|| 0`)

3. **Very large numbers**: Test with amounts > 1 billion
   - Verify no overflow or precision issues

### Verification Checklist

After implementation, verify:

- [ ] Total column updates immediately when Ahorro Esperado value changes
- [ ] Total column formula: `Efectivo + Crédito - Ahorro Esperado`
- [ ] Total General summary card shows correct aggregate
- [ ] Subgroup subtotals remain correct (should already be correct)
- [ ] Balance calculations remain correct (should already be correct)
- [ ] No console errors or warnings
- [ ] Purple highlighting on Ahorro Esperado column still works when value > 0
- [ ] Constraint preventing Ahorro Esperado > Efectivo still works
- [ ] Auto-save functionality still works correctly
- [ ] Excel export reflects correct totals (if applicable)

## Task Breakdown

### Phase 1: Implementation
- [x] Update `getCategoryTotal()` function to include expected_savings subtraction
- [x] Update `totals.general` calculation to include expected_savings subtraction

### Phase 2: Testing
- [ ] Test Case 1: Basic calculation (Efectivo - Ahorro = Total)
- [ ] Test Case 2: With credit amount
- [ ] Test Case 3: Zero savings
- [ ] Test Case 4: Savings equal to Efectivo
- [ ] Test Case 5: Subgroup subtotals verification
- [ ] Test Case 6: Total General card verification
- [ ] Test Case 7: Balance calculations verification
- [ ] Edge case: Negative totals
- [ ] Edge case: Empty/undefined values
- [ ] Edge case: Very large numbers

### Phase 3: Verification
- [ ] Run through complete verification checklist
- [ ] Check for console errors
- [ ] Verify all existing features still work
- [ ] Test auto-save functionality
- [ ] Review UI for any visual regressions

### Phase 4: Documentation
- [ ] Update this plan with test results
- [ ] Mark all tasks as complete
- [ ] Document any issues encountered
- [ ] Note any additional changes made

## Risk Assessment

**Risk Level**: LOW

**Reasoning**:
- Small, focused change (2 lines of code)
- Consistent with existing patterns in the codebase
- No database schema changes required
- No new dependencies
- Isolated to calculation logic only

**Potential Issues**:
1. **Backward compatibility**: Existing simulations should work without issues since we're just fixing a calculation
2. **UI refresh**: Should update automatically via React state, but verify no manual refresh needed
3. **Performance**: No impact expected (same calculation complexity)

## Success Criteria

1. ✅ Total column displays: `Efectivo + Crédito - Ahorro Esperado`
2. ✅ Total General summary card shows correct aggregate
3. ✅ All existing features continue to work
4. ✅ No console errors or warnings
5. ✅ All test cases pass
6. ✅ Code is consistent with existing patterns

## Notes

- The fix aligns the `getCategoryTotal()` function with the calculation pattern already used in balance calculations and subgroup subtotals
- The `expected_savings` field is already available in the `budgetData` object, so no data fetching changes needed
- The UI input for Ahorro Esperado already has proper constraints (cannot exceed Efectivo amount)
- This is purely a calculation fix - no UI component changes required beyond the automatic re-render
