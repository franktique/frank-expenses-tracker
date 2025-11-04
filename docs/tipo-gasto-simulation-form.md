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
| Value | Label | Color |
|-------|-------|-------|
| F | Fijo (Fixed) | Blue |
| V | Variable | Green |
| SF | Semi Fijo (Semi-Fixed) | Orange |
| E | Eventual | Red |

---

## Implementation Plan

### Phase 1: Update Data Structure
- [ ] Update `SimulationBudget` type to include `tipo_gasto` field
- [ ] Ensure categories data fetched includes `tipo_gasto` from API response
- [ ] Map tipo_gasto from category to simulation budget state

### Phase 2: UI Updates - Column Addition
- [ ] Add tipo gasto column before notes column in simulation budget table
- [ ] Import and use `TipoGastoBadge` component for displaying tipo gasto
- [ ] Style column header ("Tipo Gasto")
- [ ] Ensure responsive design on mobile

### Phase 3: Sorting Implementation
- [ ] Add sort state to component (current sort column + direction)
- [ ] Make column headers clickable for sorting
- [ ] Implement sort logic:
  - Sort by tipo gasto (F → V → SF → E alphabetically)
  - Support ascending/descending toggle
  - Maintain secondary sort by category name
- [ ] Add visual indicator (icon/arrow) for active sort column
- [ ] Update table data based on sort state

### Phase 4: Testing & Validation
- [ ] Test column displays correctly on desktop and mobile
- [ ] Test sorting works for all tipo gasto values
- [ ] Test sorting with null/undefined tipo gasto values
- [ ] Test data persists correctly (no breaking changes to save functionality)
- [ ] Test with existing simulations

### Phase 5: Code Quality
- [ ] Add/update component tests if applicable
- [ ] Verify TypeScript types are correct
- [ ] Lint and format code
- [ ] Review changes for performance impact

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
- [ ] Tipo gasto column displays in simulation budget table
- [ ] Column shows before notes/balance columns
- [ ] Sorting works for all tipo gasto values
- [ ] Visual indicator shows which column is sorted
- [ ] Mobile/responsive design maintained
- [ ] No breaking changes to existing functionality
- [ ] All tests pass
- [ ] Code reviewed and merged

---

## Notes

- **Backward Compatibility**: Handle cases where `tipo_gasto` is null/undefined
- **Performance**: Sorting is client-side, no API calls needed
- **Accessibility**: Ensure sort buttons are keyboard accessible
- **Styling**: Use existing design tokens and color system

