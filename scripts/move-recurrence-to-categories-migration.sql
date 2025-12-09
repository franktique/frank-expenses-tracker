-- Migration: Move recurrence field from budgets to categories
-- This migration moves recurrence_frequency from budgets to categories
-- Categories define how they are paid (weekly/bi-weekly), and budgets inherit this behavior
-- The existing default_day field is reused to specify the first payment day

-- Step 1: Add recurrence column to categories table
ALTER TABLE categories
ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20);

ALTER TABLE categories
ADD CONSTRAINT categories_recurrence_frequency_check
  CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('weekly', 'bi-weekly'));

-- Step 2: Create index on categories for performance
CREATE INDEX IF NOT EXISTS idx_categories_recurrence_frequency
  ON categories(recurrence_frequency)
  WHERE recurrence_frequency IS NOT NULL;

-- Step 3: Migrate existing budget recurrence data to categories (if any exists)
-- This will set the category's recurrence based on the first budget found with recurrence settings
UPDATE categories c
SET
  recurrence_frequency = (
    SELECT b.recurrence_frequency
    FROM budgets b
    WHERE b.category_id = c.id
      AND b.recurrence_frequency IS NOT NULL
    LIMIT 1
  )
WHERE EXISTS (
  SELECT 1 FROM budgets b
  WHERE b.category_id = c.id
    AND b.recurrence_frequency IS NOT NULL
);

-- Step 4: Drop recurrence column from budgets table
ALTER TABLE budgets
DROP COLUMN IF EXISTS recurrence_frequency;

-- Step 5: Drop index from budgets table (if it exists)
DROP INDEX IF EXISTS idx_budgets_recurrence_frequency;

-- Add helpful comments for documentation
COMMENT ON COLUMN categories.recurrence_frequency IS
  'Payment frequency for this category: NULL (one-time payment, default), weekly (every 7 days), bi-weekly (every 14 days). Budgets for this category will automatically split into multiple payments.';

COMMENT ON COLUMN categories.default_day IS
  'Day of month (1-31) for payment execution. When recurrence_frequency is NULL, this is the single payment day. When recurrence_frequency is set, this is the first payment day and subsequent payments are calculated automatically based on frequency.';

-- Log migration completion
SELECT 'Migration completed: Moved recurrence field from budgets to categories' as migration_status;
