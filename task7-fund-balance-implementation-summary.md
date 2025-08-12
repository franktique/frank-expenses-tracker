# Task 7: Fund Balance Calculation Logic Update - Implementation Summary

## Overview

Updated all fund balance calculation logic to use the new `source_fund_id` field instead of the old category-based fund relationships. This ensures accurate fund tracking where expenses are deducted from the source fund and optionally transferred to a destination fund.

## Changes Made

### 1. Fund Recalculation Endpoint (`app/api/funds/[id]/recalculate/route.ts`)

- **Updated expense calculation**: Changed from category-based fund lookup to direct `source_fund_id` filtering
- **Updated transfer out calculation**: Now uses `source_fund_id` with destination fund filtering
- **Maintained balance formula**: `initial_balance + income + transfers_in - expenses`

**Before:**

```sql
SELECT COALESCE(SUM(e.amount), 0) as total
FROM expenses e
JOIN categories c ON e.category_id = c.id
WHERE c.fund_id = ${id}
```

**After:**

```sql
SELECT COALESCE(SUM(amount), 0) as total
FROM expenses
WHERE source_fund_id = ${id}
```

### 2. Dashboard Funds Endpoint (`app/api/dashboard/funds/route.ts`)

- **Updated expense totals**: Changed from category join to direct `source_fund_id` grouping
- **Updated transfer out totals**: Now correctly identifies transfers using source and destination fund comparison
- **Maintained all other calculations**: Income and transfer-in calculations remain unchanged

### 3. Main Funds Endpoint (`app/api/funds/route.ts`)

- **Updated expense calculation**: Changed from category-based to `source_fund_id` based calculation
- **Simplified query structure**: Removed unnecessary category joins

### 4. Fund Balance Trends Endpoint (`app/api/dashboard/funds/balances/route.ts`)

- **Updated daily expense calculations**: Both specific fund and all-funds queries now use `source_fund_id`
- **Maintained date-based filtering**: All time-based calculations remain accurate

### 5. Fund Transfers Endpoint (`app/api/dashboard/funds/transfers/route.ts`)

- **Updated transfer identification**: Now uses `source_fund_id` and `destination_fund_id` directly
- **Updated transfer statistics**: Outgoing transfers now calculated using `source_fund_id`
- **Improved query performance**: Removed unnecessary category joins

### 6. Individual Fund Details Endpoint (`app/api/funds/[id]/route.ts`)

- **Updated balance calculation**: Changed expense calculation to use `source_fund_id`
- **Updated recent transactions**: Expense transactions now filtered by `source_fund_id`
- **Added source fund reference check**: DELETE operation now checks for `source_fund_id` references

## New Balance Calculation Logic

### Formula

```
current_balance = initial_balance
                + sum(incomes where fund_id = fund.id)
                + sum(expenses where destination_fund_id = fund.id)  // money coming in
                - sum(expenses where source_fund_id = fund.id)       // money going out
```

### Transfer Logic

- **Regular Expense**: `source_fund_id` set, `destination_fund_id` is NULL
- **Fund Transfer**: `source_fund_id` set, `destination_fund_id` set and different from source
- **Internal Expense**: `source_fund_id` set, `destination_fund_id` same as source (rare case)

## Testing

### Unit Tests Created

- **SQL Query Verification**: Tests verify correct use of `source_fund_id` in queries
- **Balance Calculation Logic**: Tests verify mathematical correctness
- **Transfer Identification**: Tests verify proper transfer vs expense classification
- **Edge Cases**: Tests handle zero values and negative balances

### Integration Test Created

- **Fund Balance API Test**: Script to verify all endpoints work correctly with new logic

## Backward Compatibility

### Migration Support

- All endpoints handle expenses with and without `source_fund_id`
- Expenses without `source_fund_id` are excluded from calculations (migration handles this)
- No breaking changes to API response formats

### Data Integrity

- Fund deletion now checks both `source_fund_id` and `destination_fund_id` references
- All balance calculations are consistent across endpoints
- Transfer calculations properly identify fund movements

## Performance Improvements

### Query Optimization

- Removed unnecessary category joins in most fund balance queries
- Direct `source_fund_id` filtering is more efficient than category-based joins
- Maintained proper indexing on `source_fund_id` column

### Reduced Complexity

- Simplified query logic by removing category relationship dependencies
- More direct fund-to-expense relationships
- Cleaner separation of concerns between categories and funds

## Requirements Fulfilled

✅ **Requirement 3.5**: Modified fund balance calculations to use `source_fund_id`
✅ **Requirement 2.1**: Updated fund recalculation endpoint to handle source fund changes  
✅ **Requirement 2.2**: Updated dashboard fund balance displays to reflect new calculation logic
✅ **Additional**: Ensured fund transfer calculations work correctly with source fund tracking

## Files Modified

1. `app/api/funds/[id]/recalculate/route.ts` - Fund recalculation logic
2. `app/api/dashboard/funds/route.ts` - Dashboard fund data
3. `app/api/funds/route.ts` - Main funds endpoint
4. `app/api/dashboard/funds/balances/route.ts` - Fund balance trends
5. `app/api/dashboard/funds/transfers/route.ts` - Fund transfers
6. `app/api/funds/[id]/route.ts` - Individual fund details

## Files Created

1. `lib/__tests__/fund-balance-sql-verification.test.ts` - Unit tests
2. `test-fund-balance-calculations.js` - Integration test script
3. `task7-fund-balance-implementation-summary.md` - This summary

## Next Steps

1. Run migration to populate `source_fund_id` for existing expenses
2. Test all fund-related functionality in the UI
3. Verify dashboard charts and reports show correct data
4. Monitor performance with the new query structure

The fund balance calculation system now properly tracks money flow using source funds, providing more accurate and intuitive fund management for users.
