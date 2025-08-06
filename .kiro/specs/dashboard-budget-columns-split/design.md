# Design Document

## Overview

This feature will modify the dashboard's budget summary table to display separate budget columns for different payment methods. Currently, the table shows a single "Presupuesto" column that aggregates all budget amounts regardless of payment method. The new design will split this into "Presupuesto Crédito" and "Presupuesto Efectivo" columns, providing better visibility into budget allocation by payment type.

## Architecture

### Current Architecture

- Dashboard API (`/api/dashboard/route.ts`) aggregates budget data using a single `expected_amount` sum
- Dashboard View (`components/dashboard-view.tsx`) displays the aggregated budget in one column
- Budget data is stored in the `budgets` table with individual `payment_method` values

### Modified Architecture

- Dashboard API will be updated to calculate separate budget totals by payment method
- Dashboard View will be updated to display two separate budget columns
- No database schema changes required (payment_method field already exists)

## Components and Interfaces

### API Layer Changes

#### Dashboard API Route (`/app/api/dashboard/route.ts`)

The budget query will be modified to calculate separate totals for credit and cash/debit payment methods:

```sql
category_budgets AS (
  SELECT
    c.id as category_id,
    COALESCE(SUM(CASE WHEN b.payment_method = 'credit' THEN b.expected_amount ELSE 0 END), 0) as credit_budget,
    COALESCE(SUM(CASE WHEN b.payment_method IN ('cash', 'debit') THEN b.expected_amount ELSE 0 END), 0) as cash_debit_budget,
    COALESCE(SUM(b.expected_amount), 0) as total_budget
  FROM categories c
  LEFT JOIN budgets b ON c.id = b.category_id AND b.period_id = ${activePeriod.id}
  GROUP BY c.id
)
```

#### Data Structure Changes

The API response will include new fields:

```typescript
type BudgetSummaryItem = {
  category_id: string;
  category_name: string;
  credit_budget: number; // New field
  cash_debit_budget: number; // New field
  expected_amount: number; // Kept for backward compatibility
  total_amount: number;
  credit_amount: number;
  debit_amount: number;
  cash_amount: number;
  remaining: number;
};
```

### UI Layer Changes

#### Dashboard View Component (`components/dashboard-view.tsx`)

The table structure will be updated to include two new columns:

1. **Column Order**: The new columns will be positioned after the category name and before the "Gasto Total" column
2. **Column Headers**:
   - "Presupuesto Crédito"
   - "Presupuesto Efectivo"
3. **Totals Row**: Will calculate and display sums for both new columns

#### Table Layout

```
| Categoria | Presupuesto Crédito | Presupuesto Efectivo | Gasto Total | ... |
```

## Data Models

### Existing Budget Model

The budget table already contains the necessary fields:

```sql
budgets (
  id,
  category_id,
  period_id,
  expected_amount,
  payment_method  -- 'credit', 'debit', 'cash'
)
```

### Payment Method Mapping

- **Credit Budget**: `payment_method = 'credit'`
- **Cash/Debit Budget**: `payment_method IN ('cash', 'debit')`

## Error Handling

### API Error Handling

- Maintain existing error handling patterns
- Ensure new budget calculations handle null/undefined values gracefully
- Add logging for debugging budget calculation issues

### UI Error Handling

- Display $0 for categories with no budgets of specific payment types
- Maintain existing table formatting and error states
- Ensure totals calculations are accurate even with missing data

## Testing Strategy

### Unit Tests

1. **API Tests**: Verify budget calculations for different payment method combinations
2. **Component Tests**: Test table rendering with new columns
3. **Integration Tests**: Verify fund filtering works with split budget columns

### Test Scenarios

1. Categories with only credit budgets
2. Categories with only cash/debit budgets
3. Categories with mixed payment method budgets
4. Categories with no budgets
5. Fund filtering with various budget combinations
6. Totals row calculations

### Edge Cases

1. Categories with zero budgets
2. Negative budget amounts (if allowed)
3. Missing payment method data
4. Fund filtering edge cases

## Performance Considerations

### Database Query Optimization

- The modified query uses CASE statements which are efficient in PostgreSQL
- No additional database calls required
- Query complexity remains similar to current implementation

### Frontend Performance

- Minimal impact on rendering performance (two additional columns)
- No additional API calls required
- Existing memoization and optimization patterns maintained

## Migration Strategy

### Deployment Approach

1. **Phase 1**: Update API to include new budget fields while maintaining backward compatibility
2. **Phase 2**: Update UI to display new columns
3. **Phase 3**: Remove old aggregated budget field if no longer needed

### Backward Compatibility

- Keep existing `expected_amount` field in API response during transition
- Ensure existing functionality continues to work during deployment

## Security Considerations

- No new security concerns introduced
- Existing authentication and authorization patterns maintained
- Fund filtering security remains unchanged
