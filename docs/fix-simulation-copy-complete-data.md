# Plan: Fix Simulation Copy to Include Complete Data

**Branch:** `fix/simulation-copy-complete-data`
**Date:** 2026-01-15
**Status:** Completed

## Problem Statement

When clicking the "Copy" button on a simulation in the list, only the simulation name and description are copied. The following data is NOT being copied:

- **Ingresos Simulados** (Simulated Incomes) - from `simulation_incomes` table
- **Detalle Presupuesto Simulado** (Simulated Budget Details) - from `simulation_budgets` table
- **Subgrupos** (Sub-groups and their category associations) - from `simulation_subgroups` and `subgroup_categories` tables

### Current Code (simulation-list.tsx:187-238)

The current `handleDuplicateSimulation` function only creates a new simulation with the name and description. There's even a TODO comment acknowledging this:

```typescript
// If original simulation has budgets, we would copy them here
// For now, we'll just create the empty simulation
// TODO: Copy simulation budgets when budget API is available
```

## Solution Overview

Extend the `handleDuplicateSimulation` function to:
1. Create the new simulation (existing behavior)
2. Fetch and copy all budgets from the source simulation
3. Fetch and copy all incomes from the source simulation
4. Fetch and copy all sub-groups with their category associations

### Option A: Client-Side Copy (Multiple API Calls)
Perform all copy operations from the client using existing API endpoints.

**Pros:**
- Uses existing API endpoints, no new backend code needed
- Simpler to implement

**Cons:**
- Multiple network round-trips
- No transactional guarantee (partial failure possible)
- Slower user experience

### Option B: Server-Side Copy API (Recommended)
Create a new dedicated API endpoint `POST /api/simulations/[id]/copy` that handles all copy operations server-side in a single transaction.

**Pros:**
- Single network request from client
- Atomic operation with transactional guarantee
- Better error handling and rollback capability
- Faster execution
- Cleaner client code

**Cons:**
- Requires new API endpoint
- More backend code

## Implementation Plan

### Phase 1: Create Server-Side Copy API

#### [x] Task 1.1: Create Copy API Endpoint
**File:** `/app/api/simulations/[id]/copy/route.ts`

Create `POST /api/simulations/[id]/copy` endpoint that:
- Accepts optional `name` override (defaults to "{original_name} (Copia)")
- Copies simulation metadata
- Copies all `simulation_budgets` records
- Copies all `simulation_incomes` records
- Copies all `simulation_subgroups` and `subgroup_categories` records
- Returns the new simulation with all copied data

**Request:**
```typescript
POST /api/simulations/123/copy
{
  "name": "Custom Copy Name (optional)"
}
```

**Response:**
```typescript
{
  "success": true,
  "simulation": {
    "id": 456,
    "name": "Original Name (Copia)",
    "description": "...",
    "created_at": "..."
  },
  "copied": {
    "budgets_count": 105,
    "incomes_count": 3,
    "subgroups_count": 5
  }
}
```

#### [x] Task 1.2: Implement Budget Copying Logic
Within the copy endpoint:
- Fetch all budgets from source simulation
- Insert budgets with new simulation_id
- Preserve: `category_id`, `efectivo_amount`, `credito_amount`, `expected_savings`

#### [x] Task 1.3: Implement Income Copying Logic
Within the copy endpoint:
- Fetch all incomes from source simulation
- Insert incomes with new simulation_id
- Preserve: `description`, `amount`

#### [x] Task 1.4: Implement Subgroup Copying Logic
Within the copy endpoint:
- Fetch all subgroups from source simulation
- Create new subgroups with new simulation_id
- Generate new UUIDs for subgroup IDs
- Maintain `display_order`, `name`, `custom_order`, `custom_visibility`
- Copy `subgroup_categories` with new subgroup UUIDs
- Preserve category assignments and `order_within_subgroup`

### Phase 2: Update Client Component

#### [x] Task 2.1: Update handleDuplicateSimulation Function
**File:** `/components/simulation-list.tsx`

Modify `handleDuplicateSimulation` to:
- Call new `POST /api/simulations/[id]/copy` endpoint
- Handle success/error responses
- Show appropriate toast messages with copy summary

#### [x] Task 2.2: Add Loading State Improvements
- Show "Duplicando simulación..." message with details
- Update toast to show counts of copied items

### Phase 3: Testing & Validation

#### [ ] Task 3.1: Manual Testing Checklist
- [ ] Copy simulation with budgets only
- [ ] Copy simulation with incomes only
- [ ] Copy simulation with subgroups only
- [ ] Copy simulation with all data types
- [ ] Copy simulation with no data (empty)
- [ ] Verify all amounts are preserved correctly
- [ ] Verify subgroup category assignments are correct
- [ ] Test error handling (source simulation not found)
- [ ] Test concurrent copy operations

#### [ ] Task 3.2: Edge Cases
- [ ] Handle simulations with 100+ budgets
- [ ] Handle subgroups with special characters in names
- [ ] Verify category IDs are preserved correctly (UUID vs integer)

## Database Tables Involved

### Source Tables to Read From:
1. `simulations` - Base simulation metadata
2. `simulation_budgets` - Budget details per category
3. `simulation_incomes` - Income entries
4. `simulation_subgroups` - Sub-group definitions
5. `subgroup_categories` - Junction table for subgroup-category relationships

### Data Mapping:

| Source Field | Target Field | Notes |
|-------------|--------------|-------|
| `simulation.name` | `new_simulation.name` | Append " (Copia)" |
| `simulation.description` | `new_simulation.description` | Direct copy |
| `budget.category_id` | `new_budget.category_id` | Same category |
| `budget.efectivo_amount` | `new_budget.efectivo_amount` | Direct copy |
| `budget.credito_amount` | `new_budget.credito_amount` | Direct copy |
| `budget.expected_savings` | `new_budget.expected_savings` | Direct copy |
| `income.description` | `new_income.description` | Direct copy |
| `income.amount` | `new_income.amount` | Direct copy |
| `subgroup.id` | `new_subgroup.id` | Generate new UUID |
| `subgroup.name` | `new_subgroup.name` | Direct copy |
| `subgroup.display_order` | `new_subgroup.display_order` | Direct copy |
| `subgroup.custom_order` | `new_subgroup.custom_order` | Direct copy |
| `subgroup.custom_visibility` | `new_subgroup.custom_visibility` | Direct copy |
| `subgroup_cat.category_id` | `new_subgroup_cat.category_id` | Same category |
| `subgroup_cat.order_within_subgroup` | `new_subgroup_cat.order_within_subgroup` | Direct copy |

## Files to Modify

1. **Create:** `/app/api/simulations/[id]/copy/route.ts` - New copy API endpoint
2. **Modify:** `/components/simulation-list.tsx` - Update `handleDuplicateSimulation`

## Risk Assessment

- **Low Risk:** Uses existing database schema, no migrations needed
- **Low Risk:** Existing API patterns are well established
- **Medium Risk:** Ensure proper UUID generation for subgroups
- **Low Risk:** Transactional approach prevents partial copies

## Success Criteria

1. Clicking "Copy" creates a complete duplicate of the simulation
2. All budgets are copied with correct amounts
3. All incomes are copied with descriptions and amounts
4. All subgroups are copied with their category assignments
5. User sees confirmation toast with copy summary
6. Original simulation remains unchanged
