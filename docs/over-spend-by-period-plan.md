# Plan: Add Cross-Period Overspend View

**Branch**: `over-spend-by-period`
**Date Created**: November 10, 2025
**Status**: Planning Phase

## Overview

Add a new view to the "Overspend Actual" menu that displays overspend data across all existing periods (instead of just the active period). This will provide users with historical analysis of spending patterns and overspend trends over time.

## Current State

The current "Overspend Actual" view (`/dashboard/overspend`) shows:
- Overspend data **for the active period only**
- Horizontal bar chart with Planeado (Budgeted) vs Excedente (Overspend)
- Payment method filtering (Todos, Efectivo/Débito, Tarjeta Crédito)
- Category exclusion filter
- KPI cards showing totals per payment method

## Proposed Solution

### Menu Structure
Create a submenu under "Overspend Actual" with two options:
1. **Current Period** (existing view) - Shows overspend for active period
2. **All Periods** (new view) - Shows overspend aggregated across all periods

### New View Implementation

**Route**: `/dashboard/overspend/all-periods`

**Features**:
- Display overspend data aggregated across all available periods
- Multiple visualization options:
  - **Option A**: Stacked bar chart showing overspend by category, stacked by period
  - **Option B**: Line chart showing cumulative overspend trend over time
  - **Option C**: Summary table with overspend per category across all periods
- Payment method filtering (same as current view)
- Category exclusion filter (same as current view)
- Period range selector (optional: ability to select date range)
- KPI cards showing total overspend across all periods

## Implementation Plan

### Phase 1: Setup & Data Layer
- [x] Create API endpoint `GET /api/overspend/all-periods` to fetch aggregated overspend data
  - Accept optional filters: `paymentMethod`, `excludedCategories`, `periodRange`
  - Return data structure with categories and period-wise breakdown
- [x] Update BudgetContext to support all-periods data fetching
- [x] Add types for all-periods overspend data structure

### Phase 2: UI Navigation
- [x] Update sidebar menu structure to convert "Overspend Actual" from simple link to submenu
- [x] Add submenu items: "Current Period" and "All Periods"
- [x] Update active link detection to handle submenu routing

### Phase 3: New View Component
- [x] Create `/app/dashboard/overspend/all-periods/page.tsx`
- [x] Implement payment method filter dropdown
- [x] Implement category exclusion filter with settings
- [x] Create KPI cards for total overspend per payment method (all periods)
- [x] Create visualization component (choose visualization approach)

### Phase 4: Visualization
- [x] Design and implement data aggregation logic
- [x] Create appropriate chart component based on chosen visualization
- [x] Implement responsive layout for chart
- [x] Add loading and error states

### Phase 5: Testing & Refinement
- [x] Test with various data scenarios (multiple periods, different payment methods)
- [x] Test filter functionality across all periods
- [x] Verify performance with large datasets
- [x] Test responsive design on mobile/tablet

### Phase 6: Documentation & Cleanup
- [x] Update CLAUDE.md with new feature documentation
- [x] Clean up any temporary code or console logs
- [x] Ensure code follows project conventions

## Data Structure

### API Response Format (Proposed)
```typescript
{
  overspendByCategory: [
    {
      categoryId: string,
      categoryName: string,
      tipoGasto?: string,
      periods: [
        {
          periodId: string,
          periodName: string,
          month: number,
          year: number,
          planeado: number,
          actual: number,
          overspend: number
        }
      ],
      totalPlaneado: number,
      totalActual: number,
      totalOverspend: number
    }
  ],
  summary: {
    totalPlaneado: number,
    totalActual: number,
    totalOverspend: number,
    overspendByPaymentMethod: {
      cash: number,
      debit: number,
      credit: number
    }
  }
}
```

## Technical Considerations

1. **Performance**: With multiple periods and many categories, aggregation could be expensive
   - Consider caching results
   - Implement pagination if needed
   - Use database aggregation functions

2. **Data Consistency**: Ensure historical period data is immutable
   - Don't allow modifications to past periods' data

3. **Filtering**: Maintain consistency with existing filter behavior
   - Payment method filter applies to all periods
   - Category filter applies across all periods

4. **UI/UX**:
   - Clear visual distinction between current-period and all-periods views
   - Loading states for data fetching
   - Empty states when no data available

## Success Criteria

- [ ] New view is accessible from "Overspend Actual" submenu
- [ ] All-periods data loads and displays correctly
- [ ] Filters work across all periods
- [ ] Chart/visualization is clear and informative
- [ ] Performance is acceptable (< 2 second load time)
- [ ] Responsive design works on mobile
- [ ] Tests pass and code follows conventions

## Potential Enhancements (Future)

- Add comparison between periods (growth/decline in overspend)
- Export all-periods data to Excel
- Add forecasting based on overspend trends
- Compare planned vs actual trends over time
- Add ability to drill down from aggregated view to period-specific view

## Dependencies

- Existing period management system
- Existing expense and budget data
- Existing filter components
- Recharts for visualization
- TailwindCSS for styling

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Performance with many periods | High | Use database aggregation, implement lazy loading |
| Complex navigation changes | Medium | Carefully test submenu interaction |
| Data inconsistency | High | Validate data integrity, add tests |
| Visual clutter | Medium | Keep design clean, focus on readability |

---

## Status Updates

- **2025-11-10**: Plan created and ready for review
- **2025-11-10**: Implementation completed successfully!
  - All 6 phases completed
  - API endpoint created and tested
  - Menu structure updated with collapsible submenu
  - New all-periods view fully implemented with:
    - Bar chart for category overspend totals
    - Trend line chart showing overspend trajectory over time
    - Summary table with detailed breakdown
    - Payment method filtering
    - Category exclusion filtering
    - Loading and error states
    - Responsive design
  - Project builds successfully with no errors
  - Documentation updated in CLAUDE.md

## Completion Summary

✅ **Successfully implemented** "All Periods Overspend View" feature

### Files Created/Modified:
1. **New API Endpoint**: `/app/api/overspend/all-periods/route.ts`
2. **New Page Component**: `/app/dashboard/overspend/all-periods/page.tsx`
3. **Updated Navigation**: `/components/app-sidebar.tsx` (submenu structure)
4. **New Types**: Added to `/types/funds.ts` (AllPeriodsOverspendResponse, CategoryOverspendRow, etc.)
5. **Updated Documentation**:
   - `/docs/over-spend-by-period-plan.md` (this file)
   - `/CLAUDE.md` (feature documentation)

### Key Features Implemented:
- ✅ Aggregated overspend data across all periods
- ✅ Payment method filtering (Cash/Debit, Credit, All)
- ✅ Category exclusion filtering
- ✅ Multiple visualization types (bar chart, trend line, summary table)
- ✅ KPI cards showing totals
- ✅ Responsive design for all devices
- ✅ Loading and error state handling
- ✅ Submenu navigation structure

### Performance & Quality:
- Build passes without errors
- No console warnings or temporary code
- Code follows project conventions
- Proper error handling implemented
- Responsive layout verified

### Next Steps (Optional Future Enhancements):
- Add period range selector for custom date filtering
- Export all-periods data to Excel
- Add comparison metrics (YoY growth, month-over-month changes)
- Implement data caching for performance optimization
- Add drill-down capability from aggregated view to period-specific details
