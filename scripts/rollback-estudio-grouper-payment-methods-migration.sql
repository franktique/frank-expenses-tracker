-- Rollback script for estudio grouper payment methods migration
-- This script removes the payment_methods column and related functions from estudio_groupers table

-- Step 1: Drop helper functions
DROP FUNCTION IF EXISTS validate_payment_methods(TEXT[]);
DROP FUNCTION IF EXISTS get_payment_method_filter(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS expense_matches_payment_filter(TEXT, TEXT[]);
DROP FUNCTION IF EXISTS check_payment_methods_migration_status();

-- Step 2: Drop the GIN index
DROP INDEX IF EXISTS idx_estudio_groupers_payment_methods;

-- Step 3: Drop the constraint
ALTER TABLE estudio_groupers 
DROP CONSTRAINT IF EXISTS check_payment_methods;

-- Step 4: Drop the payment_methods column
ALTER TABLE estudio_groupers 
DROP COLUMN IF EXISTS payment_methods;

-- Log rollback completion
DO $
BEGIN
  RAISE NOTICE 'Estudio Grouper Payment Methods Migration Rollback Complete';
  RAISE NOTICE 'Removed payment_methods column, constraints, indexes, and helper functions';
END $;