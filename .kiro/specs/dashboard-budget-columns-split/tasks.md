# Implementation Plan

- [x] 1. Update Dashboard API to calculate separate budget totals by payment method
  - Modify the SQL query in `/app/api/dashboard/route.ts` to calculate credit and cash/debit budget totals separately
  - Add new fields `credit_budget` and `cash_debit_budget` to the API response
  - Ensure fund filtering works correctly with the new budget calculations
  - Test the API response to verify correct budget totals for different payment method combinations
  - _Requirements: 1.2, 1.3, 4.1, 4.2_

- [x] 2. Update Dashboard View component to display split budget columns
  - Modify the table structure in `components/dashboard-view.tsx` to include two new budget columns
  - Add "Presupuesto Crédito" and "Presupuesto Efectivo" column headers
  - Position the new columns logically between category name and total expenses
  - Update table cells to display the new budget values with proper currency formatting
  - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.4_

- [x] 3. Update totals row calculation for split budget columns
  - Modify the totals row calculation to sum credit budgets and cash/debit budgets separately
  - Ensure the totals row displays correct sums for both new budget columns
  - Verify that the sum of both columns equals the previous total budget amount
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 4. Update TypeScript types for budget data structure
  - Add new fields to the budget summary type definition
  - Update any interfaces or types that reference budget data
  - Ensure type safety for the new budget fields throughout the component
  - _Requirements: 1.2, 1.3_
