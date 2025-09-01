# Credit Cards Migration

This migration adds credit card management functionality to the budget tracker application.

## Overview

The migration creates a new `credit_cards` table and adds an optional `credit_card_id` foreign key column to the existing `expenses` table, allowing users to associate expenses with specific credit cards.

## Database Changes

### New Tables

#### `credit_cards`

- `id` (UUID, Primary Key) - Unique identifier for each credit card
- `bank_name` (VARCHAR(255), NOT NULL) - Name of the bank or financial institution
- `franchise` (VARCHAR(50), NOT NULL) - Card network (visa, mastercard, american_express, discover, other)
- `last_four_digits` (CHAR(4), NOT NULL) - Last four digits of the card number
- `created_at` (TIMESTAMP WITH TIME ZONE) - Creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE) - Last update timestamp

**Constraints:**

- `franchise` must be one of: 'visa', 'mastercard', 'american_express', 'discover', 'other'
- `last_four_digits` must be exactly 4 numeric characters
- Unique constraint on combination of `bank_name`, `franchise`, and `last_four_digits`

### Modified Tables

#### `expenses`

- Added `credit_card_id` (UUID, NULLABLE) - Foreign key reference to `credit_cards.id`
- Foreign key constraint with `ON DELETE SET NULL` to preserve expenses when credit cards are deleted

### Indexes

- `idx_expenses_credit_card_id` - Performance index for credit card lookups in expenses
- `idx_credit_cards_bank_franchise` - Composite index for bank and franchise filtering
- `idx_credit_cards_created_at` - Index for chronological sorting

### Triggers

- `trigger_update_credit_card_updated_at` - Automatically updates `updated_at` timestamp on record modifications

## API Endpoints

### Migration Management

- `GET /api/migrate-credit-cards` - Check migration status
- `POST /api/migrate-credit-cards` - Execute migration
- `DELETE /api/migrate-credit-cards` - Rollback migration

## Files

### Migration Scripts

- `scripts/create-credit-cards-migration.sql` - Forward migration SQL
- `scripts/rollback-credit-cards-migration.sql` - Rollback migration SQL

### API Implementation

- `app/api/migrate-credit-cards/route.ts` - Migration API endpoint

## Usage

### Running the Migration

1. **Check Status:**

   ```bash
   curl -X GET http://localhost:3000/api/migrate-credit-cards
   ```

2. **Execute Migration:**

   ```bash
   curl -X POST http://localhost:3000/api/migrate-credit-cards
   ```

3. **Rollback (if needed):**
   ```bash
   curl -X DELETE http://localhost:3000/api/migrate-credit-cards
   ```

### Manual SQL Execution

Alternatively, you can run the SQL scripts directly:

```sql
-- Execute migration
\i scripts/create-credit-cards-migration.sql

-- Rollback migration
\i scripts/rollback-credit-cards-migration.sql
```

## Backward Compatibility

- All existing expenses remain unchanged and functional
- The `credit_card_id` column is nullable, so existing expenses have no credit card association
- Existing expense functionality continues to work without modification
- Credit card associations are optional and don't affect existing workflows

## Data Integrity

- Foreign key constraints ensure referential integrity
- Unique constraints prevent duplicate credit card entries
- Check constraints validate data format (franchise types, digit format)
- Cascade rules preserve data consistency when credit cards are deleted

## Performance Considerations

- Indexes are created to optimize common query patterns
- The migration uses transactions to ensure atomicity
- Minimal impact on existing expense queries due to nullable foreign key

## Security Notes

- Only the last four digits of credit card numbers are stored
- No sensitive information (full card numbers, CVV, expiration dates) is stored
- Input validation prevents SQL injection through check constraints
- UUID-based identifiers prevent enumeration attacks
