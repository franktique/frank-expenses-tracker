# Category-Fund Backward Compatibility Implementation

This document describes the backward compatibility implementation for the category-fund relationships feature, ensuring that existing single fund relationships continue to work while supporting the new multi-fund system.

## Overview

The backward compatibility implementation ensures that:

1. **Existing single fund relationships continue to work** - Categories with `fund_id` still function normally
2. **Migration utility converts existing data** - Automated migration from single to multi-fund relationships
3. **Fallback logic handles categories without specific relationships** - Categories without fund restrictions accept expenses from any fund

## Implementation Components

### 1. Migration Utility (`lib/category-fund-migration.ts`)

#### Key Functions

- **`checkMigrationStatus()`** - Checks current migration state
- **`migrateCategoryFundRelationships()`** - Migrates existing data to new format
- **`ensureBackwardCompatibility()`** - Ensures all categories have proper fallback behavior
- **`convertCategoryToMultiFund()`** - Converts individual categories to multi-fund system

#### Migration Process

```typescript
// 1. Check if migration is needed
const status = await checkMigrationStatus();

// 2. Run migration
const result = await migrateCategoryFundRelationships();

// 3. Ensure backward compatibility
const compatibility = await ensureBackwardCompatibility();
```

### 2. Fallback Logic (`lib/category-fund-fallback.ts`)

#### CategoryFundFallback Class

Provides comprehensive fallback logic for categories without specific fund relationships:

```typescript
// Get available funds for a category (with fallback)
const funds = CategoryFundFallback.getAvailableFundsForCategory(
  categoryId,
  categories,
  allFunds
);

// Get default fund with intelligent selection
const defaultFund = CategoryFundFallback.getDefaultFundForCategory(
  categoryId,
  categories,
  allFunds,
  currentFilterFund,
  fundFilter
);

// Check if fund is valid for category
const isValid = CategoryFundFallback.isFundValidForCategory(
  fundId,
  categoryId,
  categories,
  allFunds
);
```

#### Fund Selection Priority

1. **Associated Funds** (new system) - Use `associated_funds` array
2. **Legacy Fund ID** (backward compatibility) - Use `fund_id` field
3. **All Funds** (fallback) - If no restrictions, allow any fund

### 3. Enhanced API Endpoints

#### Migration API (`/api/migrate-category-fund-relationships`)

- **GET** - Check migration status
- **POST** - Execute migration with backward compatibility
- **DELETE** - Rollback migration (for testing)

#### Category Migration API (`/api/categories/[id]/migrate-funds`)

- **POST** - Convert individual category to multi-fund system

#### Enhanced Category APIs

Both `/api/categories` and `/api/categories/[id]` support:

- **Legacy format**: `{ fund_id: "uuid" }`
- **New format**: `{ fund_ids: ["uuid1", "uuid2"] }`
- **Mixed format**: Both fields for transition period

### 4. Budget Context Integration

The budget context (`context/budget-context.tsx`) uses the fallback logic:

```typescript
// Enhanced functions using CategoryFundFallback
const getAvailableFundsForCategory = (categoryId: string): Fund[] => {
  return CategoryFundFallback.getAvailableFundsForCategory(
    categoryId,
    categories,
    funds
  );
};

const getDefaultFundForCategory = (
  categoryId: string,
  currentFilterFund?: Fund | null
): Fund | null => {
  return CategoryFundFallback.getDefaultFundForCategory(
    categoryId,
    categories,
    funds,
    currentFilterFund,
    fundFilter
  );
};
```

## Database Schema Compatibility

### Legacy Support

The original `categories.fund_id` field is preserved for backward compatibility:

```sql
-- Original schema (preserved)
CREATE TABLE categories (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  fund_id UUID REFERENCES funds(id), -- Kept for backward compatibility
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### New Relationship Table

```sql
-- New many-to-many relationship table
CREATE TABLE category_fund_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, fund_id)
);
```

### Database Functions

```sql
-- Check if category has fund restrictions
CREATE OR REPLACE FUNCTION category_has_fund_restrictions(p_category_id UUID)
RETURNS BOOLEAN;

-- Get available funds for a category
CREATE OR REPLACE FUNCTION get_category_funds(p_category_id UUID)
RETURNS TABLE (fund_id UUID, fund_name VARCHAR(255), fund_description TEXT);

-- Validate relationship deletion
CREATE OR REPLACE FUNCTION validate_category_fund_relationship_deletion(
  p_category_id UUID,
  p_fund_id UUID
) RETURNS TABLE (has_expenses BOOLEAN, expense_count INTEGER, can_delete BOOLEAN);
```

## API Response Format

### Categories API Response

```json
{
  "id": "category-uuid",
  "name": "Food",
  "fund_id": "fund-uuid", // Legacy field (preserved)
  "fund_name": "Disponible", // Legacy field (preserved)
  "associated_funds": [
    // New field
    {
      "id": "fund-uuid",
      "name": "Disponible",
      "description": "Default fund",
      "current_balance": 1000
    }
  ]
}
```

### Migration Status Response

```json
{
  "success": true,
  "status": {
    "isTableCreated": true,
    "hasExistingRelationships": true,
    "categoriesWithoutRelationships": 0,
    "categoriesWithLegacyFundId": 5,
    "totalCategories": 10
  }
}
```

## Frontend Integration

### ExpensesView Component

The expenses view automatically handles fund selection based on category:

```typescript
// Get available funds for selected category
const availableFunds = getAvailableFundsForCategory(
  selectedCategoryId,
  categories,
  funds
);

// Get default fund with priority logic
const defaultFund = getDefaultFundForCategory(
  selectedCategoryId,
  categories,
  funds,
  currentFilterFund
);

// Validate fund selection
const isValid = isFundValidForCategory(
  selectedFundId,
  selectedCategoryId,
  categories,
  funds
);
```

### CategoriesView Component

The categories view supports both single and multi-fund selection:

```typescript
// Legacy single fund selection (still works)
<FundFilter
  selectedFund={singleFund}
  onFundChange={setSingleFund}
/>

// New multi-fund selection
<MultiFundSelector
  selectedFunds={multipleFunds}
  onFundsChange={setMultipleFunds}
/>
```

## Testing

### Unit Tests

- **`lib/__tests__/category-fund-backward-compatibility.test.ts`** - Comprehensive fallback logic tests
- **`lib/__tests__/category-fund-validation.test.ts`** - Validation logic tests

### Integration Tests

- **`scripts/test-backward-compatibility.js`** - End-to-end compatibility testing
- **`scripts/test-category-fund-relationships-migration.js`** - Migration testing

### Test Coverage

- ✅ Legacy single fund relationships
- ✅ New multi-fund relationships
- ✅ Mixed legacy/new scenarios
- ✅ Categories without fund restrictions
- ✅ Migration data integrity
- ✅ API backward compatibility
- ✅ Frontend component compatibility

## Migration Guide

### Step 1: Check Current Status

```bash
curl -X GET http://localhost:3000/api/migrate-category-fund-relationships
```

### Step 2: Run Migration

```bash
curl -X POST http://localhost:3000/api/migrate-category-fund-relationships
```

### Step 3: Verify Results

```bash
# Test backward compatibility
node scripts/test-backward-compatibility.js

# Run unit tests
npm test category-fund-backward-compatibility
```

### Step 4: Convert Individual Categories (Optional)

```bash
curl -X POST http://localhost:3000/api/categories/[category-id]/migrate-funds \
  -H "Content-Type: application/json" \
  -d '{"fund_ids": ["fund1", "fund2"]}'
```

## Troubleshooting

### Common Issues

1. **Categories without fund relationships**

   - **Symptom**: Categories show "accepts all funds"
   - **Solution**: Run `ensureBackwardCompatibility()` to assign default fund

2. **Conflicting fund relationships**

   - **Symptom**: `fund_id` doesn't match `associated_funds`
   - **Solution**: Use migration utility to sync relationships

3. **Missing default fund**
   - **Symptom**: No fund preselected in expense form
   - **Solution**: Ensure "Disponible" fund exists or create default fund

### Validation Queries

```sql
-- Check categories without any fund relationships
SELECT c.id, c.name
FROM categories c
WHERE c.fund_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM category_fund_relationships cfr
    WHERE cfr.category_id = c.id
  );

-- Check conflicting relationships
SELECT c.id, c.name, c.fund_id,
       array_agg(cfr.fund_id) as associated_fund_ids
FROM categories c
LEFT JOIN category_fund_relationships cfr ON c.id = cfr.category_id
WHERE c.fund_id IS NOT NULL
GROUP BY c.id, c.name, c.fund_id
HAVING c.fund_id != ALL(array_agg(cfr.fund_id));
```

## Performance Considerations

### Caching

- Category-fund relationships are cached in `lib/category-fund-cache.ts`
- Budget context maintains local cache for frequently accessed data
- API responses include all necessary data to minimize round trips

### Database Optimization

- Indexes on `category_fund_relationships` table for efficient lookups
- Database functions for complex queries
- Batch operations for bulk updates

### Frontend Optimization

- Memoized fund selection logic
- Efficient filtering algorithms
- Minimal re-renders on fund changes

## Future Considerations

### Deprecation Path

1. **Phase 1** (Current): Both systems work in parallel
2. **Phase 2** (Future): Encourage migration to multi-fund system
3. **Phase 3** (Future): Deprecate legacy `fund_id` field
4. **Phase 4** (Future): Remove legacy fields and code

### Migration Monitoring

- Track usage of legacy vs new API endpoints
- Monitor categories still using single fund relationships
- Provide migration recommendations in admin interface

## Requirements Satisfied

This implementation satisfies the following requirements from the spec:

- **Requirement 1.4**: ✅ Backward compatibility maintained
- **Requirement 4.4**: ✅ Data integrity preserved during migration
- **Requirement 5.4**: ✅ Fallback logic for unrestricted categories

## Conclusion

The backward compatibility implementation ensures a smooth transition from single to multi-fund relationships while maintaining full functionality for existing users. The comprehensive fallback logic and migration utilities provide a robust foundation for the enhanced category-fund system.
