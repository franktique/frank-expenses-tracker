-- Migration: Add default_day to categories and default_date to budgets
-- This migration adds support for default payment days on categories
-- and syncs them with budget dates across all periods

-- Add default_day column to categories table
-- Allows specifying a preferred day of month (1-31) for category expenses
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS default_day INTEGER;

-- Add constraint to ensure default_day is between 1-31 or NULL
ALTER TABLE categories
ADD CONSTRAINT categories_default_day_check
  CHECK(default_day IS NULL OR (default_day >= 1 AND default_day <= 31));

-- Add default_date column to budgets table
-- Stores the calculated date for a budget based on category's default_day
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS default_date DATE;

-- Create index on categories.default_day for efficient filtering
CREATE INDEX IF NOT EXISTS idx_categories_default_day
  ON categories(default_day);

-- Create index on budgets.default_date for efficient filtering
CREATE INDEX IF NOT EXISTS idx_budgets_default_date
  ON budgets(default_date);

-- Log migration completion
SELECT 'Migration completed: Added default_day to categories and default_date to budgets' as migration_status;
