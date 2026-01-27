# Fix/Clone Simulation - Template Category Relationships

## Branch: `fix/clone-simulation`

## Problem Statement

Currently, when saving a simulation's subgroups as a template using "Save as Template", only the subgroup names and display order are saved. The category relationships (which categories belong to each subgroup) are NOT saved in the template.

When applying a template to a different simulation:
1. The subgroups are created correctly with their names
2. However, the subgroups are empty - no categories are assigned
3. Users must manually add categories to each subgroup again

**Expected Behavior:**
- When saving as template, save both subgroup names AND their category IDs
- When applying a template, automatically populate subgroups with matching categories from the target simulation
- Provide a "Refresh Template" option to update category assignments for an already-applied template

## Current Architecture Analysis

### Current Template Schema
```
subgroup_templates
├── id (UUID)
├── name (VARCHAR)
├── description (TEXT)
├── created_at
└── updated_at

template_subgroups
├── id (UUID)
├── template_id (FK → subgroup_templates)
├── name (VARCHAR)
├── display_order (INTEGER)
└── created_at
```

### Current Simulation Subgroups Schema
```
simulation_subgroups
├── id (UUID)
├── simulation_id (INTEGER)
├── name (VARCHAR)
├── display_order (INTEGER)
├── template_subgroup_id (FK → template_subgroups)
├── custom_order (INTEGER)
├── custom_visibility (BOOLEAN)
└── timestamps

subgroup_categories (junction table)
├── id (UUID)
├── subgroup_id (FK → simulation_subgroups)
├── category_id (FK → categories)
└── order_within_subgroup (INTEGER)
```

### Categories Table
```
categories
├── id (UUID)
├── name (VARCHAR)
└── tipo_gasto (VARCHAR) - F, V, SF, E
```

## Implementation Plan

### Phase 1: Database Schema Enhancement

#### Task 1.1: Create template_subgroup_categories table
- [ ] Create a new junction table `template_subgroup_categories` to store category relationships in templates
- [ ] Schema:
  ```sql
  template_subgroup_categories
  ├── id (UUID PRIMARY KEY)
  ├── template_subgroup_id (UUID FK → template_subgroups ON DELETE CASCADE)
  ├── category_name (VARCHAR 255) -- Store name for matching
  ├── order_within_subgroup (INTEGER DEFAULT 0)
  ├── created_at (TIMESTAMP)
  └── UNIQUE(template_subgroup_id, category_name)
  ```
- [ ] Add index on template_subgroup_id

**Rationale:** Store category names instead of IDs because:
1. Categories are user-specific (different users have different category IDs)
2. Templates could be shared across simulations that might have different category IDs
3. Matching by name allows flexible category assignment across simulations

#### Task 1.2: Create migration endpoint
- [ ] Create `/api/migrate-template-categories` endpoint
- [ ] Add migration to create the new table with proper constraints

### Phase 2: Update Type Definitions

#### Task 2.1: Update subgroup-templates.ts types
- [ ] Add `TemplateSubgroupCategory` type:
  ```typescript
  export type TemplateSubgroupCategory = {
    id: string;
    templateSubgroupId: string;
    categoryName: string;
    orderWithinSubgroup: number;
    createdAt: string;
  };
  ```
- [ ] Update `TemplateSubgroup` to include optional `categoryNames: string[]`
- [ ] Update `CreateTemplateSubgroupRequest` to include `categoryNames?: string[]`

### Phase 3: Update "Save as Template" Functionality

#### Task 3.1: Update save-as-template API route
- [ ] Modify `/api/simulations/[id]/save-as-template/route.ts`
- [ ] Fetch subgroups WITH their category IDs using `getSubgroupsBySimulation()`
- [ ] For each subgroup's category IDs, fetch category names from the database
- [ ] Pass category names to `createTemplate()` function

#### Task 3.2: Update createTemplate() function
- [ ] Modify `lib/subgroup-template-db-utils.ts`
- [ ] Accept `categoryNames` array in subgroup creation request
- [ ] Insert category name records into `template_subgroup_categories` table
- [ ] Return template with category names included

#### Task 3.3: Update getTemplateById() function
- [ ] Join with `template_subgroup_categories` to fetch category names
- [ ] Return subgroups with their `categoryNames` arrays

### Phase 4: Update "Apply Template" Functionality

#### Task 4.1: Update applyTemplateToSimulation() function
- [ ] Modify `lib/subgroup-template-db-utils.ts`
- [ ] Accept `simulationId` to fetch available categories for that simulation
- [ ] For each template subgroup:
  1. Create the simulation_subgroup
  2. For each category name in the template:
     - Find matching category in simulation's available categories (by name)
     - If found, insert into `subgroup_categories` junction table
- [ ] Return count of subgroups created AND categories matched

#### Task 4.2: Update apply-template API response
- [ ] Modify `/api/simulations/[id]/apply-template/route.ts`
- [ ] Include statistics: `{ subgroupsCreated, categoriesMatched, categoriesUnmatched }`
- [ ] Return list of unmatched category names for user feedback

### Phase 5: Add "Refresh Template" Functionality

#### Task 5.1: Create refresh-template API endpoint
- [ ] Create `/api/simulations/[id]/refresh-template/route.ts`
- [ ] Handler logic:
  1. Get currently applied template for the simulation
  2. Get template's subgroups with category names
  3. Get simulation's current subgroups
  4. For each simulation subgroup that matches a template subgroup (by `template_subgroup_id`):
     - Re-match categories by name
     - Add any newly matching categories
     - Keep existing category assignments that still match
  5. Return statistics of changes made

#### Task 5.2: Add RefreshTemplateRequest/Response types
- [ ] Add types to `types/subgroup-templates.ts`:
  ```typescript
  export type RefreshTemplateResponse = {
    success: boolean;
    message?: string;
    categoriesAdded?: number;
    categoriesKept?: number;
    unmatchedCategoryNames?: string[];
    error?: string;
    statusCode: number;
  };
  ```

### Phase 6: Update UI Components

#### Task 6.1: Update SaveAsTemplateDialog
- [ ] Modify `/components/save-as-template-dialog.tsx`
- [ ] Display count of categories that will be saved (not just subgroups)
- [ ] Show preview: "3 subgroups with 15 total categories"

#### Task 6.2: Update TemplateSelector (apply template)
- [ ] Modify `/components/template-selector.tsx`
- [ ] After applying template, show toast with results:
  - "Created 3 subgroups"
  - "Matched 12 of 15 categories"
  - "Unmatched: Category A, Category B, Category C"
- [ ] Add visual indicator for unmatched categories

#### Task 6.3: Add Refresh Template button
- [ ] Add new "Refresh" button next to template selector when a template is applied
- [ ] Button appears only when `currentTemplateId` is set
- [ ] On click, call refresh-template API
- [ ] Show confirmation dialog before refresh
- [ ] Display results in toast notification

#### Task 6.4: Create RefreshTemplateDialog component
- [ ] Create `/components/refresh-template-dialog.tsx`
- [ ] Confirmation dialog explaining:
  - "This will update category assignments based on the template"
  - "Categories matching template names will be added to subgroups"
  - "Existing categories not in template will remain unchanged"
- [ ] Show results after refresh completes

### Phase 7: Integration in simulation-budget-form.tsx

#### Task 7.1: Add refresh template state and handlers
- [ ] Add state: `isRefreshingTemplate: boolean`
- [ ] Add handler: `handleRefreshTemplate()`
- [ ] Wire up RefreshTemplateDialog component

#### Task 7.2: Update template application callback
- [ ] Modify `handleTemplateApplied()` to refresh subgroups data
- [ ] Show detailed results to user

### Phase 8: Testing and Documentation

#### Task 8.1: Test scenarios
- [ ] Test saving template with categories
- [ ] Test applying template to simulation with matching categories
- [ ] Test applying template to simulation with partial category matches
- [ ] Test applying template to simulation with no matching categories
- [ ] Test refresh template functionality
- [ ] Test edge cases (empty subgroups, duplicate category names)

#### Task 8.2: Update CLAUDE.md documentation
- [ ] Add section documenting template category relationships
- [ ] Document the refresh template feature
- [ ] Add API endpoint documentation

---

## Technical Details

### Category Matching Algorithm
When applying or refreshing a template:
```
For each template_subgroup in template:
  For each category_name in template_subgroup.categoryNames:
    Find category in simulation's available categories WHERE:
      - category.name = category_name (case-insensitive)
      - category is not already assigned to another subgroup in this simulation
    If found:
      - Add to subgroup_categories junction
      - Mark as matched
    Else:
      - Add to unmatched list
```

### Database Queries

#### Save template with categories
```sql
-- After creating template_subgroup
INSERT INTO template_subgroup_categories (template_subgroup_id, category_name, order_within_subgroup)
SELECT $1, c.name, sc.order_within_subgroup
FROM subgroup_categories sc
JOIN categories c ON c.id = sc.category_id
WHERE sc.subgroup_id = $2
ORDER BY sc.order_within_subgroup;
```

#### Get template with categories
```sql
SELECT
  ts.id,
  ts.template_id,
  ts.name,
  ts.display_order,
  COALESCE(
    json_agg(tsc.category_name ORDER BY tsc.order_within_subgroup)
    FILTER (WHERE tsc.id IS NOT NULL),
    '[]'
  ) as category_names
FROM template_subgroups ts
LEFT JOIN template_subgroup_categories tsc ON ts.id = tsc.template_subgroup_id
WHERE ts.template_id = $1
GROUP BY ts.id
ORDER BY ts.display_order;
```

#### Match categories when applying template
```sql
-- Get simulation's available categories (not in any subgroup)
SELECT c.id, c.name
FROM categories c
WHERE NOT EXISTS (
  SELECT 1 FROM subgroup_categories sc
  JOIN simulation_subgroups ss ON sc.subgroup_id = ss.id
  WHERE ss.simulation_id = $1 AND sc.category_id = c.id
);
```

---

## Files to Modify

1. **Database Migration:**
   - `app/api/migrate-template-categories/route.ts` (NEW)

2. **Type Definitions:**
   - `types/subgroup-templates.ts`

3. **Database Utilities:**
   - `lib/subgroup-template-db-utils.ts`

4. **API Routes:**
   - `app/api/simulations/[id]/save-as-template/route.ts`
   - `app/api/simulations/[id]/apply-template/route.ts`
   - `app/api/simulations/[id]/refresh-template/route.ts` (NEW)

5. **UI Components:**
   - `components/save-as-template-dialog.tsx`
   - `components/template-selector.tsx`
   - `components/refresh-template-dialog.tsx` (NEW)
   - `components/simulation-budget-form.tsx`

---

## Success Criteria

1. Saving a template preserves category names for each subgroup
2. Applying a template automatically assigns matching categories
3. Users receive clear feedback about matched/unmatched categories
4. Refresh template functionality updates category assignments
5. All existing functionality continues to work (backward compatible)
6. No breaking changes to existing templates (they just won't have categories)

---

## Estimated Effort

| Phase | Description | Complexity |
|-------|-------------|------------|
| 1 | Database Schema | Low |
| 2 | Type Definitions | Low |
| 3 | Save as Template | Medium |
| 4 | Apply Template | Medium |
| 5 | Refresh Template | Medium |
| 6 | UI Components | Medium |
| 7 | Integration | Low |
| 8 | Testing & Docs | Medium |
