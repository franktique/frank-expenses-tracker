# Add Percentages to Sub-group Headers

**Branch**: `feature/subgroup-header-percentages`

**Date**: 2025-11-07

## Feature Description

Add percentage indicators next to the "Ahorro Esperado" and "Total" values in sub-group headers to provide quick insights into budget allocation:

- **Ahorro Esperado %**: Percentage of the sub-group's total spending
- **Total %**: Percentage of total simulated income

This helps users quickly understand how much each sub-group represents in relation to the overall budget.

## Current State

Sub-group headers display:

- Efectivo (Cash)
- Crédito (Credit)
- Ahorro Esperado (Expected Savings)
- Total
- Balance (-)

The values are now correctly aligned after the previous fix.

## New State (Target)

Sub-group headers will display:

- Efectivo (Cash)
- Crédito (Credit)
- **Ahorro Esperado (Expected Savings) + %** ← New percentage
- **Total + %** ← New percentage
- Balance (-)

## Percentage Calculation Details

### Ahorro Esperado Percentage

```
Formula: (subgroupAhorroEsperado / subgroupTotal) * 100

Example for "Bebe Jacobo" sub-group:
- Ahorro Esperado: $120,000
- Total: $405,000
- Percentage: (120,000 / 405,000) * 100 = 29.63%
```

### Total Percentage

```
Formula: (subgroupTotal / totalIncome) * 100

Example for "Bebe Jacobo" sub-group:
- Total: $405,000
- Total Income: $37,000,000 (from simulation)
- Percentage: (405,000 / 37,000,000) * 100 = 1.09%
```

## Implementation Plan

### Phase 1: Data Preparation

- [x] Pass `totalIncome` prop to `SubgroupHeaderRow` component
- [x] Verify `subtotals` object contains required values (efectivoAmount, creditoAmount, expectedSavings, total)
- [x] Ensure calculations handle edge cases (division by zero, null values)

### Phase 2: UI Implementation

- [x] Update `SubgroupHeaderRow` component to calculate percentages
- [x] Modify "Ahorro Esperado" cell to display percentage below value
- [x] Modify "Total" cell to display percentage below value
- [x] Add CSS styling for percentage text (smaller font, different color)
- [x] Ensure percentage text doesn't break table layout

### Phase 3: Testing & Validation

- [x] Test with various sub-group configurations
- [x] Verify percentage calculations are accurate
- [x] Test with edge cases (0 values, very small/large numbers)
- [x] Verify visual appearance on different screen sizes
- [x] Test that percentages update when sub-group data changes

## Technical Details

### Component: `SubgroupHeaderRow`

**Props to Add:**

```typescript
totalIncome: number; // Total simulated income
```

**Calculation Functions:**

```typescript
// In component or utility
const ahorroEsperadoPercentage =
  subtotals.total > 0 ? (subtotals.expectedSavings / subtotals.total) * 100 : 0;

const totalPercentage =
  totalIncome > 0 ? (subtotals.total / totalIncome) * 100 : 0;
```

**Display Format:**

```
Value (XX.XX%)

Examples:
$ 120.000 (29.63%)
$ 405.000 (1.09%)
```

### Component: `SimulationBudgetForm`

**Changes Needed:**

- Ensure `SubgroupHeaderRow` receives `totalIncome` prop
- Verify `totalIncome` is available in component state/context

## Files to Modify

1. `components/subgroup-header-row.tsx`
   - Add `totalIncome` prop
   - Add percentage calculation logic
   - Modify Ahorro Esperado cell (lines 155-160)
   - Modify Total cell (lines 162-167)
   - Add CSS styling for percentage display

2. `components/simulation-budget-form.tsx`
   - Pass `totalIncome` to `SubgroupHeaderRow` component

## UI/UX Considerations

### Layout

- Percentages should be displayed on a separate line below the value
- Smaller font size (text-xs) for percentages
- Muted color (text-muted-foreground) for visual distinction
- No impact on table column width or alignment

### Edge Cases

- When total is 0: display "-" or "0%"
- When income is 0: display "-" or "0%"
- Very large percentages (e.g., 150%): display with warning/different styling
- Very small percentages (< 0.01%): display as "< 0.01%"

## Acceptance Criteria

- [x] Ahorro Esperado shows percentage relative to sub-group total
- [x] Total shows percentage relative to total income
- [x] Percentages display below the monetary value
- [x] Percentages use smaller font than monetary values
- [x] Percentages are properly aligned within their cells
- [x] Calculations are accurate (verified with manual calculation)
- [x] Edge cases handled gracefully (0 values, null values)
- [x] No impact on table layout or column alignment
- [x] Works across all sub-group configurations
- [x] Percentages update when sub-group data changes

## Implementation Notes

- Use `formatCurrency()` utility for monetary values (already in use)
- Create new utility function `formatPercentage()` for consistent percentage formatting
- Keep percentage format consistent: "XX.XX%" or "0%" for zero values
- Consider rounding to 2 decimal places for readability
- Ensure percentage formatting matches design system

## Testing Strategy

1. **Unit Tests**: Test percentage calculations with various inputs
2. **Visual Tests**: Compare before/after screenshots
3. **Integration Tests**: Verify percentages update with sub-group changes
4. **Edge Case Tests**: Test with 0 values, null values, extreme numbers
5. **Responsive Tests**: Verify layout on mobile, tablet, desktop

## Related Issues

- Closes: Column alignment issue (previously fixed in fix-subgroup-header-column-alignment.md)
- Builds upon: SubgroupHeaderRow refactoring

## Implementation Summary

**Status**: ✓ COMPLETED

**Commit**: 038367c
**Branch**: feature/subgroup-header-percentages
**PR**: #63

### What Was Built

Percentage indicators now appear next to "Ahorro Esperado" and "Total" values in sub-group headers:

```
Sub-group Header Example:
Servicios (4) | - | $ 582.980 | $ 0 | $ 0 (0%) | $ 592.980 (1.60%) | -
                                             ↑                    ↑
                                  Ahorro % (of subgroup)   Total % (of income)
```

### Key Implementation Details

1. **Percentage Calculations**:
   - Ahorro Esperado %: `(expectedSavings / total) × 100`
   - Total %: `(subgroupTotal / totalIncome) × 100`

2. **UI Styling**:
   - Percentages displayed below monetary values
   - Font size: `text-xs` (smaller than values)
   - Color: `text-muted-foreground` (muted, less prominent)
   - Layout: Flex column with right alignment

3. **Edge Case Handling**:
   - Zero values: Display as "0%"
   - Very small values (< 0.01%): Display as "< 0.01%"
   - Normal values: Display with 2 decimal places "XX.XX%"

### Files Modified

1. `components/subgroup-header-row.tsx` (25 lines added)
   - Added `totalIncome` prop (required)
   - Added percentage calculation logic
   - Updated Expected Savings cell with percentage display
   - Updated Total cell with percentage display

2. `components/simulation-budget-form.tsx` (1 line added)
   - Pass `totalIncome` prop to SubgroupHeaderRow

### Testing Verification

- [x] Percentages calculate correctly
- [x] Edge cases handled properly
- [x] Visual layout doesn't break existing alignment
- [x] Percentages are readable and properly positioned
- [x] No console errors or warnings
- [x] Works across all sub-group configurations

## Future Enhancements

- [ ] Add option to hide/show percentages (user preference)
- [ ] Add percentage trend indicators (arrow up/down)
- [ ] Color code percentages based on budget allocation rules
- [ ] Export percentages in Excel export feature
- [ ] Show percentage change from previous period
