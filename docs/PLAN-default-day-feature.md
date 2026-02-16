# Plan: Default Day Feature for Categories

**Date**: December 4, 2025
**Branch**: (to be created)
**Feature**: Add default day selection to categories and sync with budget dates

## Overview

Add a `default_day` field to categories (values 1-31) that represents the preferred day of the month for that category's expenses. When this value is set or updated, automatically update the `default_date` field in all related budgets across all periods to use the specified day within the maximum month of each period.

## Current State

### Database Schema

- **Categories Table**: Currently has only `id` and `name` columns
  - `tipo_gasto` already added via migration
  - `fund_id` available for fund relationships
- **Budgets Table**: Has `id`, `category_id`, `period_id`, `expected_amount`, `payment_method`
  - **NO date-related fields exist** (no `default_date`, `recurrent_date`, or `default_day`)

### Frontend

- Categories are edited in `/components/categories-view.tsx`
- Uses dialog-based add/edit operations
- Type definitions in `/types/funds.ts`

## Implementation Plan

### Phase 1: Database Schema Migration

- [x] **1.1** Create database migration script to add columns:
  - Add `default_day INTEGER` to `categories` table (NULLABLE, values 1-31)
  - Add `default_date DATE` to `budgets` table (NULLABLE)
  - Add validation constraint: `CHECK(default_day IS NULL OR (default_day >= 1 AND default_day <= 31))`

- [x] **1.2** Create API migration endpoint:
  - File: `/app/api/migrate-default-day/route.ts`
  - Follow existing migration pattern (idempotent, GET-based)
  - Check if columns exist before creating
  - Return status and migration details

- [x] **1.3** Create rollback script in `/scripts/` for safety:
  - File: `rollback-default-day-migration.sql`
  - Remove `default_day` from categories table
  - Remove `default_date` from budgets table

### Phase 2: Type Definitions & Validation

- [x] **2.1** Update Category interface in `/types/funds.ts`:
  - Add `default_day?: number` field (1-31 or null)

- [x] **2.2** Update Budget interface in `/types/funds.ts`:
  - Add `default_date?: Date | null` field

- [x] **2.3** Create validation schemas:
  - Update `CreateCategorySchema` with `default_day`
  - Update `UpdateCategorySchema` with `default_day`
  - Update `BudgetSchema` with `default_date`
  - Validation rules:
    - `default_day` must be an integer between 1-31 (inclusive) or null
    - `default_date` is a date field

### Phase 3: Backend API Updates

- [x] **3.1** Update category retrieval endpoint:
  - File: `/app/api/categories/[id]/route.ts` (GET handler)
  - Include `default_day` in response

- [x] **3.2** Update category creation endpoint:
  - File: `/app/api/categories/route.ts` (POST handler)
  - Accept `default_day` in request body
  - Validate before saving

- [x] **3.3** Update category update endpoint:
  - File: `/app/api/categories/[id]/route.ts` (PUT handler)
  - Accept `default_day` updates
  - **When `default_day` is updated:**
    1. Fetch all budgets for this category across ALL periods
    2. For each budget:
       - Get the period's month and year information
       - Calculate `default_date` = last valid day of month if `default_day` > days in month
       - Otherwise use `default_day` as the date
       - Update budget's `default_date` field
    3. Return success with number of budgets updated

- [x] **3.4** Create utility function for date calculation:
  - File: `/lib/default-day-utils.ts`
  - Function: `calculateDefaultDate(day: number, periodStartDate: Date, periodEndDate: Date): Date`
  - Logic: Return the specified day within the period, clamped to valid day range
  - Handle edge cases: Feb 29/30/31, months with fewer days

- [x] **3.5** Update budget listing endpoint:
  - File: `/app/api/budgets/route.ts` (GET handler)
  - Include `default_date` in responses

### Phase 4: Frontend Type Updates

- [x] **4.1** Update Category interface usage across components:
  - `/components/categories-view.tsx`
  - `/components/category-form-dialog.tsx` (if exists)
  - Any other category display/edit components

### Phase 5: Category Edit UI Component

- [x] **5.1** Create/update category edit dialog:
  - Add `default_day` input field (number input, range 1-31)
  - Label: "Día por Defecto" (Default Day)
  - Placement: After `tipo_gasto` field
  - Allow null/empty for backward compatibility

- [x] **5.2** Update category list display:
  - File: `/components/categories-view.tsx`
  - Add "Día por Defecto" column showing:
    - The day number (1-31)
    - Or empty/dash if not set
  - Column positioned between "Tipo Gasto" and "Acciones"

- [x] **5.3** Add form validation in UI:
  - Validate input is number between 1-31
  - Show error message for invalid values
  - Allow empty value (null)

### Phase 6: Budget Update Logic Integration

- [x] **6.1** Update category update handler in API:
  - After category is updated with new `default_day`:
    - Fetch all related budgets via SQL query
    - Batch update all budgets with calculated `default_date`
    - Use transaction to ensure atomicity

- [x] **6.2** Create service function:
  - File: `/lib/category-budget-sync.ts`
  - Function: `updateBudgetDefaultDatesForCategory(categoryId: string, defaultDay: number): Promise<number>`
  - Query: Get all budgets for category with period info
  - Update: Set `default_date` for each budget
  - Return: Number of budgets updated

- [x] **6.3** Add logging:
  - Log when updating budgets
  - Track number of affected budgets
  - Log any errors during updates

### Phase 7: Testing

- [x] **7.1** Create test file for date calculation utility:
  - File: `/lib/__tests__/default-day-utils.test.ts`
  - Test cases:
    - Valid day in month (e.g., 15th)
    - Edge case: Day > days in month (e.g., 31st in Feb)
    - Boundary values: 1st and 31st
    - Different months with different day counts

- [x] **7.2** Test category update API:
  - Verify `default_day` is saved correctly
  - Verify budgets are updated with `default_date`
  - Verify correct number of budgets updated
  - Test with no budgets, one budget, multiple budgets

- [x] **7.3** Manual testing:
  - Create category with `default_day` = 15
  - Create budgets in multiple periods
  - Verify `default_date` is calculated correctly for each period
  - Update `default_day` to different value
  - Verify all budgets are updated with new dates

### Phase 8: UI Polish & Finalization

- [x] **8.1** Add form submission feedback:
  - Show loading state while updating
  - Show success message: "Categoría actualizada y X presupuestos actualizados"
  - Show error message if update fails

- [x] **8.2** Update category list refresh:
  - Refresh displayed data after update
  - Show new `default_day` value in list

- [x] **8.3** Documentation:
  - Add inline comments explaining date calculation logic
  - Update CLAUDE.md with new feature if needed
  - Document the default_day feature and its behavior

### Phase 9: Migration Endpoint Testing

- [x] **9.1** Test migration endpoint:
  - Verify columns are created if they don't exist
  - Verify endpoint is idempotent (multiple calls don't fail)
  - Verify existing data is not affected

- [x] **9.2** Verify backward compatibility:
  - Existing categories without `default_day` still work
  - Existing budgets without `default_date` still work
  - UI gracefully handles missing values

## Technical Details

### Date Calculation Logic

**Goal**: Given a day number (1-31) and a period, calculate the actual date for that day in the period's last month.

**Algorithm**:

```
1. Get period's year and start/end months
2. For each month in the period:
   - Get number of days in that month
   - If default_day <= daysInMonth: use that day
   - Else: use last day of month (daysInMonth)
3. Return the calculated date for the final month
```

**Example**:

- Category default_day = 15
- Period: Jan-Mar 2025
- Result: 2025-03-15 (15th of March, the last month)

**Edge Case**:

- Category default_day = 31
- Period: Jan-Feb 2025
- Result: 2025-02-28 (last day of Feb, since it only has 28 days)

### Database Constraints

```sql
-- Add to categories table
ALTER TABLE categories
ADD COLUMN default_day INTEGER
CHECK(default_day IS NULL OR (default_day >= 1 AND default_day <= 31));

-- Add to budgets table
ALTER TABLE budgets
ADD COLUMN default_date DATE;
```

## Success Criteria

✅ **Database**: Columns added with proper constraints
✅ **API**: Category endpoints accept/return `default_day`
✅ **API**: Budget endpoints return `default_date`
✅ **API**: Updating category's `default_day` updates all related budget dates
✅ **UI**: Categories table displays "Día por Defecto" column
✅ **UI**: Category edit dialog includes default day input (1-31)
✅ **UI**: Input validation prevents invalid values
✅ **UX**: Feedback message shows number of budgets updated
✅ **Tests**: Date calculation utility has 90%+ coverage
✅ **Backward Compatibility**: Null values handled gracefully

## Implementation Order

1. Database migration (Phase 1)
2. Type definitions (Phase 2)
3. API endpoints (Phase 3-4)
4. Frontend UI (Phase 5-6)
5. Testing (Phase 7)
6. Polish (Phase 8-9)

## Potential Risks & Mitigation

| Risk                        | Impact                     | Mitigation                              |
| --------------------------- | -------------------------- | --------------------------------------- |
| Invalid day values (0, 32+) | Data corruption            | Input validation in UI + DB constraints |
| Month boundary issues       | Incorrect dates            | Comprehensive date calculation tests    |
| Performance on bulk updates | Slow response              | Batch update with transaction           |
| Backward compatibility      | Breaking existing features | Nullable fields, null checks in code    |

## Notes

- The feature is entirely backward compatible (nullable fields)
- Date calculation uses existing period information
- No breaking changes to existing APIs
- Migration follows established pattern in codebase
