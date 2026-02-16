# Subgroups Balance Remainder Visualization Plan

**Branch:** `subgroups-balance-show`
**Date:** November 7, 2025
**Status:** Planning Phase

## Overview

Add balance remainder visualization to collapsed subgroups in the simulation budget form. When subgroups are collapsed, users cannot currently see the running balance after the subgroup's expenses are applied. This plan adds a balance column to the SubgroupSubtotalRow component to display this value with orange styling consistent with the subgroup header.

## Problem Statement

Currently, when a subgroup is collapsed in the simulation form:

- Users see the subgroup header (orange) with financial totals
- Users see a subtotal row with aggregated efectivo, crédito, and expected savings
- **Missing:** No balance remainder is displayed, so users cannot quickly see the impact on overall budget balance

When users expand the subgroup, they can see individual category balances, but this requires extra clicks.

## Solution Overview

Display the running balance value in the SubgroupSubtotalRow component:

- Add a balance cell to the subtotal row (same column position as category balance column)
- Style with orange accent color (matching the subgroup header) to maintain visual hierarchy
- Calculate the balance as: previous running balance - subgroup's net spend
- The balance should show the remaining budget after this subgroup's expenses

## Implementation Plan

### Task 1: Update SubgroupSubtotalRow Component Props

- [ ] **Status:** pending
- **File:** `components/subgroup-subtotal-row.tsx`
- **Changes:**
  - Add `subgroupBalance: number` prop to accept the calculated balance value
  - Add prop to SubgroupSubtotalRowProps interface (line 14)
  - Update component JSDoc with new prop
- **Reasoning:** Need to pass the balance value from parent component to subtotal row

### Task 2: Add Balance Cell to SubgroupSubtotalRow

- [ ] **Status:** pending
- **File:** `components/subgroup-subtotal-row.tsx`
- **Changes:**
  - Add new TableCell after the Total cell (after line 62)
  - Display formatted balance value using `formatCurrency()`
  - Apply orange styling class: `text-accent font-semibold`
  - Ensure alignment matches other currency columns
- **Reasoning:** Make balance visible in the subtotal row with consistent styling

### Task 3: Calculate Subgroup Balance in simulation-budget-form.tsx

- [ ] **Status:** pending
- **File:** `components/simulation-budget-form.tsx`
- **Changes:**
  - In the categoryBalances useMemo (lines 1109-1171), calculate and store subgroup ending balances
  - Create a new `subgroupBalances` Map<string, number> alongside `categoryBalances`
  - For each subgroup, store the balance value after all categories in that subgroup are processed
  - Algorithm:
    1. As we iterate through categories in order, track which subgroup we're in
    2. When transitioning to a new subgroup or reaching end of categories, store current runningBalance with the subgroup ID
- **Reasoning:** Need to calculate what the balance is after all categories in each subgroup are deducted

### Task 4: Update SubgroupSubtotalRow Render Call

- [ ] **Status:** pending
- **File:** `components/simulation-budget-form.tsx`
- **Changes:**
  - Find SubgroupSubtotalRow component render location (around line 1912-1915)
  - Pass `subgroupBalance` prop with value from `subgroupBalances` Map
  - Use subgroup ID as key: `subgroupBalances.get(row.subgroupId) ?? 0`
- **Reasoning:** Pass the calculated balance to the subtotal row component

### Task 5: Test Balance Calculations

- [ ] **Status:** pending
- **Manual Testing:**
  - Collapse a subgroup and verify balance displays correctly
  - Verify balance value = previous balance - (subgroup's efectivo - expected savings)
  - Test with multiple subgroups to ensure each shows correct remaining balance
  - Test with drag-and-drop reordering to ensure balances recalculate
  - Verify styling looks good in both light and dark modes
  - Check responsive design on mobile

### Task 6: Handle Edge Cases

- [ ] **Status:** pending
- **Changes:**
  - Ensure balance displays "-" if subgroup balance cannot be calculated
  - Test with negative balances (display correctly with red or accent color)
  - Test when all expenses exceed available budget
  - Ensure balance updates when user modifies subgroup amounts
- **Reasoning:** Robust error handling and edge case coverage

## Technical Details

### Color Scheme

- **Orange Accent:** `text-accent` class
  - Light mode: HSL(25, 95%, 53%)
  - Dark mode: HSL(25, 85%, 53%)
- **Styling:** `text-accent font-semibold` to match header prominence

### Alignment with Existing Patterns

- Use existing `formatCurrency()` utility for number formatting
- Follow SubgroupSubtotalRow component structure (muted background, dashed border)
- Maintain consistency with category balance column styling
- Use TableCell wrapper like other columns

### Files Modified

1. `components/subgroup-subtotal-row.tsx` - Add balance cell and prop
2. `components/simulation-budget-form.tsx` - Calculate subgroup balances and pass to component

### No New Files Required

- Reuse existing calculation utilities
- No new type definitions needed (number is sufficient)
- No new components required

## Acceptance Criteria

1. ✅ SubgroupSubtotalRow displays balance value in orange text
2. ✅ Balance value correctly represents remaining budget after subgroup expenses
3. ✅ Balance displays in correct column position (aligned with category balance)
4. ✅ Balance updates when user modifies amounts or reorders subgroups
5. ✅ Orange styling is consistent with subgroup header color
6. ✅ Works in both light and dark modes
7. ✅ No impact on performance (uses existing memoized calculations)
8. ✅ All edge cases handled gracefully

## Rollout Steps

1. Implement Task 1-2 (component updates)
2. Implement Task 3-4 (calculation and integration)
3. Run manual testing (Task 5)
4. Fix edge cases (Task 6)
5. Review styling and responsive design
6. Commit changes to `subgroups-balance-show` branch
7. Create PR with screenshots showing before/after

## Notes

- The balance calculation should use the same logic as individual category balances
- Order matters: balance must reflect cumulative effect of all categories up to and including the subgroup
- Orange color (`text-accent`) chosen to maintain visual hierarchy and distinguish from category balances
- This is a UI-only feature; no database changes required
