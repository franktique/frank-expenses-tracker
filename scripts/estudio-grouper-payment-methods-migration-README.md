# Estudio Grouper Payment Methods Migration

This migration adds payment method filtering support to the estudio-grouper relationships, allowing users to specify which payment methods should be considered when calculating and displaying agrupador data in the dashboard.

## Overview

The migration adds a `payment_methods` column to the `estudio_groupers` table that stores an array of payment method strings. This enables granular control over which transactions are included in dashboard calculations for each agrupador within an estudio.

## Files

- `create-estudio-grouper-payment-methods-migration.sql` - Main migration script
- `rollback-estudio-grouper-payment-methods-migration.sql` - Rollback script
- `verify-estudio-grouper-payment-methods-migration.sql` - Verification script
- `test-estudio-grouper-payment-methods-migration.js` - Automated test script
- `estudio-grouper-payment-methods-migration-README.md` - This documentation

## Database Changes

### Schema Changes

1. **New Column**: `payment_methods TEXT[]` added to `estudio_groupers` table

   - Stores array of payment method strings
   - `NULL` means all payment methods are included (default behavior)
   - Valid values: `['cash', 'credit', 'debit']`

2. **Constraint**: `check_payment_methods` ensures data integrity

   - Only allows valid payment method values
   - Prevents empty arrays (use `NULL` instead)
   - Allows `NULL` for "all methods" behavior

3. **Index**: GIN index `idx_estudio_groupers_payment_methods` for efficient array queries

   - Enables fast filtering when checking payment method containment
   - Optimizes dashboard queries with payment method filters

4. **Column Comment**: Documents the purpose and usage of the new column

### Helper Functions

1. **`validate_payment_methods(TEXT[])`**: Validates payment method arrays

   - Returns `TRUE` for valid arrays or `NULL`
   - Returns `FALSE` for invalid values or empty arrays

2. **`get_payment_method_filter(INTEGER, INTEGER)`**: Gets configured payment methods

   - Takes estudio_id and grouper_id as parameters
   - Returns configured payment methods array or `NULL`

3. **`expense_matches_payment_filter(TEXT, TEXT[])`**: Checks if expense matches filter

   - Takes expense payment method and filter array
   - Returns `TRUE` if expense should be included

4. **`check_payment_methods_migration_status()`**: Reports migration status
   - Returns counts of relationships with/without payment method configuration
   - Identifies any invalid configurations

## Usage Examples

### Setting Payment Methods

```sql
-- Configure agrupador to only include cash and credit transactions
UPDATE estudio_groupers
SET payment_methods = ARRAY['cash', 'credit']
WHERE estudio_id = 1 AND grouper_id = 2;

-- Configure agrupador to include all payment methods (default)
UPDATE estudio_groupers
SET payment_methods = NULL
WHERE estudio_id = 1 AND grouper_id = 3;
```

### Querying with Payment Method Filter

```sql
-- Get expenses for an agrupador with payment method filtering
SELECT e.*
FROM expenses e
JOIN categories c ON e.category_id = c.id
JOIN groupers g ON c.grouper_id = g.id
JOIN estudio_groupers eg ON g.id = eg.grouper_id
WHERE eg.estudio_id = 1
AND eg.grouper_id = 2
AND (
  eg.payment_methods IS NULL OR
  e.payment_method = ANY(eg.payment_methods)
);
```

### Using Helper Functions

```sql
-- Validate payment methods before inserting
SELECT validate_payment_methods(ARRAY['cash', 'credit']); -- Returns TRUE
SELECT validate_payment_methods(ARRAY['invalid']);        -- Returns FALSE

-- Get configured filter for dashboard queries
SELECT get_payment_method_filter(1, 2); -- Returns configured methods or NULL

-- Check if expense matches filter
SELECT expense_matches_payment_filter('cash', ARRAY['cash', 'credit']); -- Returns TRUE
SELECT expense_matches_payment_filter('debit', ARRAY['cash', 'credit']); -- Returns FALSE
```

## Running the Migration

### Apply Migration

```bash
# Using psql
psql $DATABASE_URL_NEW -f scripts/create-estudio-grouper-payment-methods-migration.sql

# Or using the API endpoint (to be created in task 2)
curl -X POST http://localhost:3000/api/migrate-estudio-grouper-payment-methods
```

### Verify Migration

```bash
# Run verification script
psql $DATABASE_URL_NEW -f scripts/verify-estudio-grouper-payment-methods-migration.sql

# Run automated tests
node scripts/test-estudio-grouper-payment-methods-migration.js
```

### Rollback Migration

```bash
# Only if needed - this will remove all payment method configurations
psql $DATABASE_URL_NEW -f scripts/rollback-estudio-grouper-payment-methods-migration.sql
```

## Data Integrity

### Constraints

- **Valid Values**: Only `'cash'`, `'credit'`, `'debit'` are allowed
- **No Empty Arrays**: Empty arrays are not allowed (use `NULL` instead)
- **Array Containment**: All values in array must be from valid set

### Default Behavior

- **New Records**: Default to `NULL` (all payment methods included)
- **Existing Records**: Remain `NULL` (no behavior change)
- **Dashboard Queries**: Fall back to all methods when `NULL`

## Performance Considerations

### Indexing

- GIN index enables efficient array containment queries
- Index only created on non-null values to save space
- Query planner can use index for `payment_method = ANY(array)` operations

### Query Optimization

- Use `payment_methods IS NULL` check first (most common case)
- Combine with other filters to reduce result set
- Consider query plan when adding to complex dashboard queries

## Testing

The migration includes comprehensive tests:

1. **Schema Validation**: Verifies column, constraint, and index creation
2. **Constraint Testing**: Tests valid/invalid payment method values
3. **Function Testing**: Validates all helper functions work correctly
4. **Integration Testing**: Tests end-to-end functionality
5. **Performance Testing**: Ensures queries perform efficiently

Run tests with:

```bash
node scripts/test-estudio-grouper-payment-methods-migration.js
```

## Troubleshooting

### Common Issues

1. **Constraint Violation**: Check that payment methods are valid values
2. **Empty Array Error**: Use `NULL` instead of empty array for "all methods"
3. **Index Not Used**: Ensure query uses `= ANY(array)` syntax for containment
4. **Function Not Found**: Verify migration completed successfully

### Debugging Queries

```sql
-- Check current configuration
SELECT eg.*, g.name as grouper_name
FROM estudio_groupers eg
JOIN groupers g ON eg.grouper_id = g.id
WHERE eg.estudio_id = 1;

-- Check migration status
SELECT * FROM check_payment_methods_migration_status();

-- Test payment method filtering
SELECT expense_matches_payment_filter('cash', ARRAY['cash', 'credit']);
```
