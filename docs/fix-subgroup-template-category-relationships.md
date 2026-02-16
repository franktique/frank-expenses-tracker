# Fix: Subgroup Template Category Relationships

## Branch

`fix/clone-simulation` (main implementation branch for this feature)

**Note**: This plan is being implemented on the `fix/clone-simulation` branch. The feature adds category relationship preservation to subgroup templates.

## Problem Statement

When saving simulation subgroups as a template and then applying that template to a different simulation, the category relationships are not preserved. Users expect:

1. **Save as Template**: Save both subgroup structure AND which categories are in each subgroup
2. **Apply Template**: Automatically populate subgroups with the appropriate categories
3. **Refresh Template**: Update category relationships in an existing template

### Current Behavior

- Templates only save subgroup names and display order
- Category assignments are lost when saving as template
- Applied templates create empty subgroups (no categories)
- Users must manually reassign categories after applying templates

### Expected Behavior

- Templates preserve the full subgroup configuration including category assignments
- Applied templates automatically create category associations
- Users can refresh templates to update category relationships

## Implementation Plan

### Phase 1: Database Schema Updates

#### Task 1: Add `template_categories` Junction Table

- [x] Create migration script `/app/api/migrate-template-categories/route.ts`
- [x] Add `template_categories` table to store category relationships in templates
- [x] SQL Schema:
  ```sql
  CREATE TABLE template_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_subgroup_id UUID NOT NULL REFERENCES template_subgroups(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    order_within_subgroup INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(template_subgroup_id, category_id)
  );
  ```
- [ ] Create rollback script in `/scripts/`

#### Task 2: Update Type Definitions

- [x] Update `/types/subgroup-templates.ts`:
  - Add `categoryIds: (string | number)[]` to `TemplateSubgroup` type
  - Add `TemplateCategory` interface for the junction table
  - Update `CreateTemplateRequest` to include optional category IDs
- [x] Update Zod schemas for validation

### Phase 2: Template Creation Updates

#### Task 3: Update `save-as-template` API Endpoint

- [x] Modify `/app/api/simulations/[id]/save-as-template/route.ts`:
  - Fetch category relationships when saving template (lines 79-84)
  - Save category IDs to `template_categories` table for each subgroup
  - Preserve `order_within_subgroup` for each category
- [x] Update transaction to include category insertions
- [x] Add error handling for category save failures

#### Task 4: Update Template Creation UI

- [x] Modify `/components/save-as-template-dialog.tsx`:
  - Remove or update warning message (lines 142-144)
  - Update success message to indicate categories were preserved
  - Show category count per subgroup
- [x] Update `/components/simulation-budget-form.tsx` to pass category count

### Phase 3: Template Application Updates

#### Task 5: Update Template Application Logic

- [x] Modify `/lib/subgroup-template-db-utils.ts`:
  - Update `applyTemplateToSimulation()` function (lines 460-487)
  - Add logic to create category associations when applying template
  - Handle category matching by name or ID
  - Preserve category order within subgroups
- [x] Add validation for missing categories (categories in template but not in target simulation)
- [x] Add logging for category application results

#### Task 6: Handle Category Matching Scenarios

- [x] Implement category matching logic:
  - **Exact Match**: Category ID exists in target simulation
  - **Name Match**: Category name matches but ID differs (new simulation)
  - **No Match**: Category not found in target simulation (log warning, skip)
- [x] Add return value showing which categories were/weren't applied
- [x] Update UI to show application results

### Phase 4: Template Refresh Feature

#### Task 7: Add Refresh Template API Endpoint

- [x] Create `/app/api/subgroup-templates/[templateId]/refresh/route.ts`:
  - Accept source simulation ID
  - Update template subgroups with current simulation structure
  - Update category relationships for each subgroup
  - Return updated template with category counts
- [x] Add validation for template ownership

#### Task 8: Add Refresh Template UI

- [x] Create `/components/refresh-template-dialog.tsx`:
  - Show current template structure with category counts
  - Allow selecting source simulation
  - Preview changes before confirming
  - Show which categories will be added/removed
- [x] Add "Refresh" button to template management UI
- [ ] Update template list to show "Last Refreshed" timestamp

### Phase 5: Template Management Enhancements

#### Task 9: Update Template List API

- [ ] Modify `/app/api/subgroup-templates/route.ts`:
  - Include category count in template responses
  - Add `category_count` field to each subgroup
- [ ] Update `GET` endpoint to join with `template_categories` table

#### Task 10: Update Template Detail API

- [ ] Modify `/app/api/subgroup-templates/[templateId]/route.ts`:
  - Include full category details when fetching template
  - Add `categories` array to each subgroup
  - Support category filtering in template view

### Phase 6: Testing & Documentation

#### Task 11: Unit Tests

- [ ] Test template creation with categories
- [ ] Test template application with category matching
- [ ] Test template refresh functionality
- [ ] Test edge cases (missing categories, duplicate names, etc.)

#### Task 12: Integration Tests

- [ ] Test full workflow: create subgroups → save as template → apply to new simulation
- [ ] Test refresh workflow: apply template → modify simulation → refresh template
- [ ] Test concurrent template operations

#### Task 13: Update Documentation

- [ ] Update CLAUDE.md with new template functionality
- [ ] Add API documentation for new endpoints
- [ ] Update user-facing documentation if applicable

## Success Criteria

1. ✅ Templates save subgroup structure AND category assignments
2. ✅ Applied templates automatically create category associations
3. ✅ Users can refresh templates to update category relationships
4. ✅ Missing categories are handled gracefully with warnings
5. ✅ All existing functionality remains intact (backward compatible)

## Breaking Changes

None - this is a pure enhancement. Existing templates without category data will continue to work (they just won't have categories until refreshed).

## Dependencies

- Existing `simulation_subgroups` and `subgroup_categories` tables
- Existing `subgroup_templates` and `template_subgroups` tables
- Database migration for new `template_categories` table

## Rollback Plan

If issues arise:

1. Drop `template_categories` table via rollback migration
2. Revert API endpoint changes
3. Revert type definition updates
4. Existing templates will work as before (without category preservation)

## Notes

- Category matching should be flexible (prefer ID, fallback to name)
- Consider adding category name in template for better cross-simulation matching
- Refresh should be idempotent (can be run multiple times safely)
- Template application should be atomic (all-or-nothing for categories)
