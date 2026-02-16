# Feature: Simulation Income Input and Balance Calculation

**Branch:** `feature/simulation-income-balance`
**Created:** 2025-10-01
**Status:** In Progress

## Overview

Add functionality to the simulation configuration page to input simulated income values and display a running balance calculation for each category row. The balance should decrease only when "Efectivo" (cash) payment method is used.

## Requirements

### User Story

As a user configuring budget simulations, I want to:

1. Enter simulated income amounts before the budget table
2. See a running balance that starts with the total income
3. See the balance decrease only when I allocate "Efectivo" amounts to categories
4. Understand how my cash flow will work throughout the budget period

### Acceptance Criteria

- [ ] Income input section appears before the "Presupuestos por Categoría" table
- [ ] Users can add multiple income entries with description and amount
- [ ] Total income is calculated and displayed
- [ ] Budget table includes a new "Balance" column
- [ ] Balance starts with total income and decreases row by row only for "Efectivo" amounts
- [ ] Balance is displayed with appropriate color coding (positive/negative)
- [ ] All data persists to database with auto-save functionality

## Technical Design

### Database Schema

#### New Table: `simulation_incomes`

```sql
CREATE TABLE simulation_incomes (
  id SERIAL PRIMARY KEY,
  simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_simulation_incomes_simulation_id ON simulation_incomes(simulation_id);
```

### API Endpoints

#### 1. GET `/api/simulations/[id]/incomes`

Fetch all income entries for a simulation.

**Response:**

```json
{
  "incomes": [
    {
      "id": 1,
      "simulation_id": 1,
      "description": "Salary",
      "amount": 5000000,
      "created_at": "2025-10-01T00:00:00Z",
      "updated_at": "2025-10-01T00:00:00Z"
    }
  ],
  "total_income": 5000000,
  "simulation": {
    "id": 1,
    "name": "October Budget"
  }
}
```

#### 2. POST `/api/simulations/[id]/incomes`

Create a new income entry.

**Request:**

```json
{
  "description": "Salary",
  "amount": 5000000
}
```

#### 3. PUT `/api/simulations/[id]/incomes/[incomeId]`

Update an existing income entry.

#### 4. DELETE `/api/simulations/[id]/incomes/[incomeId]`

Delete an income entry.

### TypeScript Types

```typescript
export interface SimulationIncome {
  id: number;
  simulation_id: number;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
}

export const SimulationIncomeSchema = z.object({
  id: z.number(),
  simulation_id: z.number(),
  description: z.string().min(1).max(255),
  amount: z.number().min(0),
  created_at: z.string(),
  updated_at: z.string(),
});

export const CreateSimulationIncomeSchema = z.object({
  description: z.string().min(1, 'Description is required').max(255),
  amount: z.number().positive('Amount must be positive'),
});
```

### Component Structure

#### New Component: `SimulationIncomeInput`

- Location: `/components/simulation-income-input.tsx`
- Features:
  - List/table of income entries
  - Add new income button
  - Inline edit/delete for each entry
  - Total income summary card
  - Auto-save on blur
  - Loading states
  - Error handling

#### Updated Component: `SimulationBudgetForm`

- Add "Balance" column after "Total" column
- Implement balance calculation:
  ```typescript
  let runningBalance = totalIncome;
  categories.forEach((category) => {
    const efectivoAmount = budgetData[category.id].efectivo_amount;
    runningBalance -= parseFloat(efectivoAmount) || 0;
    // Display runningBalance for this row
  });
  ```
- Color coding: green (positive), red (negative), orange (warning < 10%)

## Implementation Checklist

### Phase 1: Database & Backend

- [x] Create migration API endpoint `/api/migrate-simulation-incomes/route.ts`
- [x] Add TypeScript types to `/types/funds.ts` or new file
- [x] Create Zod validation schemas
- [x] Implement GET `/api/simulations/[id]/incomes`
- [x] Implement POST `/api/simulations/[id]/incomes`
- [x] Implement PUT `/api/simulations/[id]/incomes/[incomeId]`
- [x] Implement DELETE `/api/simulations/[id]/incomes/[incomeId]`

### Phase 2: Frontend Components

- [x] Create `SimulationIncomeInput` component
  - [x] Income list/table UI
  - [x] Add income form
  - [x] Edit/delete functionality
  - [x] Total calculation
  - [x] Auto-save logic
- [x] Update `SimulationBudgetForm` component
  - [x] Add Balance column to table
  - [x] Implement balance calculation
  - [x] Add color coding
  - [x] Update table header

### Phase 3: Integration

- [x] Update `/app/simular/[id]/page.tsx`
  - [x] Add income section before budget form
  - [x] Pass income data to budget form
  - [x] Update summary cards
- [x] Add loading states
- [x] Add error boundaries
- [x] Add validation feedback

### Phase 4: Testing

- [-] Test income CRUD operations
- [-] Test balance calculation (Efectivo only)
- [-] Test balance calculation (Crédito only)
- [-] Test mixed payment methods
- [-] Test negative balance scenarios
- [-] Test auto-save functionality
- [-] Test error handling
- [-] Test responsive design

## Balance Calculation Logic

```typescript
// Calculate running balance
const calculateBalance = (
  totalIncome: number,
  categories: Category[],
  budgetData: BudgetFormData
): Map<string, number> => {
  const balances = new Map<string, number>();
  let runningBalance = totalIncome;

  // Sort categories by name (same order as display)
  const sortedCategories = [...categories].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  sortedCategories.forEach((category) => {
    const categoryData = budgetData[String(category.id)];
    if (categoryData) {
      // Only decrease balance for Efectivo (cash) amounts
      const efectivoAmount = parseFloat(categoryData.efectivo_amount) || 0;
      runningBalance -= efectivoAmount;
      balances.set(String(category.id), runningBalance);
    }
  });

  return balances;
};
```

## UI Mockup

```
┌─────────────────────────────────────────────────────────┐
│ Ingresos Simulados                                      │
├─────────────────────────────────────────────────────────┤
│ Descripción        │ Monto          │ Acciones         │
│ Salario            │ $ 5.000.000    │ [Edit] [Delete]  │
│ Freelance          │ $ 1.000.000    │ [Edit] [Delete]  │
│ [+ Agregar Ingreso]                                     │
│                                                          │
│ Total Ingresos: $ 6.000.000                             │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Presupuestos por Categoría                              │
├─────────────────────────────────────────────────────────┤
│ Categoría  │ Efectivo │ Crédito │ Total   │ Balance    │
│ Mercado    │ 500.000  │ 0       │ 500.000 │ 5.500.000  │
│ Arriendo   │ 2.000.000│ 0       │ 2.000.000│ 3.500.000 │
│ Netflix    │ 0        │ 50.000  │ 50.000  │ 3.500.000  │
└─────────────────────────────────────────────────────────┘
```

## Testing Scenarios

1. **Basic Income Entry**
   - Add income with description and amount
   - Verify it appears in list
   - Verify total updates

2. **Balance Calculation - Efectivo Only**
   - Set income to $ 5.000.000
   - Add categories with only Efectivo
   - Verify balance decreases correctly

3. **Balance Calculation - Crédito Only**
   - Set income to $ 5.000.000
   - Add categories with only Crédito
   - Verify balance stays at $ 5.000.000

4. **Mixed Payment Methods**
   - Set income to $ 5.000.000
   - Add mix of Efectivo and Crédito
   - Verify only Efectivo decreases balance

5. **Negative Balance**
   - Set low income amount
   - Add high Efectivo amounts
   - Verify balance goes negative with red color

6. **Auto-save**
   - Add/edit income
   - Blur field
   - Refresh page
   - Verify data persisted

## Notes

- Use existing patterns from `SimulationBudgetForm` for consistency
- Follow the same auto-save on blur pattern
- Use the same error handling and validation approach
- Maintain responsive design for mobile
- Consider adding a warning when balance goes negative

## References

- `/components/simulation-budget-form.tsx` - Pattern for auto-save and validation
- `/app/api/simulations/[id]/budgets/route.ts` - Pattern for API endpoints
- `/lib/simulation-validation.ts` - Pattern for validation utilities
