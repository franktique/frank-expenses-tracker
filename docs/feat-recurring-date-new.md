# Feature: Interactive Budget Detail View for Projected Execution Dashboard

**Branch:** `feat/recurring-date-new`
**Dashboard:** Ejecución Proyectada del Presupuesto (`/dashboard/projected-execution`)
**Status:** Planning Complete - Ready for Implementation

---

## Feature Description

Add interactive click functionality to the Projected Budget Execution dashboard bar chart. When users click on a bar representing a day or week, display a detailed breakdown table below the chart showing all budgets scheduled for that period.

### User Story
As a budget manager, I want to click on any bar in the Projected Execution chart so that I can see the detailed breakdown of budgets scheduled for that specific day/week, helping me understand what categories contribute to the total.

---

## Requirements

### Functional Requirements
1. ✅ User can click any bar in the chart to select a day/week
2. ✅ Selected bar is visually highlighted (blue color)
3. ✅ Detail table appears below chart showing budgets for selected period
4. ✅ Detail table displays: Category name and Amount
5. ✅ Clicking the same bar again deselects and hides the table
6. ✅ Switching view modes (daily ↔ weekly) clears selection
7. ✅ Works in both daily and weekly view modes
8. ✅ Responsive design for mobile devices

### Non-Functional Requirements
- Performance: No noticeable delay when clicking bars
- Accessibility: Keyboard navigation support for bar selection
- Compatibility: Works in all modern browsers
- Data: Show budgets (planned), not actual expenses

---

## Technical Design

### Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Dashboard Component (page.tsx)                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  State: selectedDate                             │   │
│  │  Handler: handleBarClick()                       │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Bar Chart (Recharts)                            │   │
│  │  - onClick handler                               │   │
│  │  - Dynamic bar colors (selected/peak/normal)     │   │
│  │  - Cursor pointer                                │   │
│  └─────────────────────────────────────────────────┘   │
│                                                          │
│  ┌─────────────────────────────────────────────────┐   │
│  │  Budget Detail Table (conditionally rendered)    │   │
│  │  - Shows budgets for selectedDate                │   │
│  │  - Category name + Amount columns                │   │
│  │  - Sorted by amount descending                   │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌────────────────────────┐
              │  API Endpoint          │
              │  /api/budget-execution │
              │  Returns:              │
              │  - Aggregated data     │
              │  - Budget details      │
              └────────────────────────┘
```

### Data Flow

1. **Initial Load:**
   - Dashboard fetches data from API with `viewMode` parameter
   - API returns aggregated chart data + detailed budget breakdowns
   - Chart renders with clickable bars

2. **Click Interaction:**
   - User clicks bar → `handleBarClick()` fires
   - Extract date/week from clicked bar data
   - Set `selectedDate` state (or toggle to `null` if same bar)
   - Component re-renders with detail table (if date selected)

3. **Detail Display:**
   - Filter `budgetDetails[selectedDate]` from API response
   - Pass filtered budgets to `BudgetDetailTable` component
   - Table renders with category names and amounts
   - Sorted by amount (highest first)

### API Response Structure

**Existing:**
```typescript
interface BudgetExecutionResponse {
  periodId: string;
  periodName: string;
  viewMode: "daily" | "weekly";
  data: BudgetExecutionData[]; // Aggregated for chart
  summary: {
    totalBudget: number;
    averagePerDay: number;
    peakDate: string;
    peakAmount: number;
  };
}
```

**New (Extended):**
```typescript
interface BudgetExecutionResponse {
  // ... existing fields
  budgetDetails: Record<string, BudgetDetail[]>; // NEW
}

interface BudgetDetail {
  budgetId: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  date: string; // Specific date (YYYY-MM-DD)
  paymentMethod: string;
}
```

**Example:**
```json
{
  "periodId": "123",
  "periodName": "Diciembre 2025",
  "viewMode": "daily",
  "data": [
    { "date": "2025-12-01", "amount": 9278656 },
    { "date": "2025-12-09", "amount": 5325917 }
  ],
  "summary": { /* ... */ },
  "budgetDetails": {
    "2025-12-01": [
      { "categoryName": "Renta", "amount": 5000000, /* ... */ },
      { "categoryName": "Internet", "amount": 800000, /* ... */ }
    ],
    "2025-12-09": [
      { "categoryName": "Supermercado", "amount": 3000000, /* ... */ }
    ]
  }
}
```

---

## Implementation Tasks

### Phase 1: API Extension
- [ ] Add `BudgetDetail` interface to `/types/funds.ts`
- [ ] Extend `BudgetExecutionResponse` type with `budgetDetails` field
- [ ] Modify `/app/api/budget-execution/[periodId]/route.ts`:
  - [ ] After `expandBudgetPayments()`, collect budget details
  - [ ] Include category name from database join
  - [ ] Group details by date (daily) or week identifier (weekly)
  - [ ] Return `budgetDetails` in response object
- [ ] Test API response contains correct data

### Phase 2: Detail Table Component
- [ ] Create `/components/budget-detail-table.tsx`
- [ ] Define props interface:
  ```typescript
  interface BudgetDetailTableProps {
    budgets: BudgetDetail[];
    selectedDate: string;
    viewMode: "daily" | "weekly";
    weekStart?: string;
    weekEnd?: string;
  }
  ```
- [ ] Implement table rendering:
  - [ ] Header showing selected date/week range
  - [ ] Two columns: Category | Amount
  - [ ] Sort budgets by amount (descending)
  - [ ] Currency formatting for amounts
  - [ ] Empty state if no budgets
- [ ] Add responsive styling (mobile-friendly)
- [ ] Test component in isolation

### Phase 3: Dashboard Integration
- [ ] Add state to `/app/dashboard/projected-execution/page.tsx`:
  ```typescript
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  ```
- [ ] Implement click handler:
  ```typescript
  const handleBarClick = (data: any) => {
    const clickedDate = data.activePayload[0].payload.date;
    setSelectedDate(clickedDate === selectedDate ? null : clickedDate);
  };
  ```
- [ ] Add `onClick={handleBarClick}` to BarChart
- [ ] Implement bar highlighting:
  ```typescript
  const getBarColor = (entry: any) => {
    if (entry.date === selectedDate) return "#3b82f6"; // Blue
    if (entry.amount === peakAmount) return "#f97316";  // Orange
    return "#6366f1"; // Indigo
  };
  ```
- [ ] Add `cursor-pointer` styling to bars
- [ ] Render BudgetDetailTable below chart:
  ```tsx
  {selectedDate && budgetDetails[selectedDate] && (
    <BudgetDetailTable
      budgets={budgetDetails[selectedDate]}
      selectedDate={selectedDate}
      viewMode={viewMode}
    />
  )}
  ```
- [ ] Clear selection when viewMode changes
- [ ] Add smooth scroll to table when displayed

### Phase 4: Utility Functions
- [ ] Add helper to extract week range from weekly data
- [ ] Add helper to format date range for table header
- [ ] Update `/lib/budget-execution-utils.ts` if needed

### Phase 5: Testing & Validation
- [ ] Test clicking bars in daily view
- [ ] Test clicking bars in weekly view
- [ ] Test toggling selection on/off
- [ ] Test view mode switching clears selection
- [ ] Test multiple budgets display correctly
- [ ] Test empty state when no budgets
- [ ] Test responsive design on mobile
- [ ] Test with real database data
- [ ] Performance test with large datasets

### Phase 6: Documentation
- [ ] Update `/CLAUDE.md` with interactive feature details
- [ ] Add code comments for click handler logic
- [ ] Document new API response structure

---

## Files to Modify

| File | Purpose | Changes |
|------|---------|---------|
| `/types/funds.ts` | Type definitions | Add `BudgetDetail` interface, extend `BudgetExecutionResponse` |
| `/app/api/budget-execution/[periodId]/route.ts` | API endpoint | Collect and return budget details grouped by date/week |
| `/components/budget-detail-table.tsx` | **NEW** Component | Create detail table component with props, rendering, styling |
| `/app/dashboard/projected-execution/page.tsx` | Dashboard view | Add state, click handler, bar colors, render detail table |
| `/lib/budget-execution-utils.ts` | Utilities | Add helper functions for week range, date formatting |
| `/CLAUDE.md` | Documentation | Document interactive feature |

---

## Design Decisions

### 1. Inline Table vs Modal
**Decision:** Display table inline below chart
**Rationale:** User preference, maintains visual context, easier comparison across dates

### 2. Show Budgets vs Actual Expenses
**Decision:** Show budgets only
**Rationale:** User requirement, aligns with dashboard purpose (projected execution)

### 3. Minimal Detail (Category + Amount)
**Decision:** Show only Category name and Amount
**Rationale:** User requirement for simplicity, reduces clutter, other fields can be added later

### 4. Toggle on Same Bar Click
**Decision:** Clicking same bar deselects and hides table
**Rationale:** Better UX, avoids need for separate close button, standard pattern

### 5. Return All Details in Initial API Call
**Decision:** Include all budget details in first API response
**Rationale:** Avoids extra requests, manageable data size, improves responsiveness

### 6. Bar Highlighting
**Decision:** Blue for selected, orange for peak, indigo for normal
**Rationale:** Clear visual feedback, maintains existing peak highlighting, accessible colors

---

## Edge Cases & Handling

| Edge Case | Handling |
|-----------|----------|
| No budgets for selected date | Show empty state message in table |
| Very long category names | Truncate with ellipsis, show full name on hover |
| Large number of budgets (>20) | Add scrollable max-height to table container |
| Weekly view with budgets across multiple days | Show individual dates in table rows |
| Click bar while loading | Disable clicks during loading state |
| Missing budgetDetails in API response | Gracefully handle, log error, show user message |
| Invalid date format | Validate before filtering, fallback to error state |

---

## Success Criteria

- ✅ User can click any bar to view budget details
- ✅ Detail table displays below chart with correct data
- ✅ Selected bar is visually highlighted
- ✅ Clicking same bar toggles table off
- ✅ View mode changes clear selection
- ✅ Responsive on mobile devices
- ✅ Empty state shown when no budgets
- ✅ No performance degradation

---

## Future Enhancements (Out of Scope)

- Add payment method column to detail table
- Add links to edit individual budgets from table
- Show actual expenses alongside budgets for comparison
- Add export functionality for detail data
- Add filtering/sorting within detail table
- Add hover preview before clicking bar

---

## Testing Checklist

### Unit Tests
- [ ] BudgetDetailTable component renders correctly
- [ ] BudgetDetailTable handles empty budgets array
- [ ] BudgetDetailTable sorts by amount descending
- [ ] API returns correct budgetDetails structure
- [ ] API groups details correctly for daily view
- [ ] API groups details correctly for weekly view

### Integration Tests
- [ ] Click bar → table appears
- [ ] Click same bar → table disappears
- [ ] Click different bar → table updates
- [ ] Switch view mode → selection clears
- [ ] Detail table shows correct budgets for selected date
- [ ] Weekly view table shows budgets with individual dates

### E2E Tests
- [ ] Full user flow: load page → click bar → view details → close
- [ ] Mobile: touch interaction works correctly
- [ ] Accessibility: keyboard navigation works

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Large table makes page slow | Low | Medium | Add max-height with scroll, pagination if needed |
| API response too large | Low | Low | Monitor response size, lazy-load if issues |
| Small click area on mobile | Medium | Medium | Test touch targets, ensure sufficient bar width |
| Confusing weekly view dates | Low | Low | Show individual dates in table, add tooltip |

---

## Dependencies

- ✅ Recharts (already installed)
- ✅ BudgetContext (no changes needed)
- ✅ budget-execution-utils.ts (minor additions)
- ✅ Database schema (no changes needed)

---

## Estimated Effort

- **API Extension:** 2-3 hours
- **Component Creation:** 2-3 hours
- **Dashboard Integration:** 2-3 hours
- **Testing:** 2-3 hours
- **Documentation:** 1 hour

**Total:** 9-13 hours

---

## Notes

- All changes are within existing architecture patterns
- No database migrations required
- No new external dependencies needed
- Follows established component structure and styling conventions
- Compatible with existing auto-save and period management features
