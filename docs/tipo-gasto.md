# Plan: Add "Tipo Gasto" Column to Budget Categories

**Branch**: `tipo-gasto`
**Date**: October 31, 2025
**Status**: ✅ Completed (Updated to include E - Eventual)

## Overview
Add a new `tipo_gasto` column to the categories table that classifies expenses as:
- **F** (Fijo) - Fixed expenses
- **V** (Variable) - Variable expenses
- **SF** (Semi Fijo) - Semi-fixed expenses
- **E** (Eventual) - Eventual/one-time expenses

This will allow better categorization and analysis of spending patterns.

## Requirements
1. Add `tipo_gasto` column to the categories table
2. Update Category TypeScript interface and Zod schemas
3. Create database migration endpoint
4. Update API endpoints to handle the new field
5. Update UI components to display and edit tipo_gasto
6. Ensure backward compatibility with existing data
7. Add tests for new functionality

## Implementation Plan

### Phase 1: Database Schema Changes
- [x] Create migration script to add `tipo_gasto` column to categories table
  - Column type: VARCHAR(2)
  - Default value: 'F' (Fijo) - Fixed expenses
  - All existing categories set to 'F' (Fijo) automatically
  - Includes check constraint for valid values
- [x] Create API endpoint `/api/migrate-tipo-gasto` for schema migration
- [x] Create rollback script in `/scripts/` for safety

**Files created**:
- `/scripts/migrations/add-tipo-gasto.ts` ✅
- `/scripts/rollbacks/remove-tipo-gasto.ts` ✅
- `/app/api/migrate-tipo-gasto/route.ts` ✅

### Phase 2: TypeScript Types and Validation
- [x] Update `Category` interface in `/types/funds.ts`
  - Added `tipo_gasto?: TipoGasto`
  - Created `TipoGasto` type from TIPO_GASTO_VALUES
- [x] Add validation schema for tipo_gasto values
  - Created `TIPO_GASTO_VALUES` constant with F, V, SF
  - Created `TIPO_GASTO_LABELS` for display names
  - Created `TIPO_GASTO_ERROR_MESSAGES` for validation
- [x] Updated `CreateCategorySchema` to include tipo_gasto
- [x] Updated `UpdateCategorySchema` to include tipo_gasto
- [x] Created error messages for invalid tipo_gasto values

**Files modified**:
- `/types/funds.ts` ✅

### Phase 3: Backend API Updates
- [x] Updated `GET /api/categories` endpoint
  - Automatically returns tipo_gasto with category data
- [x] Updated `POST /api/categories` endpoint
  - Accepts tipo_gasto in request body
  - Validates before insert via schema
  - Inserts into categories table
- [x] Updated `PUT /api/categories/[id]` endpoint
  - Accepts tipo_gasto in request body
  - Handles all combinations of updates with tipo_gasto
  - Updates categories table with proper validation
- [x] GET /api/categories/[id] endpoint
  - Returns tipo_gasto in response

**Files modified**:
- `/app/api/categories/route.ts` ✅
- `/app/api/categories/[id]/route.ts` ✅

### Phase 4: Frontend Components
- [x] Updated `CategoriesView` component
  - Added tipo_gasto column to the table
  - Displays as badge with color coding (F=blue, V=green, SF=orange)
- [x] Updated category creation dialog
  - Added TipoGastoSelect component in form
  - Properly manages state
- [x] Updated category edit dialog
  - Added TipoGastoSelect field to edit form
  - Shows current value
  - Updates when edited
- [x] Created helper components for tipo_gasto display
  - `TipoGastoBadge` - Shows tipo_gasto with appropriate styling
  - `TipoGastoSelect` - Reusable form select for tipo_gasto

**Files created**:
- `/components/tipo-gasto-badge.tsx` ✅
- `/components/tipo-gasto-select.tsx` ✅

**Files modified**:
- `/components/categories-view.tsx` ✅

### Phase 5: Testing
- [x] Write unit tests for tipo_gasto validation
  - Tests for all three expense types
  - Tests for schema validation
  - Tests for error cases
  - Tests for integration scenarios

**Files created**:
- `/app/api/categories/__tests__/tipo-gasto.test.ts` ✅

### Phase 6: Documentation and Polish
- [x] Updated CLAUDE.md with tipo_gasto information
  - Added to Database Commands section
  - Created "Working with Tipo Gasto" section
  - Included implementation details
  - Added usage examples
- [x] Added code comments to new files
- [x] Backward compatibility maintained (optional field with NULL default)
- [x] All type safety with Zod schemas

## Technical Details

### Database Schema Addition
```sql
ALTER TABLE categories
ADD COLUMN tipo_gasto VARCHAR(2) DEFAULT 'F';

-- Update any existing NULL values to 'F' (Fijo)
UPDATE categories
SET tipo_gasto = 'F'
WHERE tipo_gasto IS NULL;

-- Add check constraint
ALTER TABLE categories
ADD CONSTRAINT check_valid_tipo_gasto
CHECK (tipo_gasto IN ('F', 'V', 'SF'));
```

**Migration Behavior**:
- New column is added with DEFAULT value 'F' (Fijo)
- All existing categories are automatically set to 'F' (Fijo)
- This ensures backward compatibility - existing categories are treated as fixed expenses
- Users can update categories to 'V' (Variable) or 'SF' (Semi Fijo) as needed

### TypeScript Type
```typescript
export interface Category {
  id: string;
  name: string;
  fund_id?: string;
  fund_name?: string;
  associated_funds?: Fund[];
  tipo_gasto?: 'F' | 'V' | 'SF' | 'E';  // NEW FIELD
}

export const TIPO_GASTO_VALUES = {
  FIJO: 'F',
  VARIABLE: 'V',
  SEMI_FIJO: 'SF',
  EVENTUAL: 'E',
} as const;

export const TIPO_GASTO_LABELS = {
  F: 'Fijo',
  V: 'Variable',
  SF: 'Semi Fijo',
  E: 'Eventual',
} as const;
```

### UI Display
- **F (Fijo)**: Blue badge - Default for all categories
- **V (Variable)**: Green badge
- **SF (Semi Fijo)**: Orange/amber badge
- **E (Eventual)**: Red badge

## Migration Strategy
1. Add column with DEFAULT value 'F' (Fijo) for all new categories
2. Automatically set all existing categories to 'F' (Fijo) during migration
3. This ensures backward compatibility - treats existing categories as fixed expenses
4. Users can update individual categories to 'V' (Variable) or 'SF' (Semi Fijo) as needed
5. Field remains optional in forms to support flexibility
6. Migration endpoint `/api/migrate-tipo-gasto` handles the complete setup

## Additional Migrations

### Constraint Update (for E - Eventual type)
If the migration was already run before adding "E" (Eventual) type, you need to update the constraint:
- **Endpoint**: `/api/migrate-tipo-gasto-constraint`
- **Purpose**: Drops old constraint and creates new one that includes E
- **Safe**: Idempotent - won't fail if constraint doesn't exist or already includes E
- **Migration Script**: `/scripts/migrations/update-tipo-gasto-constraint.ts`

## Rollback Plan
If issues arise:
1. Use rollback script to remove tipo_gasto column
2. Reset to previous database state
3. Revert code changes

## Testing Checklist
- [ ] Database migration works correctly
- [ ] API returns tipo_gasto for existing categories
- [ ] Can create new categories with tipo_gasto
- [ ] Can update existing categories with tipo_gasto
- [ ] UI displays tipo_gasto correctly
- [ ] Form validation works
- [ ] Backward compatibility maintained
- [ ] All existing tests still pass
- [ ] No type errors in build

## Estimated Effort
- Database changes: 1-2 hours
- API updates: 1-2 hours
- UI implementation: 2-3 hours
- Testing: 2-3 hours
- Documentation: 1 hour
- **Total**: 7-11 hours

## Notes
- Keep changes modular and testable
- Follow existing code patterns in the project
- Ensure consistency with fund system architecture
- Consider future analytics based on tipo_gasto
- May want to add aggregations by tipo_gasto in dashboard later
