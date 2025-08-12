-- Rollback script for expense source fund migration
-- This script removes the source_fund_id column and related functions

-- Step 1: Drop validation functions
DROP FUNCTION IF EXISTS validate_expense_source_fund(UUID, UUID);
DROP FUNCTION IF EXISTS get_category_source_funds(UUID);
DROP FUNCTION IF EXISTS check_expense_source_fund_migration_status();

-- Step 2: Drop index
DROP INDEX IF EXISTS idx_expenses_source_fund_id;

-- Step 3: Remove source_fund_id column from expenses table
ALTER TABLE expenses DROP COLUMN IF EXISTS source_fund_id;

-- Step 4: Log rollback completion
DO $$
BEGIN
  RAISE NOTICE 'Expense source fund migration rollback completed successfully.';
  RAISE NOTICE 'The source_fund_id column and related functions have been removed.';
END $$;