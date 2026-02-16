# Fix Subgroup Header Column Alignment

**Branch**: `fix/subgroup-header-column-alignment`

**Date**: 2025-11-07

## Issue Description

In the simulation form, the subgroup headers have misaligned columns for totals:

- "Ahorro Esperado" value is displayed under the "Total" column instead of "Ahorro Esperado" column
- "Total" value is displayed under the "Balance" column instead of "Total" column
- The "Balance" column should remain empty with a dash "-" (as it already is in the subtotal rows)

## Current Column Structure

The table has the following columns:

1. Drag Handle (w-8)
2. Expand/Collapse Icon (w-8)
3. Categoría (Category Name)
4. Tipo Gasto
5. **Efectivo** (Cash/Direct)
6. **Crédito** (Credit)
7. **Ahorro Esperado** (Expected Savings)
8. **Total**
9. **Balance**
10. Actions (w-8)

## Root Cause Analysis

After comparing `SubgroupHeaderRow` and `SubgroupSubtotalRow`:

**SubgroupSubtotalRow cell structure (CORRECT):**

1. Empty cell for drag handle (w-8)
2. "Subtotal:" label (takes up Name + Tipo Gasto columns)
3. "-" for Tipo Gasto column
4. Efectivo value ✓
5. Crédito value ✓
6. Expected Savings value ✓
7. Total value ✓
8. Balance value (shows balance, not "-")
9. Empty cell for actions

**SubgroupHeaderRow cell structure (INCORRECT):**

1. Drag Handle icon (w-8)
2. Expand/Collapse button (w-8) ← **EXTRA CELL** that shouldn't be here
3. Sub-group Name
4. Tipo Gasto ("-")
5. Efectivo value ✓
6. Crédito value ✓
7. Expected Savings value ← **MISALIGNED** (shifted right by the extra expand/collapse cell)
8. Total value ← **MISALIGNED** (shifted right by the extra expand/collapse cell)
9. Balance ("-")
10. Actions

## The Fix

The `SubgroupHeaderRow` should NOT have the Expand/Collapse button in its own TableCell. Instead:

- The expand/collapse button should be part of the Name cell (like how "Subtotal:" works in the subtotal row)
- This will align all columns correctly with the subtotal row below it

Alternatively:

- Move the expand/collapse button inside the Name cell as a flex container
- Remove the separate TableCell for it

## Implementation Steps

1. [x] Move Expand/Collapse button inside the Name cell (combine 2 cells into 1)
2. [x] Update TableCell structure to match `SubgroupSubtotalRow` layout
3. [x] Test that all columns align correctly with headers and subtotal rows
4. [x] Verify visual appearance on different screen sizes

## Verification Results

**Date**: 2025-11-07
**Simulation**: "Tipico Mes 2026" (100 categories with sub-groups)

### Column Alignment Check

**Sub-group Header Row (Servicios):**

```
Categoría | Tipo Gasto | Efectivo   | Crédito | Ahorro Esperado | Total      | Balance
Servicios | -          | $ 582.980 | $ 0    | $ 0             | $ 592.980 | -
```

**Subtotal Row (below):**

```
Subtotal: | -          | $ 582.980 | $ 0    | $ 0             | $ 592.980 | $ 16.417.020
```

✓ **Ahorro Esperado** value ($ 0) is in the correct column
✓ **Total** value ($ 592.980) is in the correct column
✓ **Balance** column shows "-" in header, balance value in subtotal
✓ All columns align perfectly with table headers and other rows
✓ Fix confirmed visually in multiple sub-group headers

## Code Changes Made

**File**: `components/subgroup-header-row.tsx`

**Change**: Consolidated the Expand/Collapse button (previously lines 112-128 as separate TableCell) into the Name cell (now lines 112-134 as part of the flex container).

**Before**:

```tsx
{
  /* Expand/Collapse Icon */
}
<TableCell className="w-8">
  <Button>...</Button>
</TableCell>;

{
  /* Sub-group Name */
}
<TableCell>
  <div className="flex items-center gap-2">
    <span>{subgroupName}</span>
    ...
  </div>
</TableCell>;
```

**After**:

```tsx
{/* Sub-group Name with Expand/Collapse Icon */}
<TableCell>
  <div className="flex items-center gap-2">
    <Button
      className="h-5 w-5 p-0 flex-shrink-0"
      ...
    >...</Button>
    <span>{subgroupName}</span>
    ...
  </div>
</TableCell>
```

**Result**: Now the SubgroupHeaderRow has exactly 9 TableCells (same as SubgroupSubtotalRow):

1. Drag Handle (w-8)
2. Name + Expand/Collapse (combined)
3. Tipo Gasto
4. Efectivo
5. Crédito
6. Expected Savings
7. Total
8. Balance
9. Actions

## Files to Modify

- `components/subgroup-header-row.tsx` - Refactor cell structure

## Acceptance Criteria

- [x] Ahorro Esperado total appears in the correct column (6th data column, after Crédito)
- [x] Total appears in the correct column (7th data column, after Ahorro Esperado)
- [x] Balance column shows "-" with no value (8th data column)
- [x] Column alignment matches the table headers exactly
- [x] Column alignment matches the subtotal rows below
- [x] All action buttons (Add, Delete) remain functional

## Summary

**Status**: ✓ COMPLETED

The column alignment issue in sub-group headers has been successfully fixed by consolidating the Expand/Collapse button into the sub-group name cell, reducing the total number of TableCells from 10 to 9, which now matches the SubgroupSubtotalRow structure perfectly.

**Impact**:

- All "Ahorro Esperado" and "Total" values now display in their correct columns
- Balance column correctly shows "-" in headers and balance values in subtotals
- All sub-group functionality (expand/collapse, add/delete) remains intact
- Visual alignment is perfect across all rows

**Files Modified**: 1

- `components/subgroup-header-row.tsx` (lines 112-134)
