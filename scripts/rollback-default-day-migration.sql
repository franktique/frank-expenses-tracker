-- Rollback: Remove default_day from categories and default_date from budgets
-- This script reverses the default_day migration

-- Drop indexes
DROP INDEX IF EXISTS idx_categories_default_day;
DROP INDEX IF EXISTS idx_budgets_default_date;

-- Drop constraint and column from categories
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_default_day_check;

ALTER TABLE categories
DROP COLUMN IF EXISTS default_day;

-- Drop column from budgets
ALTER TABLE budgets
DROP COLUMN IF EXISTS default_date;

-- Log rollback completion
SELECT 'Rollback completed: Removed default_day from categories and default_date from budgets' as rollback_status;
