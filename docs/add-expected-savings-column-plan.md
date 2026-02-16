# Implementation Plan: Add Expected Savings Column to Simulation Budget Table

**Branch:** `improve-simularion-2`
**Date:** 2025-10-16
**Feature:** Add "Expected Savings" (Ahorro Esperado) column to simulation budget configuration

## Overview

Add a new "Expected Savings" column to the simulation budget table that allows users to specify how much they expect to save from each category's budget. The actual balance deduction will be: `Balance -= (Presupuesto - Ahorro Esperado)`.

### Example

- Category budget (presupuesto): $250,000
- Expected savings (ahorro esperado): $50,000
- Actual balance deduction: $200,000 ($250,000 - $50,000)
- New balance: Previous Balance - $200,000

## Technical Analysis

### Current Implementation

- **Component:** `components/simulation-budget-form.tsx`
- **API Route:** `app/api/simulations/[id]/budgets/route.ts`
- **Database Table:** `simulation_budgets` (lines 47-59 in route.ts)
- **Current Balance Calculation:** Lines 464-487 in simulation-budget-form.tsx
  - Currently only subtracts `efectivo_amount` from running balance
  - Does not account for expected savings

### Current Data Structure

```typescript
type SimulationBudget = {
  category_id: string | number;
  category_name: string;
  efectivo_amount: number; // Efectivo (Cash)
  credito_amount: number; // Crédito (Credit)
};
```

## Implementation Tasks

### Phase 1: Database Schema Update

- [x] Create database migration to add `expected_savings` column to `simulation_budgets` table
  - Column type: `NUMERIC` or `DECIMAL(15,2)`
  - Default value: `0`
  - Nullable: `false`
- [x] Test migration with existing data
- [x] Create rollback script

### Phase 2: Type Definitions and Validation

- [x] Update `SimulationBudget` type in `components/simulation-budget-form.tsx` (line 42-47)
  - Add `expected_savings: number` field
- [x] Update `BudgetFormData` type (line 49-55)
  - Add `expected_savings: string` field to form data
- [x] Add validation for expected savings in `lib/simulation-validation.ts`
  - Validate: `0 <= expected_savings <= efectivo_amount`
  - Error message: "El ahorro esperado no puede ser mayor al presupuesto en efectivo"
- [x] Update Zod schemas if they exist for simulation budgets

### Phase 3: Backend API Updates

- [x] Update GET endpoint in `app/api/simulations/[id]/budgets/route.ts` (lines 46-59)
  - Include `expected_savings` in SELECT query
- [x] Update PUT endpoint validation (lines 110-375)
  - Accept `expected_savings` in request body
  - Validate expected_savings <= efectivo_amount
  - Update UPSERT query to include `expected_savings` (lines 237-246)
- [x] Add error handling for invalid expected_savings values
- [x] Test API endpoints with curl/Postman

### Phase 4: Frontend Form Updates

- [x] Update state initialization in `simulation-budget-form.tsx` (lines 130-170)
  - Initialize `expected_savings` from API response
  - Default to "0" for new entries
- [x] Add new table column in TableHeader (line 691-698)
  - Add "Ahorro Esperado" header between "Crédito" and "Total"
- [x] Add Input field for expected_savings in TableBody (lines 700-851)
  - Position: After Crédito input, before Total column
  - Type: number input
  - Min: 0
  - Max: efectivo_amount value
  - Step: 0.01
  - Include validation error display
- [x] Update `handleInputChange` function (lines 341-380)
  - Handle `expected_savings` field changes
- [x] Update `handleInputBlur` function (lines 383-430)
  - Validate expected_savings on blur
  - Auto-save when valid
- [x] Add cross-field validation
  - Ensure expected_savings <= efectivo_amount
  - Show error if expected_savings > efectivo_amount

### Phase 5: Balance Calculation Update

- [x] Update `categoryBalances` calculation (lines 464-487)
  - Current: `runningBalance -= efectivoAmount`
  - New: `runningBalance -= (efectivoAmount - expectedSavings)`
  - Formula: Balance decreases by (Budget - Expected Savings)
- [x] Update calculation to handle:
  - Case when expected_savings = 0 (no savings, normal behavior)
  - Case when expected_savings > 0 (reduce balance deduction)
  - Case when expected_savings = efectivo_amount (no balance deduction)
- [x] Test balance calculations with various scenarios

### Phase 6: Totals and Summary Updates

- [x] Update totals calculation (lines 433-452)
  - Add totalExpectedSavings calculation
  - Add totalNetSpend (total - savings)
- [x] Add new Summary Card for Expected Savings
  - Position: After "Total General" card
  - Display: Total Expected Savings across all categories
  - Color: Green (savings indicator)
  - Icon: PiggyBank or TrendingDown
- [x] Update "Total General" card description
  - Show: "Net Spend: $X (after $Y savings)"

### Phase 7: Excel Export Update

- [ ] Update `lib/excel-export-utils.ts` export function
  - Add "Ahorro Esperado" column to Excel export
  - Add "Gasto Neto" column (Presupuesto - Ahorro Esperado)
  - Update totals row to include savings
  - Position: Between "Crédito" and "Total" columns
- [ ] Test Excel export with sample data

### Phase 8: Data Migration for Existing Simulations

- [ ] Create data migration script for existing simulations
  - Set expected_savings = 0 for all existing records
- [ ] Test with production-like data
- [ ] Document migration process

### Phase 9: UI/UX Polish

- [ ] Add tooltip/help text for Expected Savings column
  - Text: "Cantidad que esperas ahorrar de este presupuesto. El balance se reducirá por (Presupuesto - Ahorro)"
- [ ] Add visual indicator when expected_savings > 0
  - Highlight row or add icon to show active savings
- [ ] Update column widths for better layout
  - Adjust table column proportions to accommodate new column
- [ ] Ensure responsive design works on mobile
  - Test table scroll/overflow behavior
  - Consider collapsing columns on small screens

### Phase 10: Testing and Validation

- [ ] Write unit tests for balance calculation logic
  - Test: Normal case (savings = 0)
  - Test: Partial savings (0 < savings < budget)
  - Test: Full savings (savings = budget)
  - Test: Invalid savings (savings > budget)
- [ ] Write integration tests for API endpoints
  - Test: Create simulation with expected_savings
  - Test: Update expected_savings
  - Test: Validation errors
- [ ] Manual testing checklist:
  - Create new simulation with savings
  - Update existing simulation with savings
  - Verify balance calculations
  - Test Excel export
  - Test auto-save functionality
  - Test error handling
  - Verify responsive design
- [ ] Browser compatibility testing
  - Chrome, Firefox, Safari, Edge

### Phase 11: Documentation

- [ ] Update CLAUDE.md with new feature description
  - Document expected_savings field
  - Document balance calculation formula
- [ ] Add inline code comments for complex logic
- [ ] Update API documentation (if exists)
- [ ] Create user-facing documentation/help text

## Database Migration

### Migration Script

```sql
-- Migration: Add expected_savings column to simulation_budgets
ALTER TABLE simulation_budgets
ADD COLUMN expected_savings NUMERIC(15, 2) DEFAULT 0 NOT NULL;

-- Add check constraint to ensure expected_savings <= efectivo_amount
ALTER TABLE simulation_budgets
ADD CONSTRAINT check_expected_savings_valid
CHECK (expected_savings >= 0 AND expected_savings <= efectivo_amount);

-- Update existing records to have 0 expected_savings
UPDATE simulation_budgets SET expected_savings = 0 WHERE expected_savings IS NULL;
```

### Rollback Script

```sql
-- Rollback: Remove expected_savings column
ALTER TABLE simulation_budgets DROP CONSTRAINT IF EXISTS check_expected_savings_valid;
ALTER TABLE simulation_budgets DROP COLUMN IF EXISTS expected_savings;
```

## Key Formula

**Balance Calculation:**

```
New Balance = Previous Balance - (Efectivo Amount - Expected Savings)
            = Previous Balance - Net Spend
```

Where:

- `Net Spend = Efectivo Amount - Expected Savings`
- `Expected Savings` must be `0 <= Expected Savings <= Efectivo Amount`

## Risk Assessment

### High Risk

- Balance calculation changes could break existing functionality
- Data migration must not corrupt existing simulation data

### Medium Risk

- UI layout changes may affect responsive design
- Validation logic complexity increases

### Low Risk

- Adding new column to database (backward compatible with default value)
- Excel export changes (additive feature)

## Testing Strategy

1. **Unit Tests:** Balance calculation logic, validation functions
2. **Integration Tests:** API endpoints, database operations
3. **E2E Tests:** Full user workflow from input to balance display
4. **Manual Tests:** UI/UX, responsive design, edge cases
5. **Regression Tests:** Ensure existing functionality still works

## Success Criteria

- [ ] Users can input expected savings for each category budget
- [ ] Balance calculation correctly subtracts (Budget - Savings)
- [ ] Validation prevents savings > budget
- [ ] Excel export includes expected savings data
- [ ] Auto-save works with new field
- [ ] All tests pass
- [ ] No regression in existing functionality
- [ ] Responsive design works on all screen sizes

## Timeline Estimate

- Database & Backend: 2-3 hours
- Frontend Form & UI: 3-4 hours
- Balance Calculation: 1-2 hours
- Testing & Validation: 2-3 hours
- Documentation: 1 hour

**Total Estimated Time:** 9-13 hours

## Notes

- The feature is additive and backward compatible (default savings = 0)
- Existing simulations will continue to work without changes
- The formula ensures that savings reduce the impact on balance
- Validation is crucial to prevent illogical states (savings > budget)
