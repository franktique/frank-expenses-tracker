# Copy Period Data to Simulation - Implementation Plan

**Branch:** improve-simularion-2
**Feature:** Add ability to populate simulation with data from existing periods

## Problem Statement

After creating a new simulation, users currently need to manually enter income and budget data from scratch. This is time-consuming and error-prone when they want to base their simulation on historical period data. Users need a way to quickly populate a simulation's income and budget configuration using data from a previously existing period (período).

## Solution Overview

Add a "Copy from Period" feature to the simulation configuration page that allows users to:
1. Select an existing period from a dropdown
2. Copy that period's income data to simulation incomes
3. Copy that period's budget data (by payment method) to simulation budgets
4. Transform the data appropriately (periods have single budgets per category/payment method, simulations split into efectivo/credito)

## Current Architecture Analysis

### Existing Data Models

**Period Data:**
- **Incomes**: `incomes` table with `period_id`, `description`, `amount`, `fund_id`
- **Budgets**: `budgets` table with `category_id`, `period_id`, `expected_amount`, `payment_method`
- Payment methods: "efectivo" or "credito"

**Simulation Data:**
- **Simulation Incomes**: `simulation_incomes` table with `simulation_id`, `description`, `amount`
- **Simulation Budgets**: `simulation_budgets` table with `simulation_id`, `category_id`, `efectivo_amount`, `credito_amount`
- Split by payment method in column structure (not normalized like periods)

### Key Differences

1. **Income Structure**:
   - Periods: Link to funds via `fund_id`
   - Simulations: No fund association, just description and amount

2. **Budget Structure**:
   - Periods: Multiple budget entries per category (one per payment method)
   - Simulations: Single entry per category with two amount columns

## Implementation Plan

### Task List

- [x] **Task 1: Create Period Data API Endpoint**
  - Create GET `/api/periods/[id]/data` endpoint
  - Return period's incomes (aggregated by description)
  - Return period's budgets (grouped by category and payment method)
  - Include metadata (period name, month, year)
  - Add proper error handling and validation

- [x] **Task 2: Create Copy Period to Simulation API Endpoint**
  - Create POST `/api/simulations/[id]/copy-from-period` endpoint
  - Accept `period_id` in request body
  - Fetch period data (incomes and budgets)
  - Transform and insert incomes into `simulation_incomes`
  - Transform and upsert budgets into `simulation_budgets`
  - Return success status with counts of copied items
  - Handle edge cases (empty period, conflicts, etc.)

- [x] **Task 3: Add Data Transformation Logic**
  - Create utility functions for transforming period data to simulation format
  - Handle income aggregation (combine multiple incomes with same description)
  - Handle budget transformation (efectivo/credito split)
  - Ensure proper data type conversions
  - Add validation for transformed data

- [x] **Task 4: Create Period Selector Component**
  - Create `PeriodSelectorDialog` component
  - Fetch available periods from `/api/periods`
  - Display periods in a selectable list with metadata
  - Show period details (name, date, income/budget counts)
  - Include confirmation dialog before copying
  - Handle loading and error states

- [x] **Task 5: Add Copy Button to Simulation Config Page**
  - Add "Copy from Period" button to simulation configuration UI
  - Position button near income/budget forms
  - Integrate `PeriodSelectorDialog`
  - Show loading state during copy operation
  - Refresh income and budget data after successful copy
  - Display success/error toasts

- [x] **Task 6: Handle Existing Data Scenarios**
  - Add warning when simulation already has data
  - Provide options: Merge, Replace, Cancel
  - Implement merge logic (add to existing)
  - Implement replace logic (clear and copy)
  - Show data loss warnings when appropriate

- [x] **Task 7: Testing and Validation**
  - Build test passed successfully ✓
  - All new API endpoints included in build ✓
  - TypeScript compilation successful ✓
  - Component integration verified ✓
  - Ready for manual testing

- [x] **Task 8: Documentation**
  - Implementation plan completed ✓
  - All tasks documented with [x] markers ✓
  - Inline code comments added ✓
  - API endpoints documented in code ✓

## Implementation Summary

All tasks completed successfully! The feature is now ready for testing.

### Files Created
1. `/app/api/periods/[id]/data/route.ts` - Period data API endpoint
2. `/app/api/simulations/[id]/copy-from-period/route.ts` - Copy operation API
3. `/lib/period-to-simulation-transform.ts` - Data transformation utilities
4. `/components/period-selector-dialog.tsx` - Period selection UI

### Files Modified
1. `/app/simular/[id]/page.tsx` - Added copy button and dialog integration

### Build Status
✓ Build completed successfully
✓ All routes registered
✓ No TypeScript errors
✓ No linting errors

### Next Steps for Testing
1. Start development server: `npm run dev`
2. Navigate to a simulation: `/simular/[id]`
3. Click "Copiar desde Período" button
4. Select a period with data
5. Choose merge or replace mode
6. Confirm and verify data is copied correctly
7. Test edge cases (empty periods, large datasets, etc.)

## Technical Implementation Details

### API Endpoints

#### GET `/api/periods/[id]/data`
```typescript
Response:
{
  period: { id, name, month, year },
  incomes: [
    { description, total_amount, count }
  ],
  budgets: [
    { category_id, category_name, efectivo_amount, credito_amount }
  ],
  totals: {
    total_income,
    total_budget_efectivo,
    total_budget_credito
  }
}
```

#### POST `/api/simulations/[id]/copy-from-period`
```typescript
Request:
{
  period_id: string,
  mode: "merge" | "replace"  // How to handle existing data
}

Response:
{
  success: true,
  copied: {
    incomes_count: number,
    budgets_count: number
  },
  summary: {
    total_income: number,
    total_budget: number
  }
}
```

### Data Transformation Logic

**Income Transformation:**
```typescript
// Aggregate period incomes by description
// Sum amounts for duplicate descriptions
// Drop fund_id (not used in simulations)
periodIncomes.reduce((acc, income) => {
  const existing = acc.find(i => i.description === income.description);
  if (existing) {
    existing.amount += income.amount;
  } else {
    acc.push({
      description: income.description,
      amount: income.amount
    });
  }
  return acc;
}, []);
```

**Budget Transformation:**
```typescript
// Group period budgets by category
// Split by payment method (efectivo/credito)
// Convert to simulation budget format
budgetsByCategory = groupBy(periodBudgets, 'category_id');
budgetsByCategory.map(categoryBudgets => ({
  category_id: categoryBudgets[0].category_id,
  efectivo_amount: categoryBudgets.find(b => b.payment_method === 'efectivo')?.expected_amount || 0,
  credito_amount: categoryBudgets.find(b => b.payment_method === 'credito')?.expected_amount || 0
}));
```

### UI Component Structure

```
SimulationConfigPage (app/simular/[id]/page.tsx)
  └─ SimulationBudgetForm
      └─ [New] CopyFromPeriodButton
          └─ PeriodSelectorDialog
              ├─ PeriodList
              ├─ PeriodPreview
              └─ CopyConfirmation
```

### Database Queries

**Fetch Period Data:**
```sql
-- Get period incomes
SELECT description, SUM(amount) as total_amount, COUNT(*) as count
FROM incomes
WHERE period_id = $1
GROUP BY description;

-- Get period budgets (transformed)
SELECT
  b.category_id,
  c.name as category_name,
  SUM(CASE WHEN b.payment_method = 'efectivo' THEN b.expected_amount ELSE 0 END) as efectivo_amount,
  SUM(CASE WHEN b.payment_method = 'credito' THEN b.expected_amount ELSE 0 END) as credito_amount
FROM budgets b
JOIN categories c ON b.category_id = c.id
WHERE b.period_id = $1
GROUP BY b.category_id, c.name;
```

**Copy to Simulation:**
```sql
-- Insert incomes
INSERT INTO simulation_incomes (simulation_id, description, amount)
VALUES ($1, $2, $3);

-- Upsert budgets
INSERT INTO simulation_budgets (simulation_id, category_id, efectivo_amount, credito_amount)
VALUES ($1, $2, $3, $4)
ON CONFLICT (simulation_id, category_id)
DO UPDATE SET
  efectivo_amount = CASE
    WHEN $mode = 'replace' THEN EXCLUDED.efectivo_amount
    ELSE simulation_budgets.efectivo_amount + EXCLUDED.efectivo_amount
  END,
  credito_amount = CASE
    WHEN $mode = 'replace' THEN EXCLUDED.credito_amount
    ELSE simulation_budgets.credito_amount + EXCLUDED.credito_amount
  END;
```

## Files to Create/Modify

### New Files
- `/app/api/periods/[id]/data/route.ts` - Period data endpoint
- `/app/api/simulations/[id]/copy-from-period/route.ts` - Copy endpoint
- `/components/period-selector-dialog.tsx` - Period selection UI
- `/components/copy-from-period-button.tsx` - Trigger button component
- `/lib/period-to-simulation-transform.ts` - Data transformation utilities

### Modified Files
- `/app/simular/[id]/page.tsx` - Add copy button to UI
- `/components/simulation-budget-form.tsx` - Integrate copy feature
- `/components/simulation-income-input.tsx` - Refresh after copy
- `/types/funds.ts` - Add types for period data and copy operations

## Edge Cases and Error Handling

1. **Empty Period**: Show message "This period has no data to copy"
2. **Period Not Found**: Show error toast "Selected period does not exist"
3. **Simulation Not Found**: Return 404 from API
4. **Category Mismatch**: Skip budgets for categories that no longer exist
5. **Duplicate Incomes**: Aggregate by description or allow duplicates based on mode
6. **Network Errors**: Show retry option with exponential backoff
7. **Partial Copy Failure**: Show which items succeeded/failed
8. **Large Datasets**: Add pagination or chunking for periods with many entries

## User Experience Flow

1. User creates a new simulation
2. User navigates to simulation configuration page
3. User sees "Copy from Period" button near income/budget sections
4. User clicks button → Period selector dialog opens
5. User browses available periods with preview data
6. User selects a period → Preview shows what will be copied
7. If simulation has existing data → Show merge/replace options
8. User confirms → Loading indicator appears
9. Data copies → Success toast appears
10. Forms refresh with new data → User can review and adjust
11. User saves simulation → Auto-save triggers

## Success Criteria

- [ ] Users can select any existing period and copy its data to a simulation
- [ ] Income data is correctly transformed and copied
- [ ] Budget data is correctly transformed with efectivo/credito split
- [ ] UI provides clear feedback during the copy operation
- [ ] Existing simulation data is handled appropriately (merge/replace)
- [ ] No data loss occurs during the copy operation
- [ ] Error states are handled gracefully with clear messages
- [ ] Performance is acceptable even with large periods (100+ entries)
- [ ] All edge cases are handled appropriately
- [ ] Feature is intuitive and requires minimal explanation

## Testing Strategy

### Unit Tests
- Test data transformation functions
- Test budget aggregation logic
- Test income deduplication
- Test edge cases (empty data, nulls, etc.)

### Integration Tests
- Test period data endpoint with various periods
- Test copy endpoint with merge mode
- Test copy endpoint with replace mode
- Test error scenarios (invalid IDs, missing data)

### E2E Tests
- Complete user flow from simulation creation to copy to save
- Test with real period data
- Test UI interactions and dialogs
- Verify data persistence

### Manual Testing Checklist
- [ ] Copy from period with only incomes
- [ ] Copy from period with only budgets
- [ ] Copy from period with both incomes and budgets
- [ ] Copy to empty simulation
- [ ] Copy to simulation with existing data (merge)
- [ ] Copy to simulation with existing data (replace)
- [ ] Cancel copy operation
- [ ] Network error during copy
- [ ] Invalid period ID
- [ ] Large period (50+ categories, 20+ incomes)

## Rollback Plan

If issues arise:
1. Remove copy button from UI
2. Disable API endpoints (return 501 Not Implemented)
3. Revert any database changes
4. Users can still manually enter data (original workflow)
5. Fix issues and redeploy

## Future Enhancements

- Copy from another simulation (simulation-to-simulation)
- Batch copy from multiple periods
- Smart copy (AI-suggested adjustments based on patterns)
- Copy with adjustments (apply percentage increase/decrease)
- Template periods (marked as templates for frequent copying)
- Historical comparison after copy (show differences)

## Notes

- This feature is read-only for periods (no modifications to period data)
- Simulation data can be edited after copy (copy is just initial population)
- Consider adding analytics to track which periods are copied most often
- May want to add a "last copied from" metadata field to simulations
