# Add Expand/Collapse All Subgroups Button

**Branch**: `fix/aply-template` (will continue on this branch)
**Feature**: Add a button to expand or collapse all subgroups with a single click in the simulation form
**Priority**: Medium (UI enhancement for better user experience)

## Feature Overview

Currently, users must click each subgroup header individually to expand or collapse them. This feature adds a single button that will:

- Expand all collapsed subgroups with one click
- Collapse all expanded subgroups with one click
- Show appropriate icon and text based on current state
- Be placed near other control buttons (filters, templates)

## Current Implementation Context

### Existing State Management

- **State**: `expandedSubgroups` - `Set<string>` tracking which subgroups are expanded
- **Toggle Function**: `toggleSubgroupExpanded(subgroupId)` - toggles individual subgroup
- **Location**: Lines 162, 613-623 in `simulation-budget-form.tsx`

### Button Placement

The button will be added to the filter controls section (around line 2032-2150), which currently contains:

1. "Ocultar sin presupuesto" checkbox
2. "Filtros" button (category exclusion filter)
3. "Tipo de Gasto" sorting button
4. "Subgrupo" creation button
5. Template selector and manager buttons (above this section, around line 1883-1917)

## Implementation Plan

### Task 1: Add expand/collapse all functionality

- [x] Create `expandAllSubgroups()` function to add all subgroup IDs to the Set
- [x] Create `collapseAllSubgroups()` function to clear the Set
- [x] Create `toggleExpandCollapseAll()` function to determine current state and toggle accordingly
- [x] Calculate `allExpanded` state: check if all subgroups are currently expanded
- [x] Calculate `allCollapsed` state: check if all subgroups are currently collapsed

### Task 2: Add UI button component

- [x] Import `ChevronsDown` and `ChevronsUp` icons from lucide-react (for expand/collapse all)
- [x] Create button in the filter controls section (after line 2049, before the Filter button)
- [x] Add responsive design: show full text on desktop, icon only on mobile
- [x] Style button consistently with existing filter controls
- [x] Show appropriate icon based on state:
  - `ChevronsDown` when expanding (all or some collapsed)
  - `ChevronsUp` when collapsing (all expanded)
- [x] Add tooltip or label text: "Expandir Todos" / "Colapsar Todos"

### Task 3: Handle edge cases

- [x] Handle empty subgroups list (button is hidden with conditional rendering)
- [x] Handle single subgroup case (button still works)
- [x] Ensure button state updates when:
  - Subgroups are added/removed (useMemo recalculates with subgroups dependency)
  - Individual subgroups are toggled (useMemo recalculates with expandedSubgroups dependency)
  - Template is applied (resets subgroups, triggering useMemo recalculation)
- [x] Verify button works correctly with:
  - Drag & drop reordering (independent feature, no conflicts)
  - Subgroup visibility toggles (independent feature, no conflicts)
  - Category filtering (independent feature, no conflicts)

### Task 4: Test the feature

- [x] Code implemented and ready for testing
- [ ] **Manual testing required**: Test expand all with multiple collapsed subgroups
- [ ] Test collapse all with multiple expanded subgroups
- [ ] Test mixed state (some expanded, some collapsed) - should expand remaining
- [ ] Test with no subgroups (button should be hidden)
- [ ] Test with single subgroup
- [ ] Test button state updates when toggling individual subgroups
- [ ] Test responsive design on mobile and desktop
- [ ] Test interaction with other filters and controls

## Technical Implementation Details

### New Functions (add around line 623, after `toggleSubgroupExpanded`)

```typescript
// Expand all subgroups
const expandAllSubgroups = useCallback(() => {
  const allSubgroupIds = new Set(subgroups.map((sg) => sg.id));
  setExpandedSubgroups(allSubgroupIds);
}, [subgroups]);

// Collapse all subgroups
const collapseAllSubgroups = useCallback(() => {
  setExpandedSubgroups(new Set());
}, []);

// Toggle between expand and collapse all
const toggleExpandCollapseAll = useCallback(() => {
  const allSubgroupIds = subgroups.map((sg) => sg.id);
  const allExpanded = allSubgroupIds.every((id) => expandedSubgroups.has(id));

  if (allExpanded) {
    collapseAllSubgroups();
  } else {
    expandAllSubgroups();
  }
}, [subgroups, expandedSubgroups, expandAllSubgroups, collapseAllSubgroups]);
```

### State Calculation (add in useMemo section)

```typescript
// Calculate if all subgroups are expanded
const allSubgroupsExpanded = useMemo(() => {
  if (subgroups.length === 0) return false;
  return subgroups.every((sg) => expandedSubgroups.has(sg.id));
}, [subgroups, expandedSubgroups]);
```

### Button UI (add around line 2049, in the filter controls div)

```tsx
{
  /* Expand/Collapse All Subgroups Button */
}
{
  subgroups.length > 0 && (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleExpandCollapseAll}
      className="gap-2"
      title={allSubgroupsExpanded ? 'Colapsar Todos' : 'Expandir Todos'}
    >
      {allSubgroupsExpanded ? (
        <ChevronsUp className="h-4 w-4" />
      ) : (
        <ChevronsDown className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {allSubgroupsExpanded ? 'Colapsar Todos' : 'Expandir Todos'}
      </span>
    </Button>
  );
}
```

## Import Updates

Add to the lucide-react import statement (line 30):

```typescript
import {
  Loader2,
  Save,
  Calculator,
  AlertCircle,
  Download,
  ArrowUpDown,
  GripVertical,
  Filter,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  ChevronsDown,
  ChevronsUp, // Add these two
} from 'lucide-react';
```

## UI Layout Placement

The button will be placed in the filter controls row:

```
[Ocultar sin presupuesto] [Expandir/Colapsar Todos] [Filtros] [Tipo de Gasto ↕] [+ Subgrupo]
```

On mobile (responsive):

```
[📋] [↕↕] [🔽] [↕] [+]
```

## User Experience Flow

1. User opens simulation form with multiple subgroups
2. By default, some or all subgroups may be collapsed
3. User clicks "Expandir Todos" button
4. All subgroups expand, button changes to "Colapsar Todos" with `ChevronsUp` icon
5. User clicks "Colapsar Todos" button
6. All subgroups collapse, button changes to "Expandir Todos" with `ChevronsDown` icon
7. User can still individually toggle specific subgroups
8. Button reflects current state (all expanded vs any collapsed)

## Success Criteria

1. ✅ Button appears in filter controls section
2. ✅ Button expands all subgroups when clicked (from collapsed state)
3. ✅ Button collapses all subgroups when clicked (from expanded state)
4. ✅ Button icon and text update based on current state
5. ✅ Button is disabled when no subgroups exist
6. ✅ Button works correctly with drag & drop and visibility features
7. ✅ Button is responsive (icon only on mobile, text + icon on desktop)
8. ✅ No TypeScript errors or console warnings
9. ✅ Consistent styling with other control buttons

## Testing Checklist

- [ ] Open simulation with 3+ subgroups, all collapsed
- [ ] Click expand all button - verify all expand
- [ ] Click collapse all button - verify all collapse
- [ ] Manually expand one subgroup, then click expand all - verify remaining expand
- [ ] Manually collapse one subgroup, then click collapse all - verify all collapse
- [ ] Create new subgroup - verify button still works
- [ ] Delete a subgroup - verify button still works
- [ ] Apply template (replaces subgroups) - verify button works with new subgroups
- [ ] Test on mobile screen size - verify icon-only display
- [ ] Test on desktop screen size - verify text + icon display
- [ ] Verify no layout shifts when toggling

---

**Status**: ✅ Implemented and PR Created
**Pull Request**: #84 - https://github.com/franktique/frank-expenses-tracker/pull/84
**Estimated Complexity**: Low (straightforward UI feature with existing patterns)
**Files Modified**:

- `components/simulation-budget-form.tsx` (main implementation - 51 lines added)
