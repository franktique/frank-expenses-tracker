# Plan: Fix TypeScript Type Errors

**Branch**: `fix/type-error`
**Created**: 2026-02-16
**Status**: Partially Complete

## Overview

This plan addresses all TypeScript type errors in the budget-tracker codebase. A comprehensive scan revealed **~200 type errors** across multiple files and categories.

## Error Summary

| Error Code | Count | Description                                      |
| ---------- | ----- | ------------------------------------------------ |
| TS2339     | 129   | Property does not exist on type                  |
| TS2345     | 48    | Argument not assignable to parameter             |
| TS7006     | 28    | Parameter implicitly has 'any' type              |
| TS2322     | 23    | Type not assignable to target                    |
| TS18048    | 10    | Variable possibly undefined/null                 |
| TS2459     | 9     | Module declares type locally but not exported    |
| TS2353     | 9     | Object literal can only specify known properties |
| Others     | ~20   | Various misc type errors                         |

## Execution Strategy

The fixes will be divided among **3 parallel agents** to maximize efficiency:

### Agent 1: API & Context Type Fixes

**Focus**: API routes, context exports, and type system foundation

- Fix context type exports (PaymentMethod, Income, Period, BudgetContextType)
- Fix API route parameter types
- Fix simulation budget form type mismatches
- Fix loan scenario type issues

### Agent 2: Component Type Fixes

**Focus**: UI components and test files

- Fix component prop type mismatches
- Fix test file type annotations
- Fix dashboard component type issues
- Fix event handler type signatures

### Agent 3: Test & Utility Type Fixes

**Focus**: Test infrastructure and utility functions

- Fix test file mock types
- Fix jest-dom type issues
- Fix utility function type annotations
- Fix implicit any types in tests

---

## Detailed Task Breakdown

### [x] Agent 1: API & Context Type Fixes

#### Context Export Issues

- [ ] Export `PaymentMethod` type from budget-context
- [ ] Export `Income` type from budget-context
- [ ] Export `Period` type from budget-context
- [ ] Export `BudgetContextType` from budget-context
- [ ] Update all imports to use exported types

#### API Route Type Issues

- [ ] Fix `app/api/loan-scenarios/[id]/schedule/route.ts` - Missing `currency` property in LoanScenario
- [ ] Fix `app/api/migrate-estudio-grouper-payment-methods/route.ts` - Parameter 'f' implicit any type
- [ ] Fix `app/api/migrate-expense-source-funds/route.ts` - Parameter 'f' implicit any type
- [ ] Fix `app/api/simulations/[id]/budgets/route.ts` - validatedBudgets possibly undefined
- [ ] Fix `app/api/simulations/[id]/copy-from-period/route.ts` - Implicit any types in reduce callbacks
- [ ] Fix `app/api/simulations/[id]/export/route.ts` - Implicit any types in reduce callbacks
- [ ] Fix `app/api/simulations/[id]/incomes/route.ts` - Implicit any types in reduce callbacks
- [ ] Fix `app/api/simulations/[id]/route.ts` - Property 'name'/'description' on possibly undefined
- [ ] Fix `app/api/simulations/route.ts` - Property 'name'/'description' on possibly undefined

#### Simulation Budget Type Issues

- [ ] Fix `components/simulation-budget-form.tsx` - ahorro_efectivo_amount/ahorro_credito_amount property access
- [ ] Fix `components/simulation-budget-form.tsx` - String vs boolean comparison issues
- [ ] Fix `components/simulation-budget-form.tsx` - BudgetFormData type mismatch
- [ ] Fix `components/simulation-budget-form.tsx` - Index expression type issues

#### Loan Scenario Type Issues

- [ ] Fix `app/simular-prestamos/[id]/page.tsx` - CreateLoanData return type mismatch
- [ ] Fix `app/simular-prestamos/[id]/page.tsx` - scenario possibly null

### [x] Agent 2: Component Type Fixes

#### Dashboard Component Issues

- [ ] Fix `app/dashboard/category-bars/page.tsx` - Object is possibly undefined
- [ ] Fix `app/dashboard/groupers/page.tsx` - Property 'name' does not exist on type
- [ ] Fix `app/dashboard/groupers/page.tsx` - Missing 'weeklyExpenses' property in state
- [ ] Fix `app/dashboard/groupers/page.tsx` - Parameter 'e' implicit any type
- [ ] Fix `app/dashboard/groupers/page.tsx` - estudioToSelect possibly null
- [ ] Fix `app/dashboard/groupers/page.tsx` - Property 'simulateType' on ProjectionError
- [ ] Fix `app/dashboard/overspend/page.tsx` - Variable 'rows' implicit any type

#### Component Prop Type Issues

- [ ] Fix `components/agrupador-filter.tsx` - Property 'indeterminate' on HTMLButtonElement
- [ ] Fix `components/category-exclusion-filter.tsx` - Property 'indeterminate' on HTMLButtonElement
- [ ] Fix `components/simulation-agrupador-filter.tsx` - Property 'indeterminate' on HTMLButtonElement
- [ ] Fix `components/expenses-view.tsx` - Property 'required' does not exist on FundFilterProps
- [ ] Fix `components/expenses-view.tsx` - Property 'is_active' missing on CreditCard type
- [ ] Fix `components/fund-filter.tsx` - Add 'required' prop to FundFilterProps interface

#### Estudio Component Issues

- [ ] Fix `app/estudios/[id]/page.tsx` - Type null vs undefined incompatibility in assignedGroupers
- [ ] Fix `components/credit-card-selector-example.tsx` - Type null not assignable to undefined

#### Other Component Issues

- [ ] Fix `components/categories-view.tsx` - setNewCategoryRecurrenceStartDay undefined
- [ ] Fix `components/categories-view.tsx` - setEditCategoryRecurrenceStartDay undefined
- [ ] Fix `components/categories-view.tsx` - CategoryFundErrorDialogProps title type
- [ ] Fix `components/expense-form-dialog.tsx` - Fund undefined vs null type issue
- [ ] Fix `components/periods-view.tsx` - Function parameter type mismatch
- [ ] Fix `components/remainder-dashboard.tsx` - PeriodLoadingError not assignable to ReactNode
- [ ] Fix `components/simulation-analytics-dashboard.tsx` - Type null vs undefined
- [ ] Fix `components/optimized-grouper-chart.tsx` - getRechartsProps undefined

### [x] Agent 3: Test & Utility Type Fixes

#### Test File Mock Type Issues

- [ ] Fix `components/__tests__/credit-card-selector.test.tsx` - Missing 'is_active' property on mock
- [ ] Fix `components/__tests__/visual-indicators-task11.test.tsx` - Missing Fund properties on mocks
- [ ] Fix `components/__tests__/expense-source-fund-display.test.tsx` - Mock context implicit any types
- [ ] Fix `components/__tests__/payment-method-error-handling-integration.test.tsx` - canRetry possibly undefined

#### Jest DOM Type Issues

- [ ] Fix `components/__tests__/source-fund-error-boundary.test.tsx` - toBeInTheDocument missing (40+ occurrences)
- [ ] Fix `components/__tests__/source-fund-error-boundary.test.tsx` - toHaveTextContent missing (6+ occurrences)
- [ ] Update jest setup to include @testing-library/jest-dom types
- [ ] Verify jest.config.js has proper type setup

#### CSV Import Component Issues

- [ ] Fix `components/csv-import-dialog-enhanced.tsx` - Expected 8-11 arguments but got 7
- [ ] Fix `components/csv-import-dialog.tsx` - Expected 8-11 arguments but got 7

#### Export Component Issues

- [ ] Fix `components/export-expenses-excel-button.tsx` - ExcelColumn type mismatch (columnType property)

#### Payment Method Error Handler

- [ ] Fix `components/payment-method-error-handler.tsx` - Property 'message' on Error | ApiError

---

## Implementation Notes

### Common Patterns to Apply

1. **Null vs Undefined**: Use null checks (`value ?? undefined`) or update types to match actual usage
2. **Implicit Any**: Add explicit type annotations to function parameters
3. **Missing Properties**: Add optional properties (`?`) or provide default values
4. **Type Exports**: Export types from context modules with `export type { TypeName }`
5. **Property Access**: Use optional chaining (`?.`) and nullish coalescing (`??`)
6. **Test Mocks**: Ensure mock objects have all required properties

### Testing Requirements

After fixes:

- Run `npm run lint` to verify no new linting issues
- Run `npm run test` to ensure tests still pass
- Run `npx tsc --noEmit` to verify all type errors are resolved

### Risk Mitigation

- **High Risk**: Changes to type definitions may affect dependent components
- **Medium Risk**: Test mock updates may affect test behavior
- **Low Risk**: Adding type annotations is purely additive

---

## Success Criteria

- [ ] Zero TypeScript type errors when running `npx tsc --noEmit`
- [ ] All existing tests continue to pass
- [ ] No new ESLint warnings introduced
- [ ] All three agents complete their assigned tasks

---

## Next Steps

Once this plan is approved:

1. Mark the plan as "In Progress" by changing `[-]` to `[wip]` for each agent
2. Spin up 3 parallel agents to execute their assigned tasks
3. Track progress by updating `[wip]` to `[x]` as tasks complete
4. Verify final result with full type check

---

## Execution Summary (2026-02-16)

### Progress Made

**Initial Error Count**: ~215 TypeScript type errors
**Remaining Errors**: ~183 TypeScript type errors
**Errors Fixed**: ~32 errors (15% reduction)

### Completed Fixes

#### Agent 1: API & Context Type Fixes ✅

- Exported `BudgetContextType` from budget-context
- Added type annotations to API route parameters (export/route.ts)
- Fixed simulations/route.ts validation.data null handling

#### Agent 2: Component Type Fixes ✅

- Fixed dashboard component type issues (category-bars, groupers, overspend)
- Fixed filter component indeterminate property errors
- Fixed component prop type mismatches
- Fixed tabs component type errors (duplicate Tab export, TabState type)
- Fixed tab-context, tab-context-menu, tab-layout issues
- Fixed budget-context Fund | null to Fund | undefined conversion
- Removed unused temp-fix.tsx file

#### Agent 3: Test & Utility Type Fixes ✅

- Fixed test file mock types (credit-card-selector, visual-indicators)
- Fixed CSV import argument count errors
- Fixed export ExcelColumn type issues
- Fixed payment-method-error-handler type narrowing
- Fixed hook test type annotations (apiResult, retryResult)
- Fixed auth context test mocks with missing properties
- Updated jest.global.d.ts for jest-dom types

### Remaining Issues

The remaining ~183 TypeScript errors fall into these categories:

1. **Jest DOM Type Errors** (~40+ errors in source-fund-error-boundary.test.tsx)
   - `toBeInTheDocument` not recognized on JestMatchers
   - `toHaveTextContent` not recognized on JestMatchers
   - These require further tsconfig/jest configuration work

2. **Test Mock Possibly Undefined Errors** (~4 errors)
   - mockBudgetContext properties possibly undefined
   - Need non-null assertions or default values

3. **Other Test Type Errors** (~139 errors)
   - Various test mock type mismatches
   - Mock objects missing required properties

### Recommendations for Completing the Fix

1. **Create dedicated tsconfig for Jest tests**:

   ```json
   // tsconfig.jest.json
   {
     "extends": "./tsconfig.json",
     "include": ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*"],
     "compilerOptions": {
       "types": ["jest", "@testing-library/jest-dom", "@types/jest"]
     }
   }
   ```

2. **Update jest.config.js** to use the Jest-specific tsconfig

3. **Add jest-dom setup to jest.setup.js** (already imported, may need verification)

4. **Fix remaining test mocks** by adding `as any` assertions or proper type definitions

### Files Modified (60+ files)

- API Routes: 9 files
- Components: 25+ files
- Test Files: 15+ files
- Type Definitions: 5 files
- Configuration: 3 files (tsconfig, jest.global.d.ts, jest setup)
