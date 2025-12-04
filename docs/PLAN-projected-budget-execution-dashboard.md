# Plan: Projected Budget Execution Dashboard

**Branch:** `feat/projected-budget-execution-dashboard`

**Objective:** Create a new dashboard that visualizes projected budget execution using the `default_date` field. The dashboard displays a bar chart where the X-axis represents dates and the Y-axis represents the total budgeted amount for that date within the active period. Support toggling between daily and weekly views.

## Feature Overview

### User Story
As a budget manager, I want to visualize when budgets are scheduled to be executed during the current period. This helps me understand cash flow projections and plan accordingly. I should be able to view this data by day or by week.

### Key Requirements
1. **Dashboard Page:** New route `/dashboard/projected-execution`
2. **Data Aggregation:** Sum all budgets by their `default_date` within the active period
3. **Default Handling:** Use day 1 of the period as default for budgets without a `default_date`
4. **Chart Display:** Bar chart with dates on X-axis, budget amounts on Y-axis
5. **View Toggle:** Switch between daily and weekly aggregation
6. **Sidebar Menu:** Add "Ejecución Proyectada" menu item under a new "Análisis" section
7. **Responsive Design:** Works on mobile, tablet, and desktop

## Implementation Plan

### Phase 1: Backend - API Endpoint [-]
**Task:** Create API endpoint to aggregate budget data by date

- [ ] Create `/app/api/budget-execution/[periodId]/route.ts`
  - Input: period ID, view mode (daily/weekly), active period date range
  - Output: Aggregated budget data grouped by date or week
  - Logic:
    - Fetch all budgets for the period with default_date and expected_amount
    - For budgets without default_date, use period start date (day 1)
    - Group by date (daily view) or week number (weekly view)
    - Sum expected_amount for each date/week
    - Return sorted array with date/week and total amount
  - Error Handling: Validate period exists, handle invalid date ranges
  - Response Type: `BudgetExecutionData[]` with `date`, `amount`, `weekNumber` (optional)

**Files to Create:**
- `/app/api/budget-execution/[periodId]/route.ts`

**Files to Modify:**
- `/types/funds.ts` - Add response types

### Phase 2: Frontend - Data Fetching Utilities [-]
**Task:** Create utilities for fetching and processing budget execution data

- [ ] Create `/lib/budget-execution-utils.ts`
  - `fetchBudgetExecutionData()` - Fetch data from API
  - `groupBudgetsByWeek()` - Group daily data into weeks
  - `calculateWeekBoundaries()` - Get start/end dates for each week
  - `formatChartData()` - Transform API response for Recharts
  - `getDateRange()` - Get min/max dates for period

**Files to Create:**
- `/lib/budget-execution-utils.ts`

### Phase 3: Frontend - Dashboard Page [-]
**Task:** Create the main dashboard page with chart and controls

- [ ] Create `/app/dashboard/projected-execution/page.tsx`
  - Client component using `useBudget()` context
  - State Management:
    - `viewMode`: 'daily' | 'weekly' - Toggle between views
    - `isLoading`: Boolean for data fetching state
    - `error`: Error message display
  - Layout:
    - Card header with title "Ejecución Proyectada del Presupuesto"
    - Toggle buttons: "Diario" and "Semanal" with visual indicator
    - KPI cards showing:
      - Total budgeted amount for period
      - Average daily/weekly budget
      - Peak budget date/week
    - Recharts BarChart with:
      - X-axis: Date (daily) or Week # (weekly) - rotated 45° for readability
      - Y-axis: Budget amount (formatted as currency)
      - Bars colored by payment method (optional enhancement)
      - Tooltip showing exact amounts
      - Responsive height (400px)
    - Loading state: Skeleton or spinner
    - Error state: Error message with retry button
  - Data Fetching:
    - Fetch budget data when component mounts or active period changes
    - Auto-switch to weekly view if more than 31 days in period (UX optimization)
  - Performance:
    - Memoize chart data calculation
    - Memoize KPI calculations

**Files to Create:**
- `/app/dashboard/projected-execution/page.tsx`

### Phase 4: Frontend - Sidebar Navigation [-]
**Task:** Add new menu item to sidebar navigation

- [ ] Modify `/components/app-sidebar.tsx`
  - Add new "Análisis" collapsible menu section (or add to existing dashboard section)
  - Add menu item: "Ejecución Proyectada" with link to `/dashboard/projected-execution`
  - Use TrendingUp or BarChart icon for visual consistency
  - Update `isActive()` logic to handle new route
  - Consider adding after "Overspend Actual" menu item

**Files to Modify:**
- `/components/app-sidebar.tsx`

### Phase 5: Types & Interfaces [-]
**Task:** Define TypeScript types for the feature

- [ ] Add to `/types/funds.ts`:
  - `BudgetExecutionData` interface:
    ```typescript
    interface BudgetExecutionData {
      date: string; // YYYY-MM-DD
      amount: number; // Total budget for this date
      weekNumber?: number; // Week number (1-53) for weekly view
      weekStart?: string; // Start date of week (YYYY-MM-DD)
      weekEnd?: string; // End date of week (YYYY-MM-DD)
      dayOfWeek?: number; // 0-6 (for display purposes)
    }
    ```
  - `BudgetExecutionRequest` interface for API payload
  - `BudgetExecutionResponse` interface for API response
  - `BudgetExecutionViewMode` type: 'daily' | 'weekly'

**Files to Modify:**
- `/types/funds.ts`

### Phase 6: Tests [-]
**Task:** Write unit and integration tests

- [ ] Create `/lib/__tests__/budget-execution-utils.test.ts`
  - Test date grouping logic (daily view)
  - Test week grouping logic (weekly view)
  - Test edge cases:
    - Single day period
    - Full month period
    - Period spanning multiple weeks
    - Budgets without default_date (should use day 1)
  - Test chart data formatting
- [ ] Create `/app/api/budget-execution/__tests__/route.test.ts`
  - Test API response structure
  - Test aggregation logic
  - Test error handling (invalid period, no budgets, etc.)
  - Test both daily and weekly queries

**Files to Create:**
- `/lib/__tests__/budget-execution-utils.test.ts`
- `/app/api/budget-execution/__tests__/route.test.ts`

### Phase 7: Styling & Responsive Design [-]
**Task:** Ensure responsive design and visual polish

- [ ] Responsive chart:
  - Mobile: Single column layout, rotated X-axis labels
  - Tablet: 2-column if space allows
  - Desktop: Full width with optimized spacing
- [ ] KPI cards styling to match existing dashboard cards
- [ ] Toggle button styling with visual active state
- [ ] Dark mode support (should auto-work with existing Tailwind config)

### Phase 8: Documentation & Edge Cases [-]
**Task:** Document feature and handle edge cases

- [ ] Update CLAUDE.md with:
  - Feature description
  - How to use the dashboard
  - Data calculation logic
  - View mode switching
- [ ] Handle edge cases in code:
  - Empty periods (no budgets) - show empty state message
  - Single-day periods - works in both views
  - Budgets with NULL default_date - default to day 1
  - Performance: Large periods (100+ days) - consider pagination or auto-weekly
  - Timezone handling (all dates should be in user's local timezone)

### Phase 9: Integration & Verification [-]
**Task:** Test full feature in running application

- [ ] Run dev server: `npm run dev`
- [ ] Verify sidebar menu appears correctly
- [ ] Navigate to dashboard and verify:
  - Data loads from active period
  - Chart renders correctly
  - Daily view shows all dates
  - Weekly view aggregates properly
  - Toggle between views works smoothly
  - Responsive design on different screen sizes
- [ ] Test with multiple scenarios:
  - Period with all budgets having default_date
  - Period with mixed (some with, some without)
  - Period with no budgets
  - Period spanning different months
- [ ] Run tests: `npm test`
- [ ] Run build: `npm run build`
- [ ] Check for TypeScript errors: `npx tsc --noEmit`

### Phase 10: Commit & Code Review [-]
**Task:** Commit changes and prepare for merge

- [ ] Review all changes locally
- [ ] Stage and commit with descriptive message:
  ```
  feat: Add projected budget execution dashboard

  Create new dashboard to visualize budgeted spending distribution across
  period dates. Users can view data daily or weekly, with automatic
  aggregation and proper handling of missing default_date values.

  Features:
  - Daily/weekly toggle for budget distribution view
  - KPI cards showing total, average, and peak budgets
  - Responsive bar chart with currency formatting
  - Automatic default to day 1 for budgets without default_date
  - Sidebar menu item for easy navigation

  Fixes aggregation and display of projected budget execution.
  ```
- [ ] Verify commit is clean: `git log --oneline -1`
- [ ] Push branch if using remote: `git push origin feat/projected-budget-execution-dashboard`

## Technical Considerations

### Date Handling
- All dates in database are YYYY-MM-DD format
- Period stores month (0-indexed) and year
- default_date is calculated from category's default_day
- For weekly view, use ISO week numbering (Monday=1)
- Display locale-specific (es-MX) formatted dates

### Performance
- Memoize expensive calculations (grouping, aggregations)
- Avoid re-fetching data on every render
- Use `useMemo` for chart data transformation
- Consider pagination if periods have 100+ days

### API Design
- `GET /api/budget-execution/[periodId]?viewMode=daily|weekly`
- Include query params for filtering (optional):
  - `paymentMethod` - filter by payment method
  - `categoryId` - filter by specific category
- Return empty array if period has no budgets

### UX Enhancements (Optional for Future)
- Color code bars by payment method (Efectivo, Crédito, etc.)
- Add filter options for payment method and category
- Show actual expenses overlay on projected data
- Add period selector if not using active period only
- Export chart as image

## Success Criteria
- ✅ Dashboard page created and navigable from sidebar
- ✅ Bar chart displays budget distribution by date or week
- ✅ Toggle between daily and weekly views works smoothly
- ✅ Budgets without default_date default to day 1
- ✅ API aggregates data correctly
- ✅ Responsive on mobile, tablet, desktop
- ✅ All tests pass
- ✅ Production build succeeds
- ✅ No TypeScript errors

## File Summary

### New Files
- `/app/dashboard/projected-execution/page.tsx` - Main dashboard page
- `/app/api/budget-execution/[periodId]/route.ts` - API endpoint
- `/lib/budget-execution-utils.ts` - Utility functions
- `/lib/__tests__/budget-execution-utils.test.ts` - Utility tests
- `/app/api/budget-execution/__tests__/route.test.ts` - API tests

### Modified Files
- `/components/app-sidebar.tsx` - Add menu item
- `/types/funds.ts` - Add type definitions

### Documentation
- `/docs/PLAN-projected-budget-execution-dashboard.md` - This plan

## Notes
- Uses existing BudgetContext for active period
- Follows established patterns from other dashboards (category-bars, overspend)
- Integrates with existing default_date feature from previous implementation
- Leverages Recharts for charting (already in dependencies)
- Uses date-fns for date formatting and calculations
