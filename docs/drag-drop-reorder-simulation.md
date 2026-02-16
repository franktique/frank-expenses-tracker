# Drag & Drop Reordering with Balance Recalculation - Plan

**Branch:** `tipo-gasto-sim-improvements`
**Date:** 2025-11-05
**Related Feature:** Tipo Gasto Custom Sorting

## Overview

Implement drag-and-drop functionality to reorder categories within their tipo_gasto groups in the simulation budget table. When a category is moved, recalculate and update all balance values displayed in the table.

## Current Behavior

- Categories are displayed in sorted groups (Fijo, Variable, Semi-Fijo, Eventual)
- Balances are calculated based on the fixed sorted order
- No ability to reorder items within groups
- Balance recalculation happens automatically based on sort order

## Desired Behavior

- Users can drag and drop category rows to reorder them within their tipo_gasto group
- Dragging is restricted within the same tipo_gasto group (cannot move Fijo to Variable group)
- After drop, all running balances in the table are recalculated
- Visual feedback during drag operation (drag handle icon, row highlight)
- Reordering changes are reflected in local state only (auto-save will persist changes)
- Manual order takes precedence over tipo_gasto sort

## Implementation Plan

### Task 1: Create Drag & Drop State Management

**File:** `/components/simulation-budget-form.tsx`

- [x] Add state to track custom category order: `categoryOrder` (array of category IDs)
- [x] Add state to track which row is being dragged: `draggedCategoryId`
- [x] Add state to track drop target position: `dropTargetIndex`
- [x] Initialize `categoryOrder` from sorted categories on load

### Task 2: Create Drag Event Handlers

**File:** `/components/simulation-budget-form.tsx`

- [x] Implement `handleDragStart` - capture dragged category ID and tipo_gasto
- [x] Implement `handleDragOver` - determine valid drop zones (same tipo_gasto group)
- [x] Implement `handleDrop` - reorder array and update state
- [x] Implement `handleDragEnd` - clear drag state
- [x] Add validation to prevent dragging between different tipo_gasto groups

### Task 3: Update Sorting Logic for Custom Order

**File:** `/components/simulation-budget-form.tsx`

- [x] Modify `getSortedCategories` to apply custom `categoryOrder` after tipo_gasto sorting
- [x] Preserve tipo_gasto grouping when applying custom order
- [x] If category is not in `categoryOrder`, append it at the end
- [x] Update memoization dependencies

### Task 4: Implement Balance Recalculation

**File:** `/components/simulation-budget-form.tsx`

- [x] Balances automatically recalculate via existing `categoryBalances` memoization
- [x] Uses `getSortedCategories` which now includes custom order
- [x] Running balance calculated based on new row order
- [x] No additional function needed - existing logic handles it

### Task 5: Add Drag & Drop UI Components

**File:** `/components/simulation-budget-form.tsx`

- [x] Add drag handle icon (GripVertical from lucide-react) to each table row
- [x] Add visual feedback during drag:
  - [x] Opacity change on dragged row (opacity-50)
  - [x] Highlight on valid drop zones (bg-blue-50 dark:bg-blue-950)
  - [x] Cursor change (cursor-move)
- [x] Add `draggable="true"` to table rows
- [x] Bind drag events to row elements

### Task 6: Add Group Boundary Detection

**File:** `/components/simulation-budget-form.tsx`

- [x] Validate in `handleDragOver` that drop target is in same tipo_gasto as dragged item
- [x] Visual indicator (highlight) for valid drop zones within same group
- [x] Invalid drops prevented by tipo_gasto validation

### Task 7: Persist Custom Order in Browser LocalStorage

**File:** `/components/simulation-budget-form.tsx`

- [x] Save `categoryOrder` to localStorage after each reorder
- [x] Key format: `simulation_${simulationId}_category_order`
- [x] Load saved order on component mount with error handling
- [x] Order persists across browser sessions and page reloads

### Task 8: Handle Edge Cases

**Testing Status:** [-]

- [ ] Reorder within same tipo_gasto group
- [ ] Try to drag to different tipo_gasto group (should be prevented)
- [ ] Drag to top/bottom of group
- [ ] Verify balance recalculation is correct after reorder
- [ ] Test with categories that have undefined tipo_gasto values
- [ ] Verify balance updates when editing amounts after reorder
- [ ] Test that auto-save captures the new order

### Task 9: Visual Testing & Polish

**Testing Status:** [-]

- [ ] Drag handle icon visibility on hover
- [ ] Drag feedback clarity (opacity, highlights)
- [ ] Drop zones within same group are visually distinct
- [ ] Invalid drop zones handling
- [ ] Balance column updates smoothly after drop
- [ ] No layout shift or flashing during reorder

### Task 10: Update Documentation

**File:** `/CLAUDE.md`

- [-] Add notes about drag-and-drop reordering feature
- [-] Document how balance recalculation works with custom order
- [-] Add code examples for drag-drop implementation pattern
- [-] Note that custom order is session-based and auto-saved

## Implementation Details

### State Structure

```typescript
// Add to component state:
const [categoryOrder, setCategoryOrder] = useState<(string | number)[]>([]);
const [draggedCategoryId, setDraggedCategoryId] = useState<
  string | number | null
>(null);
const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
```

### Drag Handler Pattern

```typescript
const handleDragStart = (
  e: DragEvent,
  categoryId: string | number,
  tipoGasto?: TipoGasto
) => {
  setDraggedCategoryId(categoryId);
  e.dataTransfer.effectAllowed = 'move';
};

const handleDragOver = (e: DragEvent, targetCategoryId: string | number) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  // Validate target is same tipo_gasto as dragged
};

const handleDrop = (e: DragEvent, targetCategoryId: string | number) => {
  e.preventDefault();
  // Reorder categories array
  // Recalculate balances
  // Update state
};
```

### Balance Recalculation Flow

1. User drops category in new position
2. `handleDrop` updates `categoryOrder`
3. `getSortedCategories` applies new order
4. `recalculateBalancesForOrder()` runs
5. `categoryBalances` map updates
6. Table re-renders with new balance values

### Files to Modify

1. `/components/simulation-budget-form.tsx` - Main implementation
2. `/lib/active-period-storage.ts` - Optional: Add storage helpers for custom order

### Testing Files

- Manual testing in the simulation budget form
- No new test files required initially

## Success Criteria

- ✅ Users can drag category rows within same tipo_gasto group
- ✅ Dragging between groups is prevented with visual feedback
- ✅ Balances recalculate immediately after drop
- ✅ Balance values are correct for new row order
- ✅ Drag handle icon is visible on each row
- ✅ Visual feedback during drag is clear and intuitive
- ✅ Custom order is preserved during session (with session storage)
- ✅ Auto-save captures the new order

## Timeline Estimate

- Task 1: 10 minutes
- Task 2: 20 minutes
- Task 3: 15 minutes
- Task 4: 15 minutes
- Task 5: 20 minutes
- Task 6: 15 minutes
- Task 7: 10 minutes
- Task 8: 20 minutes
- Task 9: 15 minutes
- Task 10: 5 minutes

**Total Estimated Time: ~145 minutes (2.4 hours)**

## Dependencies

- Must complete "Tipo Gasto Sorting Improvements" feature first
- Uses existing balance calculation logic
- Requires lucide-react for drag handle icon
- Uses React hooks: useState, useMemo, useCallback

## Notes

- Custom order applies AFTER tipo_gasto grouping (not instead of)
- Order is not persisted to database, only to browser localStorage
- Order persists across browser sessions and page reloads
- Clearing browser localStorage will reset custom order to default
- When sort is toggled off, custom order is preserved
- Drag-and-drop works with existing auto-save mechanism
- Each device maintains its own custom order (per-device preference)
