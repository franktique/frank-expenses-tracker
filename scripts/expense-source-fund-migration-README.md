# Expense Source Fund Migration

This directory contains scripts and API endpoints for migrating the expenses table to support source fund tracking.

## Overview

The expense source fund migration adds a `source_fund_id` column to the expenses table and populates it with appropriate fund data based on category relationships. This enables tracking both where money comes from (source fund) and where it goes (destination fund) for each expense.

## Migration Components

### 1. SQL Migration Scripts

#### `create-expense-source-fund-migration.sql`

- Adds `source_fund_id` column to expenses table
- Creates performance index on the new column
- Migrates existing expense data using category-fund relationships
- Creates validation and helper functions
- Logs migration results

#### `rollback-expense-source-fund-migration.sql`

- Removes the `source_fund_id` column
- Drops related indexes and functions
- Provides clean rollback capability

#### `verify-expense-source-fund-migration.sql`

- Comprehensive verification of migration results
- Checks table structure, indexes, and functions
- Validates data integrity and migration completeness
- Identifies potential issues

### 2. API Endpoint

#### `POST /api/migrate-expense-source-funds`

- Runs the complete migration process
- Returns detailed migration results
- Includes error handling and logging

#### `GET /api/migrate-expense-source-funds`

- Checks migration status without running migration
- Returns current state and readiness information

### 3. Test Script

#### `test-expense-source-fund-migration.js`

- Automated testing of migration process
- Validates migration results
- Tests post-migration functionality

## Migration Logic

The migration follows this priority order for determining source funds:

1. **Category-Fund Relationships** (preferred): Uses the many-to-many relationship table

   - Takes the first available fund if multiple relationships exist
   - Ordered by creation date (oldest first)

2. **Legacy Fund Assignment** (fallback): Uses the direct category.fund_id field

   - Maintains backward compatibility with existing data

3. **No Assignment**: Expenses without valid fund relationships remain unmigrated
   - These are logged and reported for manual review

## Usage Instructions

### Option 1: Using the API Endpoint (Recommended)

1. **Check Migration Status**:

   ```bash
   curl -X GET http://localhost:3000/api/migrate-expense-source-funds
   ```

2. **Run Migration**:
   ```bash
   curl -X POST http://localhost:3000/api/migrate-expense-source-funds
   ```

### Option 2: Using SQL Scripts Directly

1. **Run Migration**:

   ```sql
   \i scripts/create-expense-source-fund-migration.sql
   ```

2. **Verify Results**:

   ```sql
   \i scripts/verify-expense-source-fund-migration.sql
   ```

3. **Rollback if Needed**:
   ```sql
   \i scripts/rollback-expense-source-fund-migration.sql
   ```

### Option 3: Using Test Script

```bash
node scripts/test-expense-source-fund-migration.js
```

## Migration Results

After successful migration, you should see:

- ✅ `source_fund_id` column added to expenses table
- ✅ Performance index created on `source_fund_id`
- ✅ Validation functions created
- ✅ Existing expenses populated with source fund data
- ✅ Migration status functions available

## Validation Functions

The migration creates several helper functions:

### `validate_expense_source_fund(category_id, source_fund_id)`

Validates that a source fund is valid for a given category.

### `get_category_source_funds(category_id)`

Returns all available source funds for a category.

### `check_expense_source_fund_migration_status()`

Returns current migration status and statistics.

## Expected Results

### Successful Migration

- All expenses with valid category-fund relationships get source_fund_id populated
- Migration status shows `migration_complete = true`
- No data loss or corruption

### Partial Migration

- Some expenses may remain unmigrated if their categories lack fund relationships
- These are logged and can be handled manually
- Migration status shows remaining unmigrated count

## Troubleshooting

### Common Issues

1. **Expenses Not Migrated**

   - Check if categories have fund relationships
   - Verify category_fund_relationships table exists
   - Check for orphaned categories

2. **Migration Fails**

   - Ensure database has proper permissions
   - Check for foreign key constraint violations
   - Verify funds table integrity

3. **Performance Issues**
   - Migration creates indexes automatically
   - Large datasets may take time to process
   - Monitor database performance during migration

### Recovery

If migration fails or produces unexpected results:

1. **Check Migration Status**:

   ```sql
   SELECT * FROM check_expense_source_fund_migration_status();
   ```

2. **Review Unmigrated Expenses**:

   ```sql
   SELECT e.*, c.name as category_name
   FROM expenses e
   JOIN categories c ON e.category_id = c.id
   WHERE e.source_fund_id IS NULL;
   ```

3. **Rollback if Necessary**:
   ```sql
   \i scripts/rollback-expense-source-fund-migration.sql
   ```

## Post-Migration Steps

After successful migration:

1. **Update API Endpoints**: Modify expense creation/update endpoints to handle source_fund_id
2. **Update Frontend**: Add source fund selection to expense forms
3. **Update Validation**: Ensure source fund validation is enforced
4. **Update Fund Balance Calculations**: Account for source fund in balance calculations

## Data Integrity

The migration maintains data integrity by:

- Using foreign key constraints for source_fund_id
- Preserving all existing expense data
- Creating validation functions for future operations
- Providing rollback capability
- Comprehensive verification and reporting

## Performance Considerations

- Index created on source_fund_id for query performance
- Migration processes expenses in batches for large datasets
- Validation functions optimized for frequent use
- Minimal impact on existing queries

## Security

- Migration requires database write permissions
- API endpoint should be protected in production
- Rollback capability prevents permanent data loss
- Comprehensive logging for audit trails
