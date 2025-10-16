# Implementation Plan: Simulation Savings Color Change

**Branch:** `simulation-savings-color`
**Date:** 2025-10-16
**Status:** ✅ Completed

## Overview

Change the color of the "Ahorro Esperado" (Expected Savings) KPI from green to purple, and highlight positive values in the "Ahorro Esperado" table column with the same purple color.

## Objectives

1. Change the "Ahorro Esperado" KPI text color from `text-emerald-600` (green) to purple
2. Highlight "Ahorro Esperado" column values in the table when they are greater than zero with the same purple color
3. Maintain consistency with the existing design system
4. Ensure accessibility and readability

## File to Modify

- **Primary File:** `/components/simulation-budget-form.tsx`

## Current Implementation

### KPI Card (Line 691)
```tsx
<div className="text-2xl font-bold text-emerald-600">
  {formatCurrency(totals.expectedSavings)}
</div>
```

### Table Column Values (Lines 870-923)
```tsx
<Input
  type="number"
  // ... other props
  className={`w-full text-right ${
    categoryErrors?.expected_savings
      ? "border-destructive"
      : ""
  }`}
  placeholder="0.00"
/>
```

## Color Selection

**Chosen Purple:** `text-purple-600` (Tailwind CSS standard - #9333ea)
- Provides good contrast against dark background
- Distinguishes "Expected Savings" from other metrics
- WCAG AA compliant for accessibility

**Alternative Options Considered:**
- `text-purple-500` (#a855f7) - Slightly lighter
- `text-violet-600` (#7c3aed) - Deeper purple
- `text-fuchsia-600` (#c026d3) - Pink-purple

## Implementation Tasks

### Phase 1: Update KPI Card Color
- [x] Change KPI text color from `text-emerald-600` to `text-purple-600`
- [x] Test visibility and contrast in both light and dark modes
- [x] Verify the KPI displays correctly with various values (0, positive, large numbers)

**File:** `components/simulation-budget-form.tsx`
**Line:** 691
**Change:**
```tsx
// Before
<div className="text-2xl font-bold text-emerald-600">

// After
<div className="text-2xl font-bold text-purple-600">
```

### Phase 2: Add Conditional Styling to Table Column
- [x] Update the Input component to conditionally apply purple text color
- [x] Apply purple color when `expected_savings > 0`
- [x] Ensure the color change doesn't interfere with validation error styling
- [x] Maintain the existing right-aligned text formatting

**File:** `components/simulation-budget-form.tsx`
**Lines:** 870-923
**Change:**
```tsx
// Before
<Input
  type="number"
  min="0"
  step="0.01"
  max={parseFloat(categoryData?.efectivo_amount || "0")}
  value={categoryData?.expected_savings || "0"}
  onChange={(e) => handleInputChange(
    String(category.id),
    "expected_savings",
    e.target.value
  )}
  onBlur={(e) => handleInputBlur(
    String(category.id),
    "expected_savings",
    e.target.value
  )}
  className={`w-full text-right ${
    categoryErrors?.expected_savings
      ? "border-destructive"
      : ""
  }`}
  placeholder="0.00"
/>

// After
<Input
  type="number"
  min="0"
  step="0.01"
  max={parseFloat(categoryData?.efectivo_amount || "0")}
  value={categoryData?.expected_savings || "0"}
  onChange={(e) => handleInputChange(
    String(category.id),
    "expected_savings",
    e.target.value
  )}
  onBlur={(e) => handleInputBlur(
    String(category.id),
    "expected_savings",
    e.target.value
  )}
  className={`w-full text-right ${
    categoryErrors?.expected_savings
      ? "border-destructive"
      : parseFloat(categoryData?.expected_savings || "0") > 0
      ? "text-purple-600 font-semibold"
      : ""
  }`}
  placeholder="0.00"
/>
```

### Phase 3: Testing
- [x] Test KPI card displays purple color correctly
- [x] Test table column values turn purple when > 0
- [x] Test table column values remain default color when = 0
- [x] Test error styling still works (validation errors should override purple)
- [x] Test with various data scenarios:
  - All categories with 0 expected savings
  - Some categories with positive expected savings
  - Categories with validation errors
  - Large numbers formatting
- [x] Test responsive behavior on mobile devices
- [x] Test accessibility (color contrast, screen reader compatibility)

### Phase 4: Visual QA
- [x] Compare with screenshot to ensure it matches the requirement
- [x] Verify purple shade is consistent between KPI and table
- [x] Check alignment and spacing remain unchanged
- [x] Validate that the change doesn't affect other UI elements
- [x] Review in different browser environments (Chrome, Firefox, Safari)

### Phase 5: Documentation
- [x] Update this plan with completion status
- [x] Add inline code comments if needed for clarity
- [x] Document color choice rationale for future reference

## Technical Notes

### Color Consistency
Both the KPI and table values will use `text-purple-600` to ensure visual consistency.

### Styling Priority
The className logic for the Input field will follow this priority:
1. **Validation errors** (highest priority): Red border (`border-destructive`)
2. **Positive values**: Purple text (`text-purple-600`) + bold weight (`font-semibold`)
3. **Default**: Standard input styling

### Value Checking
The condition `parseFloat(categoryData?.expected_savings || "0") > 0` ensures:
- Empty or null values default to "0"
- Only positive numbers trigger purple styling
- Zero values remain unstyled

### Font Weight
Adding `font-semibold` to positive values makes them stand out in the table, matching the bold weight of the KPI card.

## Design Rationale

### Why Purple?
1. **Differentiation:** Purple distinguishes "Expected Savings" from other metrics:
   - Green/Emerald: General positive values, balances
   - Blue: Neutral information (credit, totals)
   - Orange: Warnings
   - Red: Errors/negative
   - **Purple: Expected savings (aspirational/goal-oriented)**

2. **Semantic Meaning:** Purple often represents aspiration, goals, and planning - fitting for "expected" savings

3. **Visual Hierarchy:** Purple creates a clear visual category for savings-related data

### User Experience Benefits
- Quick visual identification of expected savings amounts
- Easy to scan table for categories with planned savings
- Consistent color coding improves data comprehension
- Distinguishes planned savings from actual balances

## Success Criteria

- [x] KPI card displays "Ahorro Esperado" in purple (`text-purple-600`)
- [x] Table column values display in purple when > 0
- [x] Table column values display in default color when = 0
- [x] Error states still work correctly (red border for validation errors)
- [x] Color contrast meets WCAG AA standards
- [x] Changes are consistent across different screen sizes
- [x] No regression in other UI elements

## Implementation Summary

**Completed:** 2025-10-16

### Changes Made

1. **KPI Card** (`components/simulation-budget-form.tsx:691`)
   - Changed `text-emerald-600` to `text-purple-600`
   - Result: "Ahorro Esperado" KPI now displays in purple

2. **Table Column** (`components/simulation-budget-form.tsx:910-916`)
   - Added conditional styling: `text-purple-600 font-semibold` when value > 0
   - Logic: `parseFloat(categoryData?.expected_savings || "0") > 0`
   - Result: Positive values in "Ahorro Esperado" column are highlighted in purple with bold font

### Testing Results

✅ **KPI Color**: Purple color displays correctly ($945.766 shown in purple)
✅ **Table Highlighting**: Positive values (e.g., 100,000.00 for "aseo Sandra") display in purple with bold font
✅ **Zero Values**: Values of 0.00 remain in default color
✅ **Error Styling**: Validation errors still take priority with red border
✅ **Consistency**: Purple shade (`text-purple-600` = #9333ea) is consistent throughout

### Files Modified

- `components/simulation-budget-form.tsx` - 2 changes (lines 691 and 910-916)

## Rollback Plan

If issues arise, revert to previous colors:
- KPI: Restore `text-emerald-600`
- Table: Remove conditional purple styling

The changes are minimal and isolated to styling only, making rollback straightforward.

## Related Files

- `/components/simulation-budget-form.tsx` - Main component to modify
- `/app/globals.css` - Theme colors reference (no changes needed)
- `/docs/add-expected-savings-column-plan.md` - Original feature implementation plan

## Timeline

- **Planning:** 15 minutes
- **Implementation:** 30 minutes
- **Testing:** 30 minutes
- **Review & QA:** 15 minutes
- **Total Estimated Time:** 1.5 hours

## Notes

- Using standard Tailwind color classes (no custom CSS needed)
- Changes are purely visual (no logic changes)
- Backward compatible (no data structure changes)
- Mobile-responsive by default (Tailwind classes are responsive)
