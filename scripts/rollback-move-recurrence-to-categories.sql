-- Rollback Migration: Move recurrence field back from categories to budgets
-- This script reverses the migration that moved recurrence settings to categories

-- Step 1: Add recurrence column back to budgets table
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20);

-- Step 2: Add constraint back to budgets
ALTER TABLE budgets
ADD CONSTRAINT budgets_recurrence_frequency_check
  CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('weekly', 'bi-weekly'));

-- Step 3: Migrate data back from categories to budgets (if needed)
UPDATE budgets b
SET
  recurrence_frequency = c.recurrence_frequency
FROM categories c
WHERE b.category_id = c.id
  AND c.recurrence_frequency IS NOT NULL;

-- Step 4: Create index back on budgets
CREATE INDEX IF NOT EXISTS idx_budgets_recurrence_frequency
  ON budgets(recurrence_frequency)
  WHERE recurrence_frequency IS NOT NULL;

-- Step 5: Drop recurrence column from categories
ALTER TABLE categories
DROP COLUMN IF EXISTS recurrence_frequency;

-- Step 6: Drop index from categories
DROP INDEX IF EXISTS idx_categories_recurrence_frequency;

-- Step 7: Drop constraint from categories
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_recurrence_frequency_check;

-- Verify rollback success
SELECT
  column_name,
  data_type,
  table_name
FROM information_schema.columns
WHERE table_name IN ('budgets', 'categories')
  AND column_name = 'recurrence_frequency'
ORDER BY table_name, column_name;
