# Category Exclusion Filter for Dashboard - Implementation Plan

**Branch:** `excluir-categorias-dashboard`
**Date:** 2025-10-06
**Feature:** Add category exclusion filter to Dashboard > Resumen view

## Overview
Add a multi-select category filter to the Dashboard's "Resumen" tab that allows users to exclude selected categories from:
- The budget summary table
- The balance calculations (running balance and totals)
- Persist selections in localStorage across sessions

## Requirements
1. **UI Component:** Dropdown with checkboxes for category selection
2. **Filter Logic:** Exclude selected categories from table and calculations
3. **Persistence:** Save excluded categories in localStorage
4. **UX:** Clear indication of active filters
5. **Performance:** Efficient filtering without API changes

## Implementation Tasks

### Phase 1: LocalStorage Utility
- [x] Create `lib/excluded-categories-storage.ts` utility
  - [x] Define storage key and version constants
  - [x] Implement `loadExcludedCategories()` - returns array of category IDs
  - [x] Implement `saveExcludedCategories(categoryIds: string[])` - saves to localStorage
  - [x] Implement `clearExcludedCategories()` - clears filter
  - [x] Add validation for corrupted data
  - [x] Add error handling for storage unavailable
  - [x] Follow pattern from `active-period-storage.ts`

### Phase 2: UI Component
- [x] Create `components/category-exclusion-filter.tsx`
  - [x] Create dropdown button with current filter status indicator
  - [x] Add Popover/DropdownMenu from shadcn/ui
  - [x] Implement checkbox list for all categories
  - [x] Add "Select All" / "Clear All" buttons
  - [x] Add "Apply" and "Cancel" buttons
  - [x] Show count of excluded categories in button text
  - [x] Style similar to existing FundFilter component
  - [x] Make component reusable with props:
    - `availableCategories: Array<{id: string, name: string}>`
    - `excludedCategories: string[]`
    - `onExcludedCategoriesChange: (categoryIds: string[]) => void`

### Phase 3: Integration in Dashboard View
- [x] Update `components/dashboard-view.tsx`
  - [x] Add state for excluded categories: `const [excludedCategories, setExcludedCategories] = useState<string[]>([])`
  - [x] Load excluded categories from localStorage on mount
  - [x] Add CategoryExclusionFilter component in the Resumen tab
    - Place it near the table, possibly in the Card header or before the table
  - [x] Pass available categories from `budgetSummary` to the filter component
  - [x] Handle filter changes and save to localStorage
  - [x] Filter `budgetSummary` data before rendering:
    ```typescript
    const filteredBudgetSummary = budgetSummary.filter(
      item => !excludedCategories.includes(item.category_id)
    );
    ```
  - [x] Update all calculations to use filtered data:
    - Running balance calculation
    - Total rows (TOTAL row at bottom)
    - Any other aggregations

### Phase 4: Visual Indicators
- [x] Update dashboard header to show active filter status
  - [x] Add badge or text showing "X categorías excluidas" when filter is active
  - [x] Update period info line to include filter info
- [x] Add clear indication in table card header
  - [x] Show filter icon/badge when categories are excluded
  - [x] Add tooltip explaining active filters

### Phase 5: Testing & Polish
- [x] Test functionality
  - [x] Test excluding single category
  - [x] Test excluding multiple categories
  - [x] Test "Select All" and "Clear All"
  - [x] Test filter persistence across page refresh
  - [x] Test filter persistence across browser sessions
  - [x] Test with fund filter active simultaneously
  - [x] Test with no categories available
  - [x] Test localStorage unavailable scenario
- [x] UI/UX polish
  - [x] Ensure responsive design on mobile
  - [x] Verify accessibility (keyboard navigation, screen readers)
  - [x] Check dark mode styling
  - [x] Verify table scrolling with long category lists
- [x] Edge cases
  - [x] Exclude all categories (show empty state)
  - [x] Categories deleted but still in localStorage
  - [x] Very long category names in filter

## Technical Details

### LocalStorage Schema
```typescript
interface ExcludedCategoriesCache {
  categoryIds: string[];
  timestamp: number;
  version: string;
}

const STORAGE_KEY = "budget_tracker_excluded_categories";
const CACHE_VERSION = "1.0.0";
```

### Component Structure
```
dashboard-view.tsx
├── FundFilter (existing)
├── Tabs
    └── TabsContent value="summary"
        ├── Summary Cards (existing)
        ├── Card: Resumen de Presupuesto
            ├── CardHeader
            │   ├── Title + Description
            │   ├── CategoryExclusionFilter (NEW)
            │   └── ExportBudgetSummaryButton (existing)
            └── CardContent
                └── Table (filtered data)
```

### Filter Logic Flow
1. User opens dropdown and checks/unchecks categories
2. On "Apply", update state and save to localStorage
3. Component re-renders with filtered data
4. All calculations use filtered array
5. Visual indicators update to show active filter

### Data Flow
```
localStorage -> loadExcludedCategories() -> useState -> filter budgetSummary -> render table
                                             ↓
                                        onChange -> saveExcludedCategories() -> localStorage
```

## Files to Modify/Create

### New Files
- `lib/excluded-categories-storage.ts` - LocalStorage utility
- `components/category-exclusion-filter.tsx` - Filter UI component

### Modified Files
- `components/dashboard-view.tsx` - Integration of filter

## Dependencies
- No new package dependencies required
- Uses existing shadcn/ui components:
  - `Button`
  - `Popover` or `DropdownMenu`
  - `Checkbox`
  - `Label`
  - `Badge` (for indicators)

## Acceptance Criteria
- ✅ User can open a dropdown showing all categories with checkboxes
- ✅ User can select/deselect multiple categories
- ✅ Selected categories are excluded from the table
- ✅ Balance calculations reflect excluded categories
- ✅ Filter selections persist across page refreshes
- ✅ Filter selections persist across browser sessions
- ✅ Clear visual indication when filter is active
- ✅ Filter works independently from fund filter
- ✅ Graceful handling when localStorage is unavailable
- ✅ Responsive design on all screen sizes

## Future Enhancements (Not in Scope)
- Quick presets (e.g., "Exclude fixed expenses")
- Category groups exclusion
- Search/filter categories in dropdown
- Export to Excel respects exclusion filter
- Sync exclusion filter across all dashboard tabs

## Notes
- This filter is client-side only - no API changes needed
- Filter applies only to the "Resumen" tab
- The excluded categories are stored per browser (localStorage)
- The feature should work seamlessly with existing fund filter
