# Simulation Form Filter Implementation Plan

**Branch:** `improvements-filters-simulation-form`

**Date Created:** November 5, 2025

**Overview:** Add filter functionality to the Simulation Budget Form to help users manage visible categories more effectively.

---

## Feature Description

Implement two filter mechanisms in the Simulation Budget Form (`/components/simulation-budget-form.tsx`):

1. **Empty Values Toggle** - Filter out categories with zero values in both efectivo and crédito columns
2. **Category Exclusion Dropdown** - Multi-select dropdown to exclude specific categories from the table (saved to localStorage)

---

## Requirements

### 1. Empty Values Checkbox Filter
- **Location:** Above the budget table, before or alongside the dropdown filter
- **Behavior:**
  - Checkbox labeled "Ocultar categorías sin presupuesto" (Hide categories without budget)
  - Default state: unchecked (all categories visible)
  - When checked: Hide all categories where both `efectivo_amount` and `credito_amount` are 0 or empty
  - State: Local component state (no localStorage needed)
- **Visual Feedback:**
  - Checkbox control with label
  - Should show how many categories are being hidden (optional indicator)

### 2. Category Exclusion Dropdown
- **Location:** Next to the empty values checkbox
- **Behavior:**
  - Multi-select dropdown displaying all categories alphabetically ordered
  - Show checkboxes for each category
  - Allow user to check/uncheck multiple categories to exclude them from the table
  - Selected exclusions persist to localStorage with key: `simulation_${simulationId}_excluded_categories`
- **Features:**
  - Categories listed alphabetically
  - Checkboxes for each category
  - Persist selected exclusions to localStorage
  - Load saved exclusions on component mount
  - Display count of excluded categories in the dropdown trigger button
- **Storage Format:**
  - localStorage key: `simulation_${simulationId}_excluded_categories`
  - Value: JSON array of category IDs to exclude
  - Example: `["cat1", "cat2", "cat3"]`

---

## Implementation Tasks

- [x] **Research & Setup**
  - [x] Review existing dashboard filter implementation for reference patterns
  - [x] Examine component structure of simulation-budget-form.tsx
  - [x] Identify UI component imports and styling approach

- [x] **Empty Values Checkbox**
  - [x] Add state for `hideEmptyCategories` toggle
  - [x] Create checkbox component in the form header (above table)
  - [x] Implement filtering logic in `getSortedCategories` memoized selector
  - [x] Update totals calculations to handle filtered categories (totals remain unfiltered)
  - [x] Add visual indicator for hidden category count

- [x] **Category Exclusion Dropdown**
  - [x] Add state for `excludedCategoryIds` (load from localStorage)
  - [x] Create custom dropdown component with multi-select checkboxes
  - [x] Sort categories alphabetically for dropdown display
  - [x] Implement localStorage load/save logic
  - [x] Add initialization effect to load saved exclusions on component mount
  - [x] Add save effect to persist changes to localStorage
  - [x] Display count of excluded categories in dropdown trigger

- [x] **Filter Integration**
  - [x] Update `getSortedCategories` to apply both filters
  - [x] Ensure drag-and-drop reordering respects filters
  - [x] Totals display unfiltered data (all categories counted)
  - [x] Handle edge case: all categories filtered (shows filtered count message)

- [x] **UI/UX Polish**
  - [x] Position filters in filter bar above the table
  - [x] Add Filter icon for exclusion dropdown
  - [x] Add "Clear" button in dropdown for quick reset
  - [x] Responsive design for mobile (hidden text on sm screens)
  - [x] Visual feedback: Orange button when filters active, bordered checkbox for hide empty

- [-] **Testing** (In Progress)
  - [ ] Test empty values toggle on/off
  - [ ] Test category exclusion dropdown multi-select
  - [ ] Test localStorage persistence across browser sessions
  - [ ] Test with no categories visible (edge case)
  - [ ] Test with all categories filtered
  - [ ] Test drag-and-drop with filters active
  - [ ] Test filter combinations (both filters active simultaneously)
  - [ ] Test localStorage cleanup when simulation is deleted

- [ ] **Documentation & Code Review**
  - [ ] Add inline code comments explaining filter logic
  - [ ] Document state management for filters
  - [ ] Update CLAUDE.md with filter usage patterns (optional)
  - [ ] Peer review and testing

---

## Technical Considerations

### State Management
- Empty values toggle: Local component state
- Excluded categories: localStorage + component state
- Both filters work independently but can be combined

### Performance
- Filtering in `getSortedCategories` memoized selector (already optimized)
- localStorage operations are synchronous but minimal impact
- Dropdown render can be optimized if category list is large

### Edge Cases
- All categories filtered/hidden → Show message "No hay categorías para mostrar"
- localStorage corruption → Fallback to empty exclusion list
- Category deleted → Automatically removed from exclusions
- Zero values with filters → Properly hide/show as needed

### Compatibility
- Existing drag-and-drop reordering should work with filtered categories
- Existing sorting (tipo_gasto, category_name) should work with filters
- Balance calculations: Clarify whether totals include filtered categories

---

## File Changes

### Primary File
- `/components/simulation-budget-form.tsx` - Add filter state and logic

### Supporting Files (if needed)
- Create filter UI component if filter controls become complex
- Update tests if filter logic needs coverage

---

## Success Criteria

✅ Empty values checkbox hides/shows categories with zero efectivo and crédito
✅ Category exclusion dropdown allows multi-select with checkboxes
✅ Exclusions are saved to localStorage and persist across sessions
✅ Categories are listed alphabetically in dropdown
✅ Dropdown shows count of excluded categories
✅ Both filters can work simultaneously
✅ No performance degradation
✅ Drag-and-drop reordering works with filters active
✅ UI is responsive and accessible
✅ Clear visual indication when filters are active

---

## Notes

- Reference the existing dashboard filter implementation for UI patterns
- Consider if totals should reflect filtered data or show all categories
- Test localStorage behavior thoroughly
- Consider adding a "Clear all filters" button for quick reset
- The `getSortedCategories` memoized selector is the ideal place to apply filters
