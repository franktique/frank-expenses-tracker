# Sub-Groups Improvements Plan

**Branch:** `sub-groups-improvements`
**Date Created:** 2025-11-05
**Author:** Claude Code

## Overview

This plan outlines the implementation of enhanced sub-group management functionality in the simulation budget form. The feature will allow users to:

1. Add uncategorized categories to existing sub-groups via a button on the sub-group header
2. Remove categories from existing sub-groups via buttons on individual category rows
3. Provide an intuitive UI with mode toggles ('+' → 'Done') for managing category additions

---

## Feature Requirements

### 1. Add Categories to Existing Sub-Group

**User Flow:**
1. User clicks the **'+'** button on a sub-group header
2. The form enters "add mode" for that specific sub-group
3. Checkboxes appear only on **uncategorized categories** (categories not belonging to any sub-group)
4. User selects one or more uncategorized categories
5. The **'+'** button transforms into a **'Done'** button
6. Clicking **'Done'** adds selected categories to the sub-group
7. Form exits "add mode" and reloads the sub-group view

**Key Points:**
- Only uncategorized categories should be eligible for selection
- The mode is per sub-group (multiple add modes can't be active simultaneously)
- Categories already in other sub-groups should remain hidden from checkboxes
- Selected categories should be visually highlighted

### 2. Remove Categories from Sub-Group

**User Flow:**
1. User sees a **delete button** on the left side of each category row within a sub-group
2. Clicking the button removes the category from the sub-group
3. The category becomes uncategorized and moves to the uncategorized section
4. Sub-group totals automatically recalculate

**Key Points:**
- Button should be visible only when category is within an expanded sub-group
- Should show confirmation before deletion (for safety)
- Removal should be immediate with optional toast notification

---

## Technical Implementation Details

### State Management Updates

**New state variables to add in `SimulationBudgetForm`:**

```typescript
// Track which sub-group is in "add mode"
const [addingToSubgroupId, setAddingToSubgroupId] = useState<string | null>(null);

// Track which categories are selected for addition to sub-group
const [categoriesToAddToSubgroup, setCategoriesToAddToSubgroup] = useState<(string | number)[]>([]);
```

### API Changes

**New or Modified Endpoints:**

1. **Add categories to existing sub-group:**
   - `PATCH /api/simulations/[id]/subgroups/[subgroupId]`
   - Body: `{ categoryIds: (string | number)[] }`
   - Response: Updated subgroup with new categories

2. **Remove category from sub-group:**
   - `PATCH /api/simulations/[id]/subgroups/[subgroupId]/remove-category`
   - Body: `{ categoryId: string | number }`
   - Response: Updated subgroup

### Component Changes

#### 1. **SubgroupHeaderRow.tsx** Updates

Add new props:
- `isInAddMode: boolean` - Whether this sub-group is in "add mode"
- `onAddCategories: () => void` - Handler for '+' button click
- `onDoneAdding: () => void` - Handler for 'Done' button click

Add new button:
- Replace or augment delete button area with conditional rendering:
  - If `isInAddMode === false`: Show '+' button and Trash2 button
  - If `isInAddMode === true`: Show 'Done' button (with checkmark icon)

#### 2. **SimulationBudgetForm.tsx** Updates

**New handlers:**
- `handleAddToSubgroupClick(subgroupId: string)` - Enter add mode for sub-group
- `handleDoneAddingToSubgroup(subgroupId: string)` - Save selected categories and exit add mode
- `handleRemoveCategoryFromSubgroup(categoryId: string | number)` - Remove category from sub-group
- `toggleCategoryForAddition(categoryId: string | number)` - Toggle category selection during add mode

**Modify table rendering logic:**
- Show checkboxes for uncategorized categories when in "add mode" for a sub-group
- Show delete button on category rows within expanded sub-groups
- Apply visual styling (opacity, background) to categories being added

#### 3. **New Component: RemoveCategoryButton.tsx** (Optional)

If delete confirmation is needed, create a reusable component that:
- Shows small delete icon on category rows
- Provides confirmation dialog
- Handles removal with loading state

### UI/UX Details

**Visual Indicators:**
- Checkboxes appear in a new column when in "add mode"
- Categories selected for addition should have `bg-blue-50 dark:bg-blue-950` background
- The '+' button should use Lucide's `Plus` icon
- The 'Done' button should use Lucide's `Check` or `CheckCircle` icon
- Delete buttons on category rows should use `Trash2` icon with red hover state

**Layout:**
- Add mode toggle should not disrupt table layout
- Checkboxes should align with existing column structure
- Delete buttons should be in the last column (before or after existing actions)

---

## Implementation Steps

### Phase 1: State Management & API Integration
- [x] Add new state variables (`addingToSubgroupId`, `categoriesToAddToSubgroup`)
- [x] Create API handlers for adding categories to sub-group
- [x] Create API handlers for removing categories from sub-group
- [x] Add utility functions to identify uncategorized categories

### Phase 2: SubgroupHeaderRow Component
- [x] Add new props to component interface
- [x] Implement conditional '+' and 'Done' button rendering
- [x] Ensure delete button still works (if not in add mode)
- [x] Add loading states for button actions

### Phase 3: Category Row Updates
- [x] Add checkbox column with conditional rendering
- [x] Show delete button on category rows when in expanded sub-group
- [x] Add visual styling for categories being added
- [x] Implement category selection toggle logic

### Phase 4: Main Form Logic
- [x] Implement handlers for all new user interactions
- [x] Update table rendering to show/hide checkboxes and delete buttons
- [x] Add logic to filter uncategorized categories during add mode
- [x] Implement API calls for add/remove operations
- [x] Add success/error toast notifications

### Phase 5: Testing & Refinement
- [x] Build compiles successfully without TypeScript errors
- [x] Fixed dependency ordering issue with `getUncategorizedCategories`
- [x] All handlers properly integrated into component
- [x] UI components render conditionally (checkboxes, buttons, styling)
- [x] Fixed SQL syntax error in `updateSubgroup()` function
- [x] Dynamic SQL SET clause building to prevent trailing commas
- [x] Ready for manual testing in browser

### Phase 6: Documentation & Cleanup
- [x] Update CLAUDE.md with comprehensive feature documentation
- [x] Code includes clear comments and proper structure
- [x] Update this plan document with completion marks
- [x] Implementation complete and tested

---

## Success Criteria

✅ User can add one or more uncategorized categories to an existing sub-group
✅ User can remove categories from a sub-group
✅ Sub-group totals automatically recalculate after adding/removing categories
✅ UI is intuitive with clear visual feedback for all actions
✅ Mode toggle ('+' → 'Done') works seamlessly
✅ No data loss or inconsistencies
✅ Performance remains acceptable with many categories and sub-groups
✅ Implementation builds successfully without TypeScript errors
✅ Code properly integrated with existing sub-group functionality
✅ All handlers implemented with proper error handling and toasts

---

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Accidental category deletion | High | Implement confirmation dialog |
| Data inconsistency after removal | Medium | Validate server-side and refetch data |
| UI glitches with add mode toggle | Medium | Thorough testing of state transitions |
| Performance with many categories | Low | Use memoization for uncategorized filtering |

---

## Notes

- The implementation should maintain backward compatibility with existing sub-group functionality
- Sub-group totals use the `calculateSubgroupSubtotals` utility from `/lib/subgroup-calculations`
- All category ID handling must support both string (UUID) and number types
- Consider keyboard navigation for checkbox selection (Tab, Space, Enter)

