-- Rollback Migration: Remove recurring payment support from budgets table
-- This script safely removes the recurrence columns and constraints
-- All existing budgets will continue to work (columns are nullable, backward compatible)

-- Drop indexes first
DROP INDEX IF EXISTS idx_budgets_recurrence_frequency;
DROP INDEX IF EXISTS idx_budgets_recurrence_start_day;

-- Drop check constraints
ALTER TABLE budgets
DROP CONSTRAINT IF EXISTS budgets_recurrence_frequency_check;

ALTER TABLE budgets
DROP CONSTRAINT IF EXISTS budgets_recurrence_start_day_check;

-- Drop columns
ALTER TABLE budgets
DROP COLUMN IF EXISTS recurrence_frequency;

ALTER TABLE budgets
DROP COLUMN IF EXISTS recurrence_start_day;

-- Verify rollback success
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'budgets'
  AND column_name IN ('recurrence_frequency', 'recurrence_start_day');
-- This query should return 0 rows after successful rollback
