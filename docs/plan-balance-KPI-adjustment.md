# Plan: Balance KPI Adjustment

## Branch: `fix/balance-KPI`

**Created:** 2025-02-17

## Overview

Currently, the main dashboard has a "Balance" KPI that considers both credit card and cash/debit expenses. This plan will:

1. **Modify the Balance KPI** to only consider income minus cash/debit expenses (matching the "Saldo" column in the budget table)

**Note:** The existing "Remanente Efectivo" and "Remanente Crédito" cards already show overspend (negative values), so no additional KPI cards are needed.

## Current State

Looking at the dashboard-view.tsx (lines 580-593), the current Balance KPI:
- Uses `filteredBalance = totalIncome - filteredTotalExpenses`
- Where `filteredTotalExpenses` includes ALL expenses (credit + cash/debit)
- This doesn't match the "Saldo" column which only subtracts debit + cash amounts

## Changes Required

### [x] Task 1: Modify Balance KPI calculation

**File:** `/components/dashboard-view.tsx`

**Current code (lines 484-491):**
```tsx
const filteredTotalExpenses = filteredBudgetSummary.reduce(
  (sum, item) => sum + item.confirmed_amount,
  0
);
const filteredBalance = totalIncome - filteredTotalExpenses;
```

**Change to:**
```tsx
// Balance should only consider cash/debit expenses (matching the Saldo column)
const filteredTotalCashDebitExpenses = filteredBudgetSummary.reduce(
  (sum, item) => sum + item.debit_amount + item.cash_amount,
  0
);
const filteredBalance = totalIncome - filteredTotalCashDebitExpenses;
```

**Expected result:** Balance KPI will now match the "Saldo" column at the end of the budget table.

### [x] Task 2: Test the changes

1. Verify Balance KPI matches the "Saldo" column in the budget summary table
2. Verify category exclusion filter works correctly with new calculation
3. Verify fund filter works correctly with new calculation

## Summary of Changes

| File | Changes | Lines |
|------|---------|-------|
| `components/dashboard-view.tsx` | Modify Balance calculation | ~484-491 |

## Acceptance Criteria

- [x] Balance KPI shows `Income - (Debit + Cash expenses)` only
- [x] Balance KPI value matches the "Saldo" column in the budget summary table
- [x] Calculation respects the category exclusion filter
- [x] Calculation respects the fund filter
