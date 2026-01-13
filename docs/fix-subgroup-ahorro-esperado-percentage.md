# Fix: Subgroup Ahorro Esperado Percentage Showing > 100%

**Branch**: `fix/subgroup-ahorro-esperado-percentage`
**Date**: 2026-01-13
**Status**: In Progress

## Problem Statement

The "Ahorro Esperado %" displayed in subgroup headers shows incorrect values that can exceed 100%, which is mathematically impossible for a percentage representing "savings as a portion of total budget."

**User's Example:**
- IT Suscripciones subgroup:
  - Efectivo (Cash): $144,697
  - Crédito (Credit): $0
  - Ahorro Esperado (Expected Savings): $80,000
  - **Current percentage displayed**: 123.65% ❌ (impossible!)
  - **Expected percentage**: 55.31% ✓ (calculated as 80,000 / 144,697)

## Root Cause Analysis

### The Math Error

The percentage is being calculated using a **net total** (after subtracting savings) as the denominator instead of the **gross total** (before subtracting savings).

**Current (Incorrect) Calculation:**
```
Step 1: Calculate net total
  total = efectivoAmount + creditoAmount - expectedSavings
  total = 144,697 + 0 - 80,000 = 64,697

Step 2: Calculate percentage
  percentage = (expectedSavings / total) × 100
  percentage = (80,000 / 64,697) × 100 = 123.65% ❌ WRONG!
```

**Expected (Correct) Calculation:**
```
Step 1: Calculate gross total
  grossTotal = efectivoAmount + creditoAmount
  grossTotal = 144,697 + 0 = 144,697

Step 2: Calculate percentage
  percentage = (expectedSavings / grossTotal) × 100
  percentage = (80,000 / 144,697) × 100 = 55.31% ✓ CORRECT!
```

### Code Analysis

#### Location 1: Subtotals Calculation

**File**: `/lib/subgroup-calculations.ts` (line 68)

```typescript
const total = efectivoAmount + creditoAmount - expectedSavings;
```

This calculates the **net available funds** after savings, which is semantically correct for displaying the "Total" column in the subtotal row. However, this net total is NOT the right denominator for the percentage calculation.

#### Location 2: Percentage Calculation

**File**: `/components/subgroup-header-row.tsx` (lines 103-106)

```typescript
const ahorroEsperadoPercentage =
  subtotals.total > 0
    ? ((subtotals.expectedSavings / subtotals.total) * 100)
    : 0;
```

This uses `subtotals.total` (which has savings subtracted) as the denominator, causing the percentage to exceed 100% when savings are a significant portion of the budget.

### The Semantic Mismatch

The `total` field in `Subtotals` serves **two different purposes**:

1. **For the Total column**: It correctly represents net spending after savings (Efectivo + Crédito - Ahorro)
2. **For percentage calculation**: It's being used incorrectly as the base for calculating savings percentage

The percentage should answer the question:
> "What percentage of our **budgeted spending** are we planning to save?"

- **Correct denominator**: Efectivo + Crédito (gross budget before savings)
- **Incorrect denominator**: Efectivo + Crédito - Ahorro (net after savings)

## Solution

### Recommended Approach: Fix Percentage Calculation Only

Change only the percentage calculation in `SubgroupHeaderRow` to use the gross total (Efectivo + Crédito) instead of the net total.

**File**: `/components/subgroup-header-row.tsx`

**Current code** (lines 103-106):
```typescript
const ahorroEsperadoPercentage =
  subtotals.total > 0
    ? ((subtotals.expectedSavings / subtotals.total) * 100)
    : 0;
```

**Fixed code**:
```typescript
const grossTotal = subtotals.efectivoAmount + subtotals.creditoAmount;
const ahorroEsperadoPercentage =
  grossTotal > 0
    ? ((subtotals.expectedSavings / grossTotal) * 100)
    : 0;
```

### Why This Approach?

✅ **Pros:**
- Minimal change (only 2 lines modified)
- Isolated to percentage display only
- Doesn't affect other components using `subtotals.total`
- No risk of breaking existing functionality
- The `total` field continues to correctly represent net spending for the Total column

❌ **Alternative approach NOT recommended:**
- Adding a `grossTotal` field to the `Subtotals` type would require changes in multiple files
- Would break existing uses of `subtotals.total` in `SubgroupSubtotalRow`
- Higher risk of introducing bugs
- More complex implementation

## Files Modified

### Primary File
- `/components/subgroup-header-row.tsx` (lines 103-106)

### Files NOT Modified (using subtotals.total correctly)
- `/components/subgroup-subtotal-row.tsx` (line 64) - Displays net total in Total column
- `/lib/subgroup-calculations.ts` (line 68) - Calculates net total for Total column

## Testing Strategy

### Test Cases

#### [ ] Test Case 1: User's Reported Issue
- **Input**:
  - Efectivo: $144,697
  - Crédito: $0
  - Ahorro Esperado: $80,000
- **Expected**: 55.31%
- **Calculation**: (80,000 / 144,697) × 100 = 55.31%

#### [ ] Test Case 2: 100% Savings (Maximum Possible)
- **Input**:
  - Efectivo: $100,000
  - Crédito: $0
  - Ahorro Esperado: $100,000
- **Expected**: 100.00%
- **Calculation**: (100,000 / 100,000) × 100 = 100%
- **Note**: This is the maximum valid percentage

#### [ ] Test Case 3: With Credit Amount
- **Input**:
  - Efectivo: $200,000
  - Crédito: $100,000
  - Ahorro Esperado: $90,000
- **Expected**: 30.00%
- **Calculation**: (90,000 / 300,000) × 100 = 30%

#### [ ] Test Case 4: Zero Savings
- **Input**:
  - Efectivo: $100,000
  - Crédito: $50,000
  - Ahorro Esperado: $0
- **Expected**: 0.00%
- **Calculation**: (0 / 150,000) × 100 = 0%

#### [ ] Test Case 5: Small Savings Percentage
- **Input**:
  - Efectivo: $1,000,000
  - Crédito: $0
  - Ahorro Esperado: $50
- **Expected**: < 0.01%
- **Calculation**: (50 / 1,000,000) × 100 = 0.005%
- **Note**: Should display as "< 0.01%" per formatting logic

### Regression Testing

#### [ ] Verify Total % (Right Side) Still Works
- The "Total %" displayed on the right side of the header
- Uses `(subtotals.total / totalIncome) × 100`
- Should continue working correctly (unaffected by this change)

#### [ ] Verify Subtotal Row Displays Correct Net Total
- The subtotal row beneath expanded subgroups
- Should display: Efectivo + Crédito - Ahorro Esperado
- Located in `/components/subgroup-subtotal-row.tsx` (line 64)
- Should remain unchanged

#### [ ] Verify No Visual Regressions
- Percentage formatting (2 decimal places)
- Display of "< 0.01%" for very small percentages
- Display of "0%" for zero savings
- Purple color and bold styling for Ahorro Esperado when > 0

## Verification Checklist

After implementation:

- [ ] Ahorro Esperado % never exceeds 100%
- [ ] Percentage formula: (Ahorro Esperado / (Efectivo + Crédito)) × 100
- [ ] User's test case (144,697 / 80,000) shows 55.31%
- [ ] 100% savings scenario shows 100%
- [ ] With credit amounts, percentage calculates correctly
- [ ] Zero savings shows 0%
- [ ] Total % (right side) continues to work
- [ ] Subtotal row continues to show net total correctly
- [ ] No console errors or warnings
- [ ] Percentage formatting works (2 decimals, "< 0.01%" for very small)

## Task Breakdown

### Phase 1: Implementation
- [x] Create detailed documentation in docs folder
- [x] Update percentage calculation in `SubgroupHeaderRow` component

### Phase 2: Manual Testing
- [ ] Test Case 1: User's example (144,697 efectivo, 80,000 ahorro) → 55.31%
- [ ] Test Case 2: 100% savings scenario
- [ ] Test Case 3: With credit amounts
- [ ] Test Case 4: Zero savings
- [ ] Test Case 5: Very small percentage

### Phase 3: Regression Testing
- [ ] Verify Total % (right side) still works correctly
- [ ] Verify subtotal row shows correct net total
- [ ] Check for console errors
- [ ] Verify formatting and visual styling

### Phase 4: Documentation
- [ ] Update this plan with test results
- [ ] Mark all tasks as complete
- [ ] Document any issues encountered

## Risk Assessment

**Risk Level**: **VERY LOW**

**Reasoning**:
- Only 2 lines of code changed
- Change is isolated to display logic only
- No database, API, or data structure changes
- No impact on calculations used elsewhere
- The `total` field continues to work correctly for other purposes

**Potential Issues**:
- None anticipated - this is a pure calculation fix

## Success Criteria

1. ✅ Ahorro Esperado % displays values between 0% and 100%
2. ✅ Formula correctly uses gross total: (Ahorro Esperado / (Efectivo + Crédito)) × 100
3. ✅ User's reported issue is fixed (123.65% → 55.31%)
4. ✅ All test cases pass
5. ✅ No regression in other features
6. ✅ No console errors or warnings

## Expected Behavior After Fix

| Scenario | Efectivo | Crédito | Ahorro | Before (Wrong) | After (Correct) |
|----------|----------|---------|--------|----------------|-----------------|
| User's case | $144,697 | $0 | $80,000 | 123.65% ❌ | 55.31% ✓ |
| Max savings | $100,000 | $0 | $100,000 | ∞% ❌ | 100.00% ✓ |
| With credit | $200,000 | $100,000 | $90,000 | 45.00% ❌ | 30.00% ✓ |
| Zero savings | $100,000 | $50,000 | $0 | 0% ✓ | 0% ✓ |

## Notes

- The fix aligns the percentage calculation with user expectations and mathematical correctness
- The `subtotals.total` field will continue to serve its purpose for displaying net spending in the Total column
- This is purely a display/calculation fix - no data persistence changes needed
- The percentage now correctly represents "What portion of my budget am I saving?" which should always be between 0% and 100%
