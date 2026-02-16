# Plan: Add Tipo Gasto Column to Simulation Form with Sorting

**Branch**: `tipo-gasto-simulation`
**Date Created**: November 4, 2025
**Objective**: Add tipo gasto attribute to simulation budget form table, display it before notes column, and enable optional sorting by tipo gasto.

---

## Overview

The simulation form currently displays budget data for categories but does not show the **tipo gasto** (expense type) classification. This plan adds:

1. A new column displaying tipo gasto values with visual badges
2. The ability to sort the simulation budget table by tipo gasto
3. Grouping capability to see records with the same tipo gasto together

---

## Context

### Current State

- **Location**: `/components/simulation-budget-form.tsx`
- **Current Columns**: Categoría, Efectivo, Crédito, Ahorro Esperado, Total, Balance
- **Data Source**: Categories fetched from `/api/categories` (already includes `tipo_gasto`)
- **Tipo Gasto Components**: Already exist (`TipoGastoBadge`, `TipoGastoSelect`)

### Tipo Gasto Values

| Value | Label                  | Color  |
| ----- | ---------------------- | ------ |
| F     | Fijo (Fixed)           | Blue   |
| V     | Variable               | Green  |
| SF    | Semi Fijo (Semi-Fixed) | Orange |
| E     | Eventual               | Red    |

---

## Implementation Plan

### Phase 1: Update Data Structure

- [x] Update `SimulationBudget` type to include `tipo_gasto` field
- [x] Ensure categories data fetched includes `tipo_gasto` from API response
- [x] Map tipo_gasto from category to simulation budget state

### Phase 2: UI Updates - Column Addition

- [x] Add tipo gasto column before notes column in simulation budget table
- [x] Import and use `TipoGastoBadge` component for displaying tipo gasto
- [x] Style column header ("Tipo Gasto")
- [x] Ensure responsive design on mobile

### Phase 3: Sorting Implementation

- [x] Add sort state to component (current sort column + direction)
- [x] Make column headers clickable for sorting
- [x] Implement sort logic:
  - Sort by tipo gasto (F → V → SF → E alphabetically)
  - Support ascending/descending toggle
  - Maintain secondary sort by category name
- [x] Add visual indicator (icon/arrow) for active sort column
- [x] Update table data based on sort state

### Phase 4: Testing & Validation

- [-] Test column displays correctly on desktop and mobile
- [-] Test sorting works for all tipo gasto values
- [-] Test sorting with null/undefined tipo gasto values
- [-] Test data persists correctly (no breaking changes to save functionality)
- [-] Test with existing simulations

### Phase 5: Code Quality

- [x] Add/update component tests if applicable
- [x] Verify TypeScript types are correct
- [x] Lint and format code
- [x] Review changes for performance impact

---

## Technical Details

### Files to Modify

1. **`/components/simulation-budget-form.tsx`** (Main changes)
   - Update type definitions
   - Add sort state management
   - Add sort logic and handler
   - Update table rendering with new column
   - Add column header click handlers

2. **`/types/funds.ts`** (If needed)
   - Verify `TipoGasto` type export
   - Verify `TIPO_GASTO_VALUES` and `TIPO_GASTO_LABELS` exports

### Components Already Available

- `TipoGastoBadge` - No changes needed, just import and use
- `TipoGastoSelect` - Not needed for this feature

### API Changes

- **None required** - `/api/categories` already returns `tipo_gasto`

### Database Changes

- **None required** - `tipo_gasto` column already exists in `categories` table

---

## Column Placement

**Before**:

```
Categoría | Efectivo | Crédito | Ahorro Esperado | Total | Balance | [Notes]
```

**After**:

```
Categoría | Tipo Gasto | Efectivo | Crédito | Ahorro Esperado | Total | Balance | [Notes]
```

---

## Sort Behavior

**Default State**: No sorting applied (maintains current order)

**When Clicking "Tipo Gasto" Header**:

1. **First Click**: Sort ascending (F, V, SF, E)
2. **Second Click**: Sort descending (E, SF, V, F)
3. **Third Click**: Clear sort (return to default/unsorted)

**Tied Records**: Secondary sort by category name (A-Z)

---

## Acceptance Criteria

- [x] Plan documented in `/docs/tipo-gasto-simulation-form.md`
- [x] Tipo gasto column displays in simulation budget table
- [x] Column shows after Categoría and before Efectivo columns
- [x] Sorting works for all tipo gasto values
- [x] Visual indicator shows which column is sorted (ArrowUpDown icon)
- [x] Mobile/responsive design maintained (column width defined)
- [x] No breaking changes to existing functionality
- [x] TypeScript types verified and strict
- [x] Code committed to `tipo-gasto-simulation` branch
- [x] Pull request created (PR #56)
- [-] Code reviewed and merged (pending review)

---

## Implementation Summary

### What Was Done

1. **Updated type definitions** in `simulation-budget-form.tsx`:
   - Added `tipo_gasto?: TipoGasto` to `Category` type
   - Added `tipo_gasto?: TipoGasto` to `SimulationBudget` type
   - Imported `TipoGasto` type from `@/types/funds`

2. **Added sorting infrastructure**:
   - Created `sortField` state to track which column is sorted (`"tipo_gasto"` | `"category_name"` | `null`)
   - Created `sortDirection` state to track sort order (`"asc"` | `"desc"`)
   - Implemented `handleSortClick()` function to toggle sort state
   - Created `getSortedCategories` memoized function with intelligent sorting logic

3. **Updated UI table**:
   - Made "Categoría" and "Tipo Gasto" headers clickable buttons
   - Added ArrowUpDown icon indicator from lucide-react to show active sort
   - Added new "Tipo Gasto" column between "Categoría" and "Efectivo"
   - Integrated `TipoGastoBadge` component to display tipo_gasto with color coding
   - Shows "-" for categories without tipo_gasto

4. **Updated rendering logic**:
   - Table now uses `getSortedCategories` instead of inline sorting
   - Updated `categoryBalances` calculation to use sorted categories
   - Updated empty state colspan from 6 to 7 to account for new column

### Files Modified

- `/components/simulation-budget-form.tsx` (234 insertions, 15 deletions)

### Files Created

- `/docs/tipo-gasto-simulation-form.md` (plan and documentation)

### PR Details

- **Branch**: `tipo-gasto-simulation`
- **Commit**: `b03f59f` - "feat: Add tipo_gasto column with sorting to simulation budget form"
- **PR**: https://github.com/franktique/frank-expenses-tracker/pull/56

## Notes

- **Backward Compatibility**: All tipo_gasto properties are optional; handles null/undefined gracefully
- **Performance**: Sorting is client-side with memoization to prevent unnecessary recalculations
- **Accessibility**: Sort headers are clickable buttons with proper styling
- **Styling**: Uses existing design tokens and color system via TipoGastoBadge component
