# Category-Fund Relationships Migration

This migration implements a many-to-many relationship between categories and funds, replacing the current one-to-one relationship while maintaining backward compatibility.

## Overview

The migration creates a new `category_fund_relationships` table that allows categories to be associated with multiple funds, enabling more flexible expense management.

## Files Created

### Migration Scripts

- `create-category-fund-relationships-migration.sql` - Complete SQL migration script
- `rollback-category-fund-relationships-migration.sql` - Rollback script
- `test-category-fund-relationships-migration.js` - Validation test script

### API Endpoints

- `app/api/migrate-category-fund-relationships/route.ts` - Migration API endpoint

## Database Changes

### New Table: `category_fund_relationships`

```sql
CREATE TABLE category_fund_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, fund_id)
);
```

### Indexes Created

- `idx_category_fund_relationships_category_id` - For efficient category lookups
- `idx_category_fund_relationships_fund_id` - For efficient fund lookups

### Database Functions

#### `validate_category_fund_relationship_deletion(category_id, fund_id)`

- **Purpose**: Validates if a category-fund relationship can be safely deleted
- **Returns**: `has_expenses`, `expense_count`, `can_delete`
- **Usage**: Check before removing relationships to prevent data integrity issues

#### `get_category_funds(category_id)`

- **Purpose**: Retrieves all funds associated with a specific category
- **Returns**: `fund_id`, `fund_name`, `fund_description`
- **Usage**: Get available funds for expense form filtering

#### `category_has_fund_restrictions(category_id)`

- **Purpose**: Checks if a category has specific fund relationships defined
- **Returns**: `BOOLEAN`
- **Usage**: Determine if category should show all funds or only specific ones

## Migration Process

### Data Migration

1. **Preserves existing relationships**: All current `categories.fund_id` relationships are migrated to the new table
2. **Maintains backward compatibility**: The original `fund_id` column remains in the categories table
3. **Handles duplicates**: Uses `ON CONFLICT DO NOTHING` to prevent duplicate relationships

### Validation

- Referential integrity enforced through foreign key constraints
- Unique constraint prevents duplicate category-fund relationships
- Cascade deletes ensure cleanup when categories or funds are removed

## Running the Migration

### Option 1: API Endpoint (Recommended)

```bash
# Start the development server
npm run dev

# Run the migration
curl -X POST http://localhost:3000/api/migrate-category-fund-relationships

# Expected response:
{
  "success": true,
  "message": "Category fund relationships migration completed successfully",
  "migratedRelationships": <number>
}
```

### Option 2: Direct SQL Execution

```bash
# Connect to your database and run:
psql $DATABASE_URL_NEW -f scripts/create-category-fund-relationships-migration.sql
```

## Rollback Process

### Option 1: API Endpoint

```bash
curl -X DELETE http://localhost:3000/api/migrate-category-fund-relationships
```

### Option 2: Direct SQL Execution

```bash
psql $DATABASE_URL_NEW -f scripts/rollback-category-fund-relationships-migration.sql
```

## Testing

Run the validation test to ensure migration integrity:

```bash
node scripts/test-category-fund-relationships-migration.js
```

## Requirements Satisfied

This migration addresses the following requirements from the spec:

- **Requirement 1.1**: ✅ Multiple fund associations per category
- **Requirement 1.2**: ✅ Database storage of relationships
- **Requirement 4.1**: ✅ Data integrity validation
- **Requirement 4.2**: ✅ Relationship deletion validation

## Next Steps

After running this migration, you can proceed with:

1. Implementing the API endpoints for managing relationships
2. Updating the frontend components to handle multiple funds
3. Modifying the expense form to use dynamic fund filtering

## Troubleshooting

### Common Issues

1. **Foreign key constraint errors**: Ensure the `funds` table exists and has been properly migrated
2. **Permission errors**: Verify database user has CREATE TABLE and CREATE FUNCTION permissions
3. **Connection errors**: Check `DATABASE_URL_NEW` environment variable

### Verification Queries

```sql
-- Check if table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'category_fund_relationships';

-- Check migrated relationships
SELECT COUNT(*) FROM category_fund_relationships;

-- Verify functions exist
SELECT routine_name FROM information_schema.routines WHERE routine_name LIKE '%category%fund%';
```

## Safety Notes

- ⚠️ **Backup your database** before running the migration
- ⚠️ The migration is **atomic** - it will rollback completely if any step fails
- ⚠️ The original `categories.fund_id` column is **preserved** for backward compatibility
- ✅ The migration can be **safely re-run** - it uses `IF NOT EXISTS` and `ON CONFLICT` clauses
