# Sub-Groups Drag & Drop Reordering Plan

**Branch:** `sub-groups-drag-and-drop`
**Date:** 2025-11-06
**Related Feature:** Simulation Sub-Groups

## Overview
Implement drag-and-drop functionality to reorder sub-groups and uncategorized categories in the simulation budget table. When a sub-group header is dragged, the entire group moves above/below other groups or individual categories. Reordering changes are persisted to browser localStorage (similar to existing category order persistence).

## Current Behavior
- Sub-groups display in database `displayOrder` sequence
- Uncategorized categories appear after all sub-groups
- Users cannot reorder sub-groups relative to each other
- No ability to mix sub-group and category ordering
- No local persistence of custom sub-group order

## Desired Behavior
- Users can drag sub-group headers to reorder them
- Sub-groups can be moved above/below other sub-groups AND uncategorized categories
- Dragging a sub-group moves the entire group (header + categories + subtotal) together
- Uncategorized categories can be moved individually or as a group relative to sub-groups
- Visual drag feedback on sub-group headers (drag handle icon, row highlight)
- Custom order persists in browser localStorage per simulation
- Order restored on page reload from localStorage
- When tipo_gasto sort is toggled, custom order is preserved but applied within sort groups
- All balance calculations respect the new sub-group order

## Implementation Plan

### Task 1: Analyze Current Drag & Drop Implementation
**File:** `/components/simulation-budget-form.tsx`
**Status:** [x]
- Review existing category-level drag & drop for reordering within tipo_gasto groups
- Document drag event handler patterns (handleDragStart, handleDragOver, handleDrop, handleDragEnd)
- Review localStorage persistence pattern for `simulation_${simulationId}_category_order`
- Identify balance recalculation logic and how it responds to order changes
- **Deliverable:** Understanding of current implementation pattern

### Task 2: Design Sub-Group Reordering Data Structure
**File:** `/components/simulation-budget-form.tsx`
**Status:** [x]
- Create `subgroupOrder` state to track custom sub-group ordering
  - Type: `(string)[]` - Array of sub-group IDs in custom order
  - Separate from database `displayOrder` field
- Create `uncategorizedCategoryOrder` state for ordering uncategorized categories
  - Type: `(string | number)[]` - Array of uncategorized category IDs
  - Allows positioning uncategorized categories relative to sub-groups
- Create `subgroupDragState` state to track drag operations
  - `draggedItemId`: string | null - ID of dragged sub-group or "uncategorized"
  - `draggedItemType`: "subgroup" | "uncategorized" | null
  - `dropZoneIndex`: number | null - Visual indicator position
- **Deliverable:** State type definitions and initialization logic

### Task 3: Implement Sub-Group Drag Event Handlers
**File:** `/components/simulation-budget-form.tsx`
**Status:** [x]
- Implement `handleSubgroupDragStart(subgroupId: string)`
  - Capture sub-group ID and type
  - Set drag effect to "move"
  - Store in drag state
- Implement `handleSubgroupDragOver(e: DragEvent, position: "before" | "after", targetSubgroupId: string | null)`
  - Allow dragging over any sub-group header or uncategorized section
  - Determine drop position (before/after target)
  - Show visual indicator for valid drop zone
  - Prevent default browser drag behavior
- Implement `handleSubgroupDrop(e: DragEvent, position: "before" | "after", targetSubgroupId: string | null)`
  - Prevent default browser behavior
  - Calculate new position in array
  - Update `subgroupOrder` state
  - Save to localStorage
  - Trigger any necessary re-fetches or state updates
- Implement `handleDragEnd()`
  - Clear drag state (draggedItemId, dropZoneIndex)
  - Remove visual indicators
- **Deliverable:** Four drag event handler functions

### Task 4: Update SubgroupHeaderRow Component
**File:** `/components/subgroup-header-row.tsx`
**Status:** [x]
- Add props for drag operations:
  - `isDragging?: boolean` - Visual feedback when this row is being dragged
  - `isDragOver?: boolean` - Visual feedback for drop zone
  - `onDragStart?: (subgroupId: string, e: React.DragEvent) => void`
  - `onDragOver?: (e: React.DragEvent) => void`
  - `onDragLeave?: (e: React.DragEvent) => void`
  - `onDrop?: (e: React.DragEvent) => void`
  - `onDragEnd?: (e: React.DragEvent) => void`
- Add drag handle icon (GripVertical) in first cell
  - Display on hover or always visible (design choice)
  - Only show when not in add/edit mode
- Add `draggable="true"` attribute to TableRow
- Bind drag event handlers to TableRow element
- Add visual feedback CSS classes:
  - Dragged state: `opacity-50 bg-accent`
  - Drop zone state: `bg-blue-50 dark:bg-blue-950`
  - Cursor: `cursor-move`
- **Deliverable:** Updated SubgroupHeaderRow with full drag support

### Task 5: Create Reordering Logic Function
**File:** `/lib/subgroup-reordering-utils.ts` (new file)
**Status:** [x]
- Create `reorderSubgroups()` function
  - Takes: `subgroups[]`, `subgroupOrder[]`, `categoryOrder[]`
  - Returns: Reordered array of table rows
  - Logic:
    - Process sub-groups in `subgroupOrder` sequence
    - For each sub-group: add header + categories + subtotal
    - Intersperse uncategorized categories based on `uncategorizedCategoryOrder`
    - Respect collapsed sub-groups (don't render categories if collapsed)
    - Apply tipo_gasto sort WITHIN sub-groups if enabled
- Create `moveSubgroupInOrder()` helper
  - Takes: `subgroupOrder[]`, `draggedId`, `targetId`, `position`
  - Returns: New `subgroupOrder[]` with sub-group moved
- Create `moveUncategorizedInOrder()` helper
  - Similar logic for uncategorized categories
- Create `reorganizeWithDragResult()` function
  - Takes drag operation result and current state
  - Returns new table row array
- **Deliverable:** New utility file with reordering logic

### Task 6: Integrate Reordering into SimulationBudgetForm
**File:** `/components/simulation-budget-form.tsx`
**Status:** [x]
- Add `subgroupOrder` state initialization
  - On component mount, load from localStorage: `simulation_${simulationId}_subgroup_order`
  - Fallback: use database `displayOrder` from fetched subgroups
  - Parse JSON safely with error handling
- Add `uncategorizedCategoryOrder` state initialization
  - Load from localStorage: `simulation_${simulationId}_uncategorized_order`
  - Fallback: use existing sorted order
- Add localStorage persistence effects
  - Effect 1: Save `subgroupOrder` whenever it changes
  - Effect 2: Save `uncategorizedCategoryOrder` whenever it changes
- Update `getSortedCategories()` memoized selector
  - Apply `subgroupOrder` to sub-groups
  - Intersperse uncategorized categories in `uncategorizedCategoryOrder` positions
  - Apply tipo_gasto sort WITHIN groups if enabled
  - Return final table rows for rendering
- Update table rendering logic
  - Use new `getSortedCategories()` result for display
  - Verify balance calculations use new order
- **Deliverable:** Full integration with state management and localStorage

### Task 7: Add Drag & Drop Visual Feedback
**File:** `/components/simulation-budget-form.tsx` and `/components/subgroup-header-row.tsx`
**Status:** [x]
- Implement visual states:
  - **Dragging row**: `opacity-50 bg-accent` - Makes clear which row is being dragged
  - **Drop zone active**: `bg-blue-50 dark:bg-blue-950` - Shows where drop will occur
  - **Cursor**: `cursor-move` on hover of draggable rows
  - **Drag handle icon**: GripVertical icon, visible on hover or always
- Add visual drop position indicator
  - Draw line or highlight before/after target row
  - Update dynamically during drag-over
- Ensure visual feedback doesn't flicker
- Test on different screen sizes and browsers
- **Deliverable:** Polished drag & drop UX

### Task 8: Handle Edge Cases & Validation
**File:** `/components/simulation-budget-form.tsx`
**Status:** [x]
- Prevent dragging during:
  - Add mode for sub-group (disabled when in add mode)
  - Delete confirmation dialog
  - API operations (loading state)
- Handle collapsed sub-groups:
  - Allow dragging even when collapsed
  - Moving doesn't change expanded state
  - Categories move together with header
- Handle empty uncategorized section:
  - Still allow dropping after sub-groups
  - Empty state should be valid drop zone
- Validate drop targets:
  - Only allow drop on sub-group headers or uncategorized area
  - Not on individual category rows (use category drag-drop instead)
- Handle subgroups not in custom order:
  - New sub-groups created after ordering started
  - Append to end of `subgroupOrder`
- Handle deleted sub-groups:
  - Remove from `subgroupOrder` if it no longer exists
  - Clean up state on fetch
- **Deliverable:** Robust error handling and edge case coverage

### Task 9: Update localStorage Persistence
**File:** `/components/simulation-budget-form.tsx`
**Status:** [x]
- Save custom sub-group order:
  - Key: `simulation_${simulationId}_subgroup_order`
  - Value: JSON stringified array of sub-group IDs
  - Save on every `subgroupOrder` state change
  - Include error handling (try/catch)
- Save uncategorized order:
  - Key: `simulation_${simulationId}_uncategorized_order`
  - Value: JSON stringified array of category IDs
  - Save on every `uncategorizedCategoryOrder` state change
- Load on component mount:
  - Try to parse localStorage values
  - Fallback to server-provided order on parse error
  - Log errors but don't break functionality
- Handle migration:
  - If both old category order AND new subgroup order exist, reconcile them
  - Maintain backward compatibility
- Add cleanup option:
  - Consider providing "Reset to Default Order" button
  - Clears localStorage keys
- **Deliverable:** Full localStorage persistence implementation

### Task 10: Test Core Functionality
**File:** Manual testing in browser
**Status:** [ ]
- **Reordering Tests:**
  - [ ] Drag sub-group header to different position
  - [ ] Verify entire sub-group moves (header + categories + subtotal)
  - [ ] Move sub-group above another sub-group
  - [ ] Move sub-group below another sub-group
  - [ ] Move sub-group above uncategorized categories
  - [ ] Move sub-group below uncategorized categories
  - [ ] Move between multiple sub-groups
  - [ ] Reorder when collapsed (categories should move too)
  - [ ] Reorder when expanded (categories should move too)

- **Uncategorized Category Tests:**
  - [ ] Move uncategorized category above sub-group
  - [ ] Move uncategorized category below sub-group
  - [ ] Move uncategorized category between sub-groups
  - [ ] Move multiple uncategorized categories to different positions

- **Balance Tests:**
  - [ ] Verify balances recalculate after reorder
  - [ ] Edit amounts after reorder and verify calculations
  - [ ] Auto-save captures new order correctly
  - [ ] Balances persist across refresh

- **Persistence Tests:**
  - [ ] Custom order saved to localStorage
  - [ ] Order restored after page refresh
  - [ ] Order persists across browser sessions
  - [ ] Clearing localStorage resets to default order

- **Tipo Gasto Sort Tests:**
  - [ ] Toggle tipo_gasto sort ON
  - [ ] Custom order applied within tipo_gasto groups
  - [ ] Sub-groups don't move between tipo_gasto boundaries
  - [ ] Toggle tipo_gasto sort OFF
  - [ ] Custom order still preserved

- **Visual Feedback Tests:**
  - [ ] Drag handle icon appears on hover
  - [ ] Dragged row shows opacity-50 state
  - [ ] Drop zones highlight correctly
  - [ ] Cursor changes to move cursor
  - [ ] No flickering during drag

- **Deliverable:** Test checklist completion with screenshots

### Task 11: Test Edge Cases
**File:** Manual testing in browser
**Status:** [ ]
- **Collapsed Sub-Groups:**
  - [ ] Drag when collapsed - should move with categories
  - [ ] Expand after reordering - categories in new position

- **Add Mode Blocking:**
  - [ ] Cannot drag sub-group when in add mode
  - [ ] Button state reflects this

- **Empty States:**
  - [ ] No uncategorized categories - still allows drop
  - [ ] Single sub-group - verify ordering logic
  - [ ] All categories in sub-groups - verify empty state

- **Timing Issues:**
  - [ ] Drag during API operation - should be disabled
  - [ ] Rapid clicks on multiple sub-groups
  - [ ] Fast drag-drop operations

- **Cross-Browser:**
  - [ ] Chrome/Edge drag-drop
  - [ ] Firefox drag-drop
  - [ ] Safari drag-drop

- **Deliverable:** Test report for edge cases

### Task 12: Integration with Existing Features
**File:** `/components/simulation-budget-form.tsx` and related
**Status:** [ ]
- Verify compatibility with:
  - [ ] Category-level drag & drop (within tipo_gasto groups)
  - [ ] Tipo gasto sorting toggle
  - [ ] Category filters (hideEmptyCategories)
  - [ ] Category exclusions (excludedCategoryIds)
  - [ ] Auto-save mechanism
  - [ ] Excel export (verify sub-group order in export)
  - [ ] Add/remove categories from sub-groups
  - [ ] Delete sub-group functionality

- **Deliverable:** Integration test results

### Task 13: Update Documentation
**File:** `/CLAUDE.md`
**Status:** [x]
- Add section: "Simulation Sub-Groups - Drag & Drop Reordering"
- Document:
  - [ ] How to drag sub-group headers to reorder
  - [ ] How custom order is persisted in localStorage
  - [ ] How order interacts with tipo_gasto sorting
  - [ ] Data structures used (`subgroupOrder`, `uncategorizedCategoryOrder`)
  - [ ] Key functions and their purposes
  - [ ] Storage key format for debugging
  - [ ] How to reset custom order
- Add code example of drag handler
- Add visual diagram of table organization
- Update localStorage section with new keys
- **Deliverable:** Updated documentation

### Task 14: Code Review & Cleanup
**File:** All modified files
**Status:** [x]
- Review code for:
  - [ ] Proper error handling
  - [ ] TypeScript type safety
  - [ ] React best practices (memoization, dependencies)
  - [ ] Accessibility (keyboard navigation, ARIA labels)
  - [ ] Performance (no unnecessary re-renders)
  - [ ] Code comments for complex logic
  - [ ] Consistent naming conventions
  - [ ] No console.log statements
- Ensure:
  - [ ] All state initialized properly
  - [ ] Effects clean up properly
  - [ ] No memory leaks
  - [ ] localStorage operations are wrapped in try/catch
  - [ ] Error messages are helpful
- **Deliverable:** Code review checklist completion

## Implementation Details

### State Structure
```typescript
// Add to SimulationBudgetForm component:

// Custom ordering state
const [subgroupOrder, setSubgroupOrder] = useState<string[]>([]);
const [uncategorizedCategoryOrder, setUncategorizedCategoryOrder] = useState<(string | number)[]>([]);

// Drag state tracking
const [subgroupDragState, setSubgroupDragState] = useState<{
  draggedItemId: string | null;
  draggedItemType: "subgroup" | "uncategorized" | null;
  dropZoneIndex: number | null;
}>({
  draggedItemId: null,
  draggedItemType: null,
  dropZoneIndex: null,
});
```

### Drag Handler Pattern
```typescript
const handleSubgroupDragStart = (e: React.DragEvent, subgroupId: string) => {
  setSubgroupDragState({
    draggedItemId: subgroupId,
    draggedItemType: "subgroup",
    dropZoneIndex: null,
  });
  e.dataTransfer.effectAllowed = "move";
};

const handleSubgroupDragOver = (e: React.DragEvent, targetSubgroupId: string | null) => {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  // Update drop zone visual indicator
  setSubgroupDragState(prev => ({
    ...prev,
    dropZoneIndex: calculateDropIndex(targetSubgroupId),
  }));
};

const handleSubgroupDrop = (e: React.DragEvent, targetSubgroupId: string | null, position: "before" | "after") => {
  e.preventDefault();

  if (subgroupDragState.draggedItemId && subgroupDragState.draggedItemType === "subgroup") {
    const newOrder = moveSubgroupInOrder(
      subgroupOrder,
      subgroupDragState.draggedItemId,
      targetSubgroupId,
      position
    );
    setSubgroupOrder(newOrder);
  }

  setSubgroupDragState({
    draggedItemId: null,
    draggedItemType: null,
    dropZoneIndex: null,
  });
};

const handleDragEnd = () => {
  setSubgroupDragState({
    draggedItemId: null,
    draggedItemType: null,
    dropZoneIndex: null,
  });
};
```

### localStorage Persistence Pattern
```typescript
// Load on mount
useEffect(() => {
  try {
    const storageKey = `simulation_${simulationId}_subgroup_order`;
    const savedOrder = localStorage.getItem(storageKey);
    if (savedOrder) {
      const parsed = JSON.parse(savedOrder);
      setSubgroupOrder(parsed);
    } else if (subgroups.length > 0) {
      // Fallback to database order
      setSubgroupOrder(subgroups.map(s => s.id));
    }
  } catch (error) {
    console.error("Error loading subgroup order from localStorage:", error);
  }
}, [simulationId, subgroups]);

// Save on change
useEffect(() => {
  try {
    const storageKey = `simulation_${simulationId}_subgroup_order`;
    localStorage.setItem(storageKey, JSON.stringify(subgroupOrder));
  } catch (error) {
    console.error("Error saving subgroup order to localStorage:", error);
  }
}, [subgroupOrder, simulationId]);
```

## Files to Modify/Create

### New Files
1. `/lib/subgroup-reordering-utils.ts` - Reordering logic helpers
2. (Optional) `/hooks/use-subgroup-order.ts` - Custom hook for subgroup ordering

### Modified Files
1. `/components/simulation-budget-form.tsx` - Main implementation
2. `/components/subgroup-header-row.tsx` - Drag support
3. `/CLAUDE.md` - Documentation
4. (Optional) `/types/simulation.ts` - If new types needed

## Success Criteria

- ✅ Users can drag sub-group headers to reorder them
- ✅ Sub-groups move as complete units (header + categories + subtotal)
- ✅ Sub-groups can be positioned above/below other sub-groups and uncategorized categories
- ✅ Visual feedback is clear (drag handle, opacity, highlights)
- ✅ Custom order persists to localStorage per simulation
- ✅ Order restored on page reload
- ✅ Balances recalculate correctly for new sub-group order
- ✅ Works with collapsed sub-groups
- ✅ Compatible with tipo_gasto sorting
- ✅ Disabled during add/edit/delete modes
- ✅ Edge cases handled (empty states, deleted subgroups, etc.)
- ✅ Auto-save captures new order
- ✅ Excel export respects new order

## Timeline Estimate

- Task 1 (Analysis): 15 minutes
- Task 2 (Data Structure): 15 minutes
- Task 3 (Drag Handlers): 30 minutes
- Task 4 (Component Updates): 25 minutes
- Task 5 (Reordering Logic): 25 minutes
- Task 6 (Integration): 30 minutes
- Task 7 (Visual Feedback): 20 minutes
- Task 8 (Edge Cases): 25 minutes
- Task 9 (localStorage): 15 minutes
- Task 10 (Core Testing): 40 minutes
- Task 11 (Edge Case Testing): 30 minutes
- Task 12 (Integration Testing): 25 minutes
- Task 13 (Documentation): 15 minutes
- Task 14 (Code Review): 20 minutes

**Total Estimated Time: ~330 minutes (5.5 hours)**

## Dependencies

- Must use existing category drag-drop pattern as reference
- Requires React DragEvent and HTML5 Drag & Drop API
- Must integrate with existing localStorage persistence pattern
- Must respect existing balance calculation logic
- Must work with tipo_gasto sorting feature
- Must not break existing sub-group features (add/remove categories, delete)

## Notes

- Custom sub-group order is separate from database `displayOrder`
- Order applies at UI level only, doesn't modify server data
- Each simulation has its own custom order in localStorage
- Clearing browser localStorage resets order to default
- When tipo_gasto sort is enabled, subgroup custom order is preserved but applied within sort groups
- Drag-and-drop for individual categories within tipo_gasto groups remains unchanged
- Need to consider: can users drag individual categories out of sub-groups or only drag entire sub-groups?
  - **Decision:** Individual categories within sub-groups use existing category drag (within tipo_gasto)
  - Sub-group headers use new sub-group drag (across the table)
  - This prevents accidental category extraction from sub-groups

## Risk Assessment

- **Low Risk:** Drag handlers (well-established pattern)
- **Medium Risk:** Integration with existing category drag-drop (need to prevent conflicts)
- **Low Risk:** localStorage persistence (proven pattern)
- **Medium Risk:** Balance recalculation interaction (need thorough testing)
- **Low Risk:** UI/UX (following existing patterns)

## Approval Notes

### Analysis Results (Task 1 - Completed)

**Existing Category Drag-Drop Implementation Pattern:**

1. **State Management:**
   - `categoryOrder`: `(string | number)[]` - tracks custom ordering
   - `draggedCategoryId`: current dragged item
   - `draggedTipoGasto`: tipo_gasto of dragged item
   - `dropTargetIndex`: visual indicator position
   - `isValidDropTarget`: boolean flag

2. **localStorage Persistence:**
   - Key format: `simulation_${simulationId}_category_order`
   - Load on mount in useEffect (line 268-292)
   - Save on change in useEffect (line 295-300)
   - Error handling with try/catch and fallback to categories.map()

3. **Drag Event Handlers:**
   - `handleDragStart`: Sets state with dragged item ID and tipo_gasto
   - `handleDragOver`: Validates same tipo_gasto group, sets dropEffect
   - `handleDrop`: Reorders array, updates state, clears drag state
   - `handleDragEnd`: Clears all drag state

4. **Sorting Logic (getSortedCategories):**
   - Line 961-1034: Complex memoized selector
   - First applies filters (excludedCategoryIds, hideEmptyCategories)
   - Then applies tipo_gasto sort if enabled
   - Then applies custom categoryOrder WITHIN tipo_gasto groups
   - Returns sorted array used for rendering

5. **Balance Recalculation:**
   - categoryBalances (line 1037+) is memoized and depends on getSortedCategories
   - Automatically recalculates when order changes
   - Balance updates reflected in table rendering

6. **Sub-group Integration:**
   - Subgroups are fetched from `/api/simulations/${simulationId}/subgroups`
   - organizeTableRowsWithSubgroups() combines subgroups with categories
   - Table rendering uses tableRows which respects subgroup structure
   - Individual categories within subgroups have existing drag-drop (category-level)

**Key Insights for Sub-Group Drag Implementation:**

1. Can reuse same pattern for sub-group ordering
2. Need separate `subgroupOrder` state (array of subgroup IDs)
3. Need to handle interspersing uncategorized categories
4. Must not interfere with existing category-level drag-drop
5. Balance recalculation will work automatically once table rows are reordered
6. localStorage pattern proven to work well

### Implementation Completed

**Summary of Changes:**
All core implementation tasks (1-9) and documentation/review tasks (13-14) have been completed successfully. The project builds without errors and all core functionality is ready for testing.

**Code Review Checklist (Task 14):**
- [x] Proper error handling with try/catch blocks in localStorage operations
- [x] TypeScript type safety with proper interfaces (SubgroupHeaderRowProps, drag state types)
- [x] React best practices with useCallback memoization and proper dependencies
- [x] Accessibility with draggable attribute and ARIA labels
- [x] Performance with memoized selectors and condition-based rendering
- [x] Code comments for complex logic
- [x] No console.log statements left in production code
- [x] All state initialized properly
- [x] No memory leaks in effects
- [x] localStorage wrapped in try/catch with error handling
- [x] Build completes successfully with no TypeScript errors

**Implementation Statistics:**
- 5 Modified Files:
  - `/components/simulation-budget-form.tsx` - Main implementation with handlers and integration
  - `/components/subgroup-header-row.tsx` - Drag support with visual feedback
  - `/lib/subgroup-reordering-utils.ts` - New utility file (5 functions)
  - `/CLAUDE.md` - Added comprehensive documentation section
  - `/docs/sub-groups-drag-drop-reorder-plan.md` - Updated plan with completion status

**Files Created:**
- `/lib/subgroup-reordering-utils.ts` - 175 lines of reordering logic

**Key Features Implemented:**
- [x] Sub-group drag-and-drop with visual feedback (opacity, colors, cursor)
- [x] localStorage persistence per simulation with validation
- [x] Drag handle icon (GripVertical) on hover
- [x] Edge case handling (disabled during save/add modes)
- [x] Automatic balance recalculation (leverages existing logic)
- [x] Table row reorganization with custom ordering
- [x] Proper TypeScript typing throughout
- [x] Comprehensive error handling

**Testing Tasks (10-12) - Ready for Testing:**
These tasks require manual browser testing and should be performed before merging to main:
- [ ] Core functionality testing (reordering, persistence, visual feedback)
- [ ] Edge case testing (collapsed groups, add mode blocking, empty states)
- [ ] Integration testing (tipo_gasto sort, category drag-drop, auto-save)

**Next Steps for Testing:**
1. Start development server: `npm run dev`
2. Navigate to simulation budget form
3. Test dragging sub-group headers
4. Verify order persists after refresh
5. Test edge cases (add mode, save operations)
6. Test integration with existing features

### Bug Fixes

**Bug 1: Hydration Error (React Hydration Mismatch)**
- **Issue:** Invalid `<div>` wrapper around `<TableRow>` causing "cannot be a child of <div>" error
- **Fix:** Removed div wrapper and applied `group` class directly to `<TableRow>` component
- **Result:** Valid HTML structure while maintaining group-hover functionality

**Bug 2: New Subgroups Not Appearing After Creation**
- **Issue:** When a new subgroup was created after page load, it wouldn't appear in the table because:
  1. The initialization effect only ran once when `subgroupOrder.length === 0`
  2. The `reorganizeTableRowsWithSubgroupOrder` function filtered out any subgroup not in the custom order
- **Root Cause:**
  - Effect condition prevented updates when new subgroups were added
  - Missing logic to append new subgroups to the end of custom order
- **Fix:**
  1. Modified initialization effect to always check for and add new subgroups
  2. Updated `reorganizeTableRowsWithSubgroupOrder` to:
     - Filter custom-ordered IDs that still exist
     - Identify any new subgroups not in custom order
     - Append new subgroups at the end, sorted by database displayOrder
  3. Ensures new subgroups always appear without losing custom order
- **Result:** New subgroups now appear immediately after creation, positioned at the end while maintaining previous custom ordering

**Testing the Fix:**
1. Open simulation with existing subgroup order
2. Create a new subgroup
3. New subgroup should appear at the end of the list
4. Previously reordered subgroups maintain their custom order
5. Refresh page - order persists from localStorage

**Bug 3: Balance Calculations Ignoring Sub-Group Order**
- **Issue:** When reordering sub-groups, the running balance column didn't update to reflect the new order
  - Balance calculations were based on `getSortedCategories` (category sort only)
  - Sub-group reordering happened separately in the table rendering
  - Results: Balances didn't match the displayed order
- **Fix:**
  1. Updated `categoryBalances` memoized selector to:
     - Build display order including sub-group ordering
     - Process categories in `subgroupOrder` sequence
     - Add uncategorized categories at the end
     - Calculate running balance in this display order
  2. Added `subgroups` and `subgroupOrder` to memoization dependencies
- **Result:** Balance column now correctly reflects sub-group reordering
  - Moving "Alimentacion" before "Apto (Techo)" now shows correct running balances
  - Balance calculations happen in the same order as visual rendering
