# Feature: Detailed Expenses Chart - Gastos por Periodo

**Branch:** `feat/detailed-expenses-chart-gatois-x-periodo`
**Created:** 2026-01-16
**Status:** Complete

## Overview

Add click-to-show-details functionality to the "Gastos por Periodo" bar chart. When a user clicks on a bar representing a period, a table should appear below the chart showing the detailed expenses for that period, ordered by date.

## Current State

The current implementation (`/app/dashboard/period-bars/page.tsx`) displays:
- A category selector dropdown
- A bar chart showing total expenses per period for the selected category
- Hover tooltip with currency-formatted totals

**Missing Features:**
- No click handlers on bars
- No detail table for individual expenses
- No visual feedback for selected bar

## Proposed Solution

Follow the established pattern from the "Projected Budget Execution" dashboard (`/app/dashboard/projected-execution/page.tsx`) which already implements this feature for budgets.

### Key Changes

1. **Add state for selected period** - Track which bar/period is clicked
2. **Add click handler to chart** - Capture bar clicks and update selected period
3. **Filter and display expense details** - Show expenses for selected period in a table
4. **Add visual feedback** - Highlight selected bar with different color
5. **Add toggle behavior** - Click same bar again to deselect/hide table

## Implementation Plan

### Phase 1: State Management & Click Handler

- [x] Add `selectedPeriodId` state to track selected period
- [x] Import `Cell` component from recharts for individual bar styling
- [x] Add `onClick` handler to `BarChart` component
- [x] Implement `handleBarClick` function to set/toggle selected period
- [x] Clear selection when category changes

### Phase 2: Visual Feedback

- [x] Add `getBarColor` function to determine bar fill color
- [x] Implement bar coloring logic:
  - Selected bar: Blue (#3b82f6)
  - Normal bars: Cyan (#22d3ee - current color)
- [x] Add cursor pointer style to chart
- [x] Map bars with `Cell` component for individual colors
- [x] Update tooltip to show "Click para ver detalles" hint

### Phase 3: Expense Detail Table

- [x] Create `ExpenseDetailTable` component (`/components/expense-detail-table.tsx`)
  - Props: `expenses`, `selectedPeriodName`
  - Columns: Fecha | Descripción | Evento | Monto | Método de Pago
  - Sort by date (ascending)
  - Currency formatting for amounts
  - Responsive design with proper styling
- [x] Filter expenses by selected period and category
- [x] Memoize filtered expenses for performance
- [x] Render table conditionally when period is selected

### Phase 4: Integration & Polish

- [x] Import and render `ExpenseDetailTable` below the chart
- [x] Add smooth visual transition when table appears/disappears
- [x] Test with various categories and periods
- [x] Verify empty state handling (no expenses for period)
- [x] Ensure mobile responsiveness

## Technical Details

### Data Flow

```
User clicks bar
    ↓
handleBarClick extracts period info from payload
    ↓
setSelectedPeriodId updates state (toggle if same)
    ↓
filteredExpenses memo recalculates
    ↓
ExpenseDetailTable re-renders with new data
```

### Component Structure

```tsx
// New state
const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

// Filtered expenses memo
const filteredExpenses = useMemo(() => {
  if (!selectedPeriodId || !selectedCategoryId) return [];
  return expenses
    .filter(e => e.period_id === selectedPeriodId && e.category_id === selectedCategoryId)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}, [expenses, selectedPeriodId, selectedCategoryId]);

// Click handler
const handleBarClick = (data: any) => {
  if (data?.activePayload?.[0]) {
    const clickedPeriod = periods.find(p => p.name === data.activePayload[0].payload.period);
    if (clickedPeriod) {
      setSelectedPeriodId(prev => prev === clickedPeriod.id ? null : clickedPeriod.id);
    }
  }
};
```

### ExpenseDetailTable Component

```tsx
interface ExpenseDetailTableProps {
  expenses: Expense[];
  periodName: string;
}
```

**Table Columns:**
| Column | Field | Format |
|--------|-------|--------|
| Fecha | date | DD/MM/YYYY |
| Descripción | description | string |
| Evento | event | string (optional) |
| Monto | amount | Currency (es-MX) |
| Método | payment_method | Badge/Label |

## Dependencies

- Recharts `Cell` component (already available)
- date-fns for date formatting (already installed)
- Existing UI components (Card, Table, Badge)

## Testing Checklist

- [ ] Click on bar shows correct expenses
- [ ] Click on same bar hides table
- [ ] Changing category clears selection
- [ ] Table is sorted by date ascending
- [ ] Empty period shows appropriate message
- [ ] Selected bar is visually distinct
- [ ] Mobile layout works correctly
- [ ] Currency formatting is correct

## Files to Modify

1. `/app/dashboard/period-bars/page.tsx` - Main dashboard page
2. `/components/expense-detail-table.tsx` - New component (create)

## Estimated Complexity

- **Low-Medium**: Following established patterns from projected-execution dashboard
- Approximately 4 implementation phases with clear dependencies
