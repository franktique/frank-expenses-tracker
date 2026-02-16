# Implementation Plan: Add "Día por Defecto" Column to Main Dashboard

**Branch**: `feat/add-day-column`
**Created**: 2025-12-10
**Status**: Completed

## Overview

Add a new column to the main dashboard's budget summary table to display the "Día por Defecto" (default day) value from each category. If a category has no default_day value, display "1" as the default. Include sorting capability by clicking on the column header.

## Context

The `default_day` field already exists in the database schema (`categories.default_day` as INTEGER 1-31) and is actively used in other parts of the application (e.g., Budget Execution dashboard). This task exposes this existing field in the main dashboard table.

## Technical Analysis

### Current State

- **Database**: `categories.default_day` field exists with proper constraints and indexing
- **Type Definition**: `Category` interface includes `default_day?: number | null`
- **Dashboard API**: Currently does NOT return `default_day` in budget summary query
- **Dashboard UI**: Table currently has 9 columns, no default_day column
- **Related Components**: Budget Execution dashboard already uses `default_day` successfully

### Files to Modify

1. `/types/dashboard.ts` - Update `BudgetSummaryItem` interface
2. `/app/api/dashboard/route.ts` - Update SQL queries to include `default_day`
3. `/components/dashboard-view.tsx` - Add column header and cell rendering

## Implementation Plan

### Phase 1: Backend Changes

#### [ ] Task 1.1: Update Type Definition

**File**: `/types/dashboard.ts`

- [ ] Add `default_day?: number | null;` to `BudgetSummaryItem` interface (around line 27)
- [ ] Verify the type matches the Category interface definition
- [ ] Ensure optional and nullable for backward compatibility

**Acceptance Criteria**:

- TypeScript compilation succeeds
- Type definition allows both number values (1-31) and null

---

#### [ ] Task 1.2: Update Dashboard API - No Fund Filter Query

**File**: `/app/api/dashboard/route.ts`

- [ ] Locate the main SQL query (lines 108-145) that builds budget summary without fund filter
- [ ] Add `c.default_day` to the SELECT clause in the main query
- [ ] Add `default_day: row.default_day ?? null` to the object mapping (around line 170-183)

**SQL Modification**:

```sql
SELECT
  ce.category_id,
  ce.category_name,
  c.default_day,  -- ADD THIS LINE
  cb.credit_budget,
  cb.cash_debit_budget,
  ...
```

**Object Mapping**:

```typescript
budgetSummary: rows.map((row: any) => ({
  category_id: row.category_id,
  category_name: row.category_name,
  default_day: row.default_day ?? null,  // ADD THIS LINE
  credit_budget: parseFloat(row.credit_budget || 0),
  ...
}))
```

**Acceptance Criteria**:

- API returns `default_day` field in response
- Field is null when category has no default_day set
- Field contains correct integer (1-31) when set

---

#### [ ] Task 1.3: Update Dashboard API - With Fund Filter Query

**File**: `/app/api/dashboard/route.ts`

- [ ] Locate the fund-filtered SQL query (lines 147-200+)
- [ ] Add `c.default_day` to the SELECT clause
- [ ] Ensure consistent field ordering with non-filtered query

**Acceptance Criteria**:

- API returns `default_day` when fund filter is active
- Field behavior matches non-filtered query
- No breaking changes to other fields

---

### Phase 2: Frontend Changes

#### [ ] Task 2.1: Add Column Header to Dashboard Table

**File**: `/components/dashboard-view.tsx`

- [ ] Locate table header section (lines 617-634)
- [ ] Add new `<TableHead>` element for "Día por Defecto" column
- [ ] Position after "Categoria" column (second column position)
- [ ] Add appropriate styling class (`className="text-center"` or `className="text-right"`)

**Code to Add** (around line 627):

```tsx
<TableHead>Categoria</TableHead>
<TableHead className="text-center">Día por Defecto</TableHead>
<TableHead className="text-right">Presupuesto Crédito</TableHead>
```

**Acceptance Criteria**:

- Column header displays "Día por Defecto"
- Header is properly aligned with cells below
- Visual styling is consistent with other headers

---

#### [ ] Task 2.2: Add Cell Rendering in Table Body

**File**: `/components/dashboard-view.tsx`

- [ ] Locate table body cell rendering (lines 651-691)
- [ ] Add new `<TableCell>` after the category name cell
- [ ] Display `item.default_day ?? 1` (show "1" if null/undefined)
- [ ] Apply centered or right-aligned styling for consistency

**Code to Add** (around line 665, after category cell):

```tsx
<TableCell className={getCategoryNameStyle(item)}>
  <div className="flex items-center gap-2">
    <span>{item.category_name}</span>
    <Button>...</Button>
  </div>
</TableCell>
<TableCell className="text-center">
  {item.default_day ?? 1}
</TableCell>
<TableCell className="text-right">
  {formatCurrency(item.credit_budget)}
</TableCell>
```

**Acceptance Criteria**:

- Cell displays numeric day value (1-31)
- Null/undefined values display as "1"
- Styling is consistent with other numeric columns

---

#### [ ] Task 2.3: Update Empty State ColSpans

**File**: `/components/dashboard-view.tsx`

- [ ] Find all `colSpan` attributes in empty states/loading states (currently set to 9)
- [ ] Update from `colSpan={9}` to `colSpan={10}`
- [ ] Search for all occurrences in the file (likely multiple)

**Locations to Update**:

- Loading state message
- No data/empty state message
- Any other row that spans full table width

**Acceptance Criteria**:

- Empty state rows span full table width correctly
- No visual misalignment when table is empty/loading

---

### Phase 3: Sorting Functionality

#### [ ] Task 3.1: Add Sort State Management

**File**: `/components/dashboard-view.tsx`

- [ ] Add state for sorting: `const [sortBy, setSortBy] = useState<'default_day' | null>(null)`
- [ ] Add state for sort direction: `const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')`
- [ ] Consider grouping with existing state around line 70-85

**State Variables to Add**:

```typescript
const [sortBy, setSortBy] = useState<'default_day' | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
```

**Acceptance Criteria**:

- State initializes correctly
- State updates trigger re-renders
- No conflicts with existing state management

---

#### [ ] Task 3.2: Implement Sort Logic

**File**: `/components/dashboard-view.tsx`

- [ ] Create a `getSortedBudgetSummary` function or inline sorting logic
- [ ] Apply sorting to `budgetSummary` array before rendering
- [ ] Handle null values (treat as 1 for sorting purposes, or sort nulls to end)
- [ ] Use memoization (`useMemo`) to prevent unnecessary re-sorts

**Sorting Logic**:

```typescript
const sortedBudgetSummary = useMemo(() => {
  if (!sortBy) return budgetSummary;

  return [...budgetSummary].sort((a, b) => {
    const aValue = a.default_day ?? 1;
    const bValue = b.default_day ?? 1;

    if (sortDirection === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
}, [budgetSummary, sortBy, sortDirection]);
```

**Acceptance Criteria**:

- Sorting works correctly in ascending order
- Sorting works correctly in descending order
- Null values handled appropriately
- Performance is acceptable (no lag with many categories)

---

#### [ ] Task 3.3: Add Click Handler to Column Header

**File**: `/components/dashboard-view.tsx`

- [ ] Make "Día por Defecto" header clickable
- [ ] Add onClick handler to toggle sort direction
- [ ] Add visual indicator for current sort state (arrow icon or similar)
- [ ] Follow pattern similar to simulation budget form sorting (if applicable)

**Header Update**:

```tsx
<TableHead
  className="cursor-pointer text-center hover:bg-accent"
  onClick={handleDefaultDaySort}
>
  <div className="flex items-center justify-center gap-1">
    Día por Defecto
    {sortBy === 'default_day' &&
      (sortDirection === 'asc' ? (
        <ArrowUp className="h-4 w-4" />
      ) : (
        <ArrowDown className="h-4 w-4" />
      ))}
  </div>
</TableHead>
```

**Click Handler**:

```typescript
const handleDefaultDaySort = () => {
  if (sortBy !== 'default_day') {
    setSortBy('default_day');
    setSortDirection('asc');
  } else if (sortDirection === 'asc') {
    setSortDirection('desc');
  } else {
    setSortBy(null); // Clear sorting
  }
};
```

**Acceptance Criteria**:

- Clicking header cycles through: no sort → asc → desc → no sort
- Visual indicator shows current sort state
- Hover effect indicates clickability
- Sorting applies immediately on click

---

### Phase 4: Testing and Validation

#### [ ] Task 4.1: Manual Testing - Data Display

- [ ] Test with categories that have `default_day` values set (1-31)
- [ ] Test with categories where `default_day` is NULL
- [ ] Verify "1" displays as default for NULL values
- [ ] Test with mixed data (some with values, some NULL)

**Test Cases**:

1. Category with `default_day = 15` → displays "15"
2. Category with `default_day = null` → displays "1"
3. Category with `default_day = 1` → displays "1"
4. Category with `default_day = 31` → displays "31"

---

#### [ ] Task 4.2: Manual Testing - Sorting Functionality

- [ ] Click header once → verify ascending sort (1, 2, 3, ...)
- [ ] Click header twice → verify descending sort (31, 30, 29, ...)
- [ ] Click header thrice → verify sort clears (returns to original order)
- [ ] Verify null values sort correctly (treated as 1 or sorted to end)

**Sorting Test Cases**:

1. Ascending: [1, 5, 10, 15, 20, 31]
2. Descending: [31, 20, 15, 10, 5, 1]
3. Mixed with nulls: Verify nulls don't break sort

---

#### [ ] Task 4.3: Manual Testing - UI/UX Validation

- [ ] Verify column width is appropriate (not too wide/narrow)
- [ ] Check responsive behavior on mobile/tablet
- [ ] Verify alignment is consistent with other columns
- [ ] Test with fund filter active/inactive
- [ ] Test with excluded categories filter
- [ ] Verify empty state messages still work correctly

**Browser Testing**:

- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari/Chrome

---

#### [ ] Task 4.4: Integration Testing

- [ ] Test that adding new categories with `default_day` shows correctly
- [ ] Test editing a category's `default_day` updates in dashboard
- [ ] Test that deleting a category doesn't break table rendering
- [ ] Verify API response performance (no significant slowdown)
- [ ] Check console for any errors or warnings

---

### Phase 5: Documentation and Cleanup

#### [ ] Task 5.1: Update CLAUDE.md (if needed)

- [ ] Document new column in dashboard description
- [ ] Update any table structure documentation
- [ ] Note sorting capability

---

#### [ ] Task 5.2: Code Review Checklist

- [ ] All TypeScript types are correct and compile without errors
- [ ] No console.log statements left in code
- [ ] Code follows existing formatting/style conventions
- [ ] No commented-out code blocks
- [ ] All todos/fixmes addressed or removed

---

#### [ ] Task 5.3: Final Verification

- [ ] Run `npm run build` to ensure production build succeeds
- [ ] Run `npm run lint` to check for linting issues
- [ ] Test the feature one final time in dev environment
- [ ] Verify no breaking changes to existing dashboard functionality

---

## Success Criteria

### Must Have (MVP)

- ✅ "Día por Defecto" column displays in main dashboard table
- ✅ Column shows numeric value (1-31) from category's `default_day`
- ✅ Null/undefined values display as "1" (default)
- ✅ Column is properly aligned and styled
- ✅ Sorting works (ascending/descending/off)
- ✅ No breaking changes to existing functionality

### Nice to Have

- Visual indicator of sort state (arrow icons)
- Tooltip explaining "day of month" meaning
- Smooth sort transition animation

## Risks and Mitigation

### Risk 1: API Performance

**Risk**: Adding `default_day` to query might slow down dashboard load
**Mitigation**: Field already indexed, minimal performance impact expected

### Risk 2: Null Handling

**Risk**: Unexpected null/undefined behavior in edge cases
**Mitigation**: Use nullish coalescing (`??`) consistently, test thoroughly

### Risk 3: Responsive Design

**Risk**: Additional column might break mobile layout
**Mitigation**: Test on mobile, may need horizontal scroll or hide column on small screens

## Rollback Plan

If issues arise:

1. Revert commits from this branch
2. Feature is additive - removing it won't break existing functionality
3. Database schema unchanged - no migrations to rollback

## Estimated Timeline

- Phase 1 (Backend): ~30 minutes
- Phase 2 (Frontend Display): ~30 minutes
- Phase 3 (Sorting): ~45 minutes
- Phase 4 (Testing): ~30 minutes
- Phase 5 (Documentation): ~15 minutes

**Total Estimated Time**: ~2.5 hours

## Notes

- The `default_day` field infrastructure already exists and is tested
- This is primarily a UI enhancement to expose existing data
- Sorting implementation can follow patterns from simulation budget form
- Consider adding this field to Excel export as well (future enhancement)

## References

- Main Dashboard Component: `/components/dashboard-view.tsx`
- Dashboard API: `/app/api/dashboard/route.ts`
- Type Definitions: `/types/dashboard.ts`, `/types/funds.ts`
- Database Schema: `/scripts/create-default-day-migration.sql`
- Related Feature: Budget Execution Dashboard (`/app/api/budget-execution/[periodId]/route.ts`)
