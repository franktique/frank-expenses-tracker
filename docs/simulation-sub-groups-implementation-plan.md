# Simulation Sub-Groups Implementation Plan

**Branch**: `simulation-sub-groups`
**Date**: 2025-11-05
**Feature**: Add sub-group functionality to the Simulation Budget Form

## Overview

Implement a sub-group management system for the simulation budget form that allows users to:

1. Create custom sub-groups by selecting multiple categories
2. Display sub-groups with collapsible headers showing partial subtotals
3. Delete sub-groups directly from the header with one click
4. Persist sub-groups to database across sessions

## Visual Flow

```
Initial State:
[Crear Subgrupo] button visible

User clicks [Crear Subgrupo]:
- Table rows show checkboxes on left
- Button changes to [Finalizar Crear Subgrupo] with color change (red/danger)
- User selects multiple categories

User clicks [Finalizar Crear Subgrupo]:
- Modal popup appears asking for sub-group name
- User enters name and confirms
- Sub-group is created and visualized in table

Table Layout:
┌─────────────────────────────────────────────────────────────────┐
│ ▼ Subgrupo: "Servicios"  │ - │ 300 │ 50 │ 30 │ 380 │      │ [🗑 delete] │
├─────────────────────────────────────────────────────────────────┤
│ □ [Category 1] │ F │ 100 │ 50 │ 20 │ 170 │ 5000 │                       │
│ □ [Category 2] │ F │ 200 │ 0  │ 10 │ 210 │ 4800 │                       │
├─────────────────────────────────────────────────────────────────┤
│ Subtotal:      │ - │ 300 │ 50 │ 30 │ 380 │      │                       │ ← Subtotal row
├─────────────────────────────────────────────────────────────────┤
│ □ [Category 3] │ V │ 150 │ 75 │ 25 │ 250 │ 5100 │ (Uncategorized)       │
├─────────────────────────────────────────────────────────────────┤
│ ▼ Subgrupo: "Seguros"    │ - │ 500 │ 100│ 50 │ 650 │      │ [🗑 delete] │
├─────────────────────────────────────────────────────────────────┤
│ □ [Category 4] │ SF│ 500 │ 100│ 50 │ 650 │ 3500 │                       │
├─────────────────────────────────────────────────────────────────┤
│ Subtotal:      │ - │ 500 │ 100│ 50 │ 650 │      │                       │
├─────────────────────────────────────────────────────────────────┤
│ □ [Category 5] │ V │ 200 │ 100│ 20 │ 320 │ 2000 │ (Uncategorized)       │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Tasks

### Phase 1: Data Model & Infrastructure

- [ ] **1.1 - Create database schema for sub-groups**
  - [ ] Create `simulation_subgroups` table with columns:
    - `id`: UUID primary key (auto-generated)
    - `simulation_id`: foreign key to simulations
    - `name`: VARCHAR(255) for sub-group name
    - `display_order`: INTEGER for ordering within simulation
    - `created_at`: TIMESTAMP
    - `updated_at`: TIMESTAMP
  - [ ] Create `subgroup_categories` junction table:
    - `id`: UUID primary key
    - `subgroup_id`: foreign key to simulation_subgroups
    - `category_id`: foreign key to categories
    - `order_within_subgroup`: INTEGER for category order within sub-group
  - [ ] Add database indexes for query performance
  - [ ] Create migration endpoint: `/api/migrate-simulation-subgroups`

- [ ] **1.2 - Create sub-group data types**
  - [ ] Define `Subgroup` type with fields:
    - `id`: unique identifier (UUID)
    - `name`: display name
    - `simulationId`: parent simulation reference
    - `categoryIds`: array of category IDs
    - `displayOrder`: order within simulation
    - `createdAt`: timestamp
    - `updatedAt`: timestamp
    - `isExpanded`: collapse/expand state (UI only, not persisted)
  - [ ] Create `SubgroupCategory` type for junction data
  - [ ] Update `SimulationBudget` type to include optional `subgroupId`
  - [ ] Create types in `types/simulation.ts`

- [ ] **1.3 - Create API endpoints for sub-group operations**
  - [ ] `POST /api/simulations/[id]/subgroups` - Create new sub-group
    - Accepts: `name`, `categoryIds`
    - Returns: `Subgroup` with generated ID
    - Validates: non-empty name, valid category IDs, simulation exists
  - [ ] `GET /api/simulations/[id]/subgroups` - Fetch all sub-groups for simulation
    - Returns: Array of `Subgroup` with category IDs populated
    - Includes proper error handling
  - [ ] `PATCH /api/simulations/[id]/subgroups/[subgroupId]` - Update sub-group
    - Accepts: `name`, `categoryIds`, `displayOrder`
    - Returns: Updated `Subgroup`
  - [ ] `DELETE /api/simulations/[id]/subgroups/[subgroupId]` - Delete sub-group
    - Cascades category associations
    - Returns: success confirmation
  - [ ] Implement proper error handling and validation in all endpoints

### Phase 2: Component State Management

- [ ] **2.1 - Add state variables to SimulationBudgetForm**
  - [ ] `subgroups`: array of sub-groups fetched from database
  - [ ] `isLoadingSubgroups`: loading state for sub-group fetch
  - [ ] `selectedCategoryIds`: currently selected category IDs for sub-group creation
  - [ ] `isSubgroupCreationMode`: boolean to track if in selection mode
  - [ ] `expandedSubgroups`: set/map of expanded sub-group IDs (UI state only)
  - [ ] Update existing state initialization

- [ ] **2.2 - Load sub-groups from database on component mount**
  - [ ] Add `useEffect` to fetch sub-groups via `GET /api/simulations/[id]/subgroups`
  - [ ] Show loading state while fetching
  - [ ] Handle API errors gracefully with error toast
  - [ ] Ensure proper cleanup on component unmount
  - [ ] Handle race conditions if simulationId changes

- [ ] **2.3 - Initialize expand/collapse state**
  - [ ] Load `expandedSubgroups` state from sessionStorage (temporary, not persistent)
  - [ ] Default to all collapsed when first loaded
  - [ ] Allow user to collapse/expand during session

### Phase 3: UI Controls

- [ ] **3.1 - Implement "Crear Subgrupo" / "Finalizar Crear Subgrupo" button**
  - [ ] Create conditional button that toggles between states
  - [ ] Initial state: "Crear Subgrupo" (neutral color)
  - [ ] Active state: "Finalizar Crear Subgrupo" (red/danger color)
  - [ ] Handle click events to toggle `isSubgroupCreationMode`

- [ ] **3.2 - Add checkboxes to table rows**
  - [ ] Show checkboxes only when `isSubgroupCreationMode` is true
  - [ ] Checkbox in leftmost column before category name
  - [ ] Handle checkbox state in `selectedCategoryIds`
  - [ ] Checkbox click should not affect row selection or other interactions

- [ ] **3.3 - Implement modal for sub-group naming**
  - [ ] Create `SubgroupNameDialog` component (or use existing dialog)
  - [ ] Modal triggers on "Finalizar Crear Subgrupo" click
  - [ ] Input field for sub-group name with validation
  - [ ] Confirm/Cancel buttons with loading state during save
  - [ ] Show validation errors (empty name, duplicate name, special characters)
  - [ ] Call `POST /api/simulations/[id]/subgroups` with name and categoryIds
  - [ ] Show loading spinner during API call
  - [ ] Handle API errors and show error toast
  - [ ] On success: close modal, refresh sub-groups list, clear selection, reset mode
  - [ ] On error: show validation message, keep dialog open for retry

### Phase 4: Sub-Group Display & Calculations

- [ ] **4.1 - Implement sub-group header rows**
  - [ ] Create `SubgroupHeaderRow` component showing:
    - Subgroup name with collapse/expand toggle icon
    - Delete button (trash icon)
    - Subtotal calculations (Efectivo, Crédito, Ahorro Esperado, Total)
  - [ ] Style to distinguish from category rows (different background)

- [ ] **4.2 - Calculate sub-group subtotals**
  - [ ] Create utility function: `calculateSubgroupSubtotals(subgroup, budgetData, categories)`
  - [ ] Sum across selected columns for sub-group categories
  - [ ] Memoize calculations to prevent unnecessary recalculations
  - [ ] Handle missing or zero values gracefully

- [ ] **4.3 - Reorganize table rendering with sort integration**
  - [ ] Refactor `getSortedCategories()` to handle sub-groups and uncategorized categories
  - [ ] Create helper function `getPrimaryTipoGasto(subgroup)`:
    - Count tipo_gasto occurrences in sub-group categories
    - Return most frequent value, or first category's tipo_gasto as tie-breaker
    - Return undefined if no categories or no tipo_gasto values
  - [ ] Modify sort logic to:
    - Calculate primary tipo_gasto for each sub-group
    - Apply tipo_gasto sort to both sub-groups and uncategorized categories
    - Maintain sub-group integrity (never break apart a sub-group)
    - Preserve category order within each sub-group
  - [ ] Merge sub-groups and uncategorized categories into single sorted list
  - [ ] Respect existing filters (hideEmptyCategories, excludedCategoryIds)
  - [ ] Maintain custom display_order for drag-drop reordering of top-level items
  - [ ] When rendering, iterate through sorted list and output:
    - Subgroup Header → Subgroup Categories → Subtotal Row (for sub-groups)
    - Category Row (for uncategorized categories)
  - [ ] Ensure tipo_gasto sort toggle still works correctly with sub-groups

- [ ] **4.4 - Implement expand/collapse functionality**
  - [ ] Click on sub-group header toggle expands/collapses categories
  - [ ] Store expanded state in component state (not localStorage)
  - [ ] Smooth animation transitions (CSS or library)
  - [ ] Update sub-group header icon on toggle

### Phase 5: Sub-Group Deletion & Edge Cases

- [ ] **5.1 - Implement delete button on sub-group header**
  - [ ] Add delete/trash icon button on each `SubgroupHeaderRow`
  - [ ] Button appears on the right side of the sub-group header
  - [ ] Button shows on hover or always visible
  - [ ] Clicking triggers confirmation dialog before deletion

- [ ] **5.2 - Implement delete functionality**
  - [ ] Create `deleteSubgroup(subgroupId)` async function
  - [ ] Show confirmation dialog before deletion
  - [ ] Confirmation dialog shows sub-group name and affected categories count
  - [ ] Call `DELETE /api/simulations/[id]/subgroups/[subgroupId]`
  - [ ] Show loading state during deletion
  - [ ] On success:
    - Remove sub-group from state
    - Restore categories to ungrouped state
    - Refresh table reorganization
    - Show success toast notification
  - [ ] On error: show error toast, allow retry

- [ ] **5.3 - Handle edge cases**
  - [ ] Prevent deletion if categories are in edit mode
  - [ ] Handle deletion of sub-group while in creation mode
  - [ ] Validate sub-group names (max length, special characters)
  - [ ] Prevent duplicate sub-group names within same simulation

### Phase 6: Integration & Polish

- [ ] **6.1 - Integrate with existing features**
  - [ ] Ensure drag-and-drop works with sub-groups and uncategorized categories
    - [ ] Allow reordering of sub-groups as units
    - [ ] Preserve internal category order within sub-groups
    - [ ] Allow uncategorized categories to move between sub-groups
  - [ ] Verify tipo_gasto sort works correctly with sub-groups
    - [ ] Sub-groups maintain integrity (never broken apart)
    - [ ] Sub-groups sorted by primary tipo_gasto
    - [ ] Categories within sub-groups preserve custom order
    - [ ] Uncategorized categories sort by their tipo_gasto
  - [ ] Test all sort combinations (Estado 0, 1, 2)
  - [ ] Maintain export functionality (include sub-group structure in Excel)
  - [ ] Verify "Ocultar sin presupuesto" and "Excluir categorías" filters work with sub-groups
    - [ ] Filter rules apply to categories inside sub-groups
    - [ ] Empty sub-groups are handled correctly

- [ ] **6.2 - Visual & UX polish**
  - [ ] Add hover states to sub-group headers
  - [ ] Add icons (ChevronDown, ChevronUp, Trash, etc.) from lucide-react
  - [ ] Ensure responsive design on mobile
  - [ ] Add smooth transitions for expand/collapse
  - [ ] Ensure good color contrast and accessibility

- [ ] **6.3 - Error handling & validation**
  - [ ] Handle API errors gracefully during save operations
  - [ ] Show meaningful error messages to user
  - [ ] Implement retry logic if needed
  - [ ] Handle concurrent operations (e.g., delete while saving)

### Phase 7: Testing & Documentation

- [ ] **7.1 - Unit tests**
  - [ ] Test sub-group CRUD operations
  - [ ] Test subtotal calculations
  - [ ] Test localStorage persistence
  - [ ] Test state management

- [ ] **7.2 - Integration tests**
  - [ ] Test sub-group creation workflow
  - [ ] Test sub-group deletion workflow
  - [ ] Test interaction with existing features (sort, filter, drag-drop)
  - [ ] Test expand/collapse functionality

- [ ] **7.3 - Documentation**
  - [ ] Update CLAUDE.md with sub-group feature documentation
  - [ ] Add inline code comments for complex logic
  - [ ] Document localStorage schema
  - [ ] Create user guide for sub-group features

## Technical Considerations

### Database Schema

```sql
-- Main sub-groups table
CREATE TABLE simulation_subgroups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(simulation_id, name)
);

-- Junction table for category membership
CREATE TABLE subgroup_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subgroup_id UUID NOT NULL REFERENCES simulation_subgroups(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  order_within_subgroup INTEGER DEFAULT 0,
  UNIQUE(subgroup_id, category_id)
);

-- Create indexes for performance
CREATE INDEX idx_simulation_subgroups_simulation_id ON simulation_subgroups(simulation_id);
CREATE INDEX idx_subgroup_categories_subgroup_id ON subgroup_categories(subgroup_id);
CREATE INDEX idx_subgroup_categories_category_id ON subgroup_categories(category_id);
```

### API Response Schema

```typescript
// GET /api/simulations/[id]/subgroups
{
  "subgroups": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "Servicios",
      "simulationId": 123,
      "displayOrder": 0,
      "categoryIds": ["cat-1", "cat-2", "cat-5"],
      "createdAt": "2025-11-05T10:30:00Z",
      "updatedAt": "2025-11-05T10:30:00Z"
    }
  ]
}

// POST /api/simulations/[id]/subgroups
// Request:
{
  "name": "Servicios",
  "categoryIds": ["cat-1", "cat-2", "cat-5"]
}
// Response: Same as GET (single subgroup object)
```

### State Management

- Fetch sub-groups from database API on component mount via `GET /api/simulations/[id]/subgroups`
- Store sub-groups in component state (`subgroups` array)
- Maintain separate `expandedSubgroups` state for UI-only toggles (sessionStorage if persistence needed)
- Track loading state (`isLoadingSubgroups`) separately from data
- Use memoization for expensive calculations (subtotals)
- Implement proper cleanup in useEffect hooks
- Handle API errors gracefully with error states and user feedback

### Component Structure

```
SimulationBudgetForm
├── CreateSubgroupButton (toggle)
├── SubgroupNameDialog (modal)
└── BudgetTable
    ├── SubgroupHeaderRow (with delete button)
    ├── CategoryRow (with checkbox when in creation mode)
    ├── SubgroupSubtotalRow
    └── ... (repeat for each subgroup)
```

## Interaction with Tipo Gasto Sort Functionality

### Current Behavior

The existing `tipoGastoSortState` toggles between 3 states:

- State 0: No sort (uses custom drag-drop order)
- State 1: Fijo → Semi-Fijo → Variable → Eventual
- State 2: Variable → Semi-Fijo → Fijo → Eventual

Within each tipo_gasto group, it respects the custom `categoryOrder` from drag-drop reordering.

### Interaction with Sub-Groups

**Design Decision**: Sub-groups should be treated as **indivisible units** in the sort order. This maintains logical grouping and prevents sub-groups from being scattered across the table.

**Behavior**:

1. **Sub-group integrity is maintained** - A sub-group is never broken apart by tipo_gasto sort
2. **Sub-groups are sorted by their primary tipo_gasto** - Use the most common tipo_gasto value in the sub-group, or the first category's tipo_gasto as the tie-breaker
3. **Categories within sub-groups maintain custom order** - The drag-drop reorder within a sub-group is preserved
4. **Uncategorized categories follow the sort rules** - They can be sorted by tipo_gasto along with sub-group ordering

**Example**:

```
Original Order (no sort):
- Subgroup "Servicios" [F, F, V]  (mixed: 2 Fijo, 1 Variable)
- Category "Netflix" [V] (uncategorized)
- Subgroup "Seguros" [SF]

With Tipo Gasto Sort State 1 (Fijo first):
- Subgroup "Servicios" [F, F, V]  (primary: Fijo - 2 instances)
- Subgroup "Seguros" [SF]  (primary: Semi-Fijo)
- Category "Netflix" [V]  (uncategorized, Variable)

With Tipo Gasto Sort State 2 (Variable first):
- Category "Netflix" [V]  (uncategorized, Variable)
- Subgroup "Servicios" [F, F, V]  (mixed group - sorts by Variable presence or count)
- Subgroup "Seguros" [SF]  (primary: Semi-Fijo)
```

### Implementation Notes for Phase 4.3

When implementing the sort with sub-groups:

1. Calculate a "primary tipo_gasto" for each sub-group:
   - Count tipo_gasto occurrences in the sub-group
   - Use the most frequent tipo_gasto as primary
   - If tie, use first category's tipo_gasto
2. Apply tipo_gasto sort to sub-groups and uncategorized categories using their primary tipo_gasto
3. Within each sub-group, preserve the existing category order (from drag-drop)
4. When rendering, iterate through sorted items (sub-groups + categories) and expand/collapse sub-groups as needed

This approach maintains the logical grouping of sub-groups while respecting the user's sort preferences.

## Data Structure for Mixed Rendering

To support uncategorized categories interspersed with sub-groups, the component needs a unified data structure:

```typescript
type TableItem = {
  type: 'subgroup' | 'category';
  displayOrder: number;

  // For subgroup items
  subgroupId?: string;
  subgroupName?: string;
  categoryCount?: number;
  subtotals?: Subtotals;

  // For category items
  categoryId?: string | number;
  categoryName?: string;
} & BudgetData;
```

The rendering algorithm:

1. Fetch all sub-groups with their categories and display_order
2. Fetch all categories and determine which are uncategorized
3. Merge: create TableItem[] combining sub-groups (with header + categories + subtotal rows) and uncategorized categories
4. Sort by displayOrder to maintain user's preferred sequence
5. Render the merged array in order

This allows uncategorized categories to appear anywhere in the table based on user's drag-drop ordering.

## Database Migration

Once the database schema is created, a migration endpoint should be added:

- **Endpoint**: `POST /api/migrate-simulation-subgroups`
- **Purpose**: Create the `simulation_subgroups` and `subgroup_categories` tables in existing databases
- **Usage**: Called once by admin/deployment process
- **Response**:
  ```json
  {
    "success": true,
    "message": "Database tables created successfully",
    "tables": ["simulation_subgroups", "subgroup_categories"]
  }
  ```
- **Error Handling**: Check if tables already exist and return appropriate message

## Important Implementation Notes

### Database Cascade Behavior

- When a simulation is deleted: all associated sub-groups are automatically deleted (ON DELETE CASCADE)
- When a sub-group is deleted: all category associations are automatically removed (ON DELETE CASCADE)
- Category deletions do NOT affect sub-groups (they become invalid but sub-group persists)
- Consider adding validation to prevent orphaned sub-groups

### Sub-Group and Category Ordering

- `simulation_subgroups.display_order` tracks order of sub-groups within a simulation
- `subgroup_categories.order_within_subgroup` tracks category order within each sub-group
- Uncategorized categories (not in any sub-group) are inserted into the display order based on user's drag-drop interactions
- Display order should be maintained during CRUD operations
- When inserting new sub-group: assign next highest display_order value
- When deleting sub-group: uncategorized categories remain, sub-group's display_order can be reused or renumbered
- Drag-drop reordering works across both sub-groups and uncategorized categories
- Table render logic must merge and sort both sub-groups and uncategorized items by display_order
- Custom display_order overrides tipo_gasto sort when `tipoGastoSortState === 0` (no sort)

### Terminology Notes

- "Estado" (State) in Spanish code = tipoGastoSortState (0, 1, or 2)
- State 0 = Estado 0 = No tipo_gasto sort (uses custom drag-drop order)
- State 1 = Estado 1 = Fijo → Semi-Fijo → Variable → Eventual
- State 2 = Estado 2 = Variable → Semi-Fijo → Fijo → Eventual

### Validation Requirements

- Sub-group name must be non-empty and unique per simulation
- Cannot create sub-group with empty categoryIds array
- Cannot add duplicate category IDs to same sub-group
- Category IDs must exist in categories table
- Maximum sub-group name length: 255 characters (database constraint)

### API Error Responses

All endpoints should return consistent error format:

```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

Common error codes:

- `400 Bad Request` - Validation errors, missing fields
- `404 Not Found` - Simulation or sub-group doesn't exist
- `409 Conflict` - Duplicate sub-group name
- `500 Internal Server Error` - Database errors

## Success Criteria

- ✓ User can create sub-groups by selecting multiple categories
- ✓ Sub-group name modal appears and validates input
- ✓ Sub-groups display with collapsible headers and subtotals
- ✓ All subtotal columns calculate correctly (Efectivo, Crédito, Ahorro Esperado, Total)
- ✓ Sub-groups can be deleted directly from header with confirmation dialog
- ✓ Delete button shows category count being affected
- ✓ Sub-group state persists in database across sessions
- ✓ Existing features (sort, filter, drag-drop, export) work with sub-groups
- ✓ UI is responsive and accessible
- ✓ Code is well-tested and documented

## Files to Modify/Create

### Modify

- `/components/simulation-budget-form.tsx` - Main component updates
- `/lib/utils.ts` - Add sub-group utility functions if needed
- `/types/funds.ts` - Update SimulationBudget type if necessary
- `CLAUDE.md` - Add feature documentation

### Create - Backend

- `/app/api/simulations/[id]/subgroups/route.ts` - GET/POST endpoints
- `/app/api/simulations/[id]/subgroups/[subgroupId]/route.ts` - PATCH/DELETE endpoints
- `/scripts/migrate-simulation-subgroups.ts` - Database migration script
- `/types/simulation.ts` - New type definitions (Subgroup, SubgroupCategory)
- `/lib/subgroup-db-utils.ts` - Database query utilities (fetch, create, update, delete)

### Create - Frontend

- `/components/subgroup-header-row.tsx` - Sub-group header with subtotals and delete button
- `/components/subgroup-name-dialog.tsx` - Name input modal
- `/lib/subgroup-calculations.ts` - Subtotal calculation utilities

### Create - Testing

- `/__tests__/components/simulation-budget-form.subgroups.test.tsx` - Component tests
- `/__tests__/api/simulations-subgroups.test.ts` - API endpoint tests
- `/__tests__/lib/subgroup-calculations.test.ts` - Calculation utility tests

## Estimated Timeline

- Phase 1: 2-3 hours (database schema, types, API endpoints)
- Phase 2: 1.5-2 hours (state management with API integration)
- Phase 3: 2-3 hours (UI controls with API calls)
- Phase 4: 3-4 hours (display & calculations)
- Phase 5: 1.5-2 hours (delete functionality and edge cases)
- Phase 6: 2-3 hours (integration & polish)
- Phase 7: 2-3 hours (testing & documentation)

**Total Estimated Time**: 15-20 hours

## Rollout Strategy

1. Complete Phase 1-2 for foundation
2. Complete Phase 3-4 for basic MVP functionality
3. Complete Phase 5 for management features
4. Complete Phase 6-7 for polish and testing
5. Create PR for review and testing
6. Deploy to production

---

**Status**: Plan Ready for Approval
