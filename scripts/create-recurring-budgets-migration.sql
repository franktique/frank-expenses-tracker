-- Migration: Add recurring payment support to budgets table
-- This allows budgets to be split across multiple dates within a period
-- Examples: Weekly gasoline payments, bi-weekly groceries, etc.

-- Add recurrence frequency column (NULL = one-time payment, default)
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS recurrence_frequency VARCHAR(20);

-- Add check constraint for valid frequency values
ALTER TABLE budgets
ADD CONSTRAINT budgets_recurrence_frequency_check
  CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('weekly', 'bi-weekly'));

-- Add recurrence start day (1-31, the first payment date within the period)
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS recurrence_start_day INTEGER;

-- Add check constraint for recurrence_start_day (1-31 or NULL)
ALTER TABLE budgets
ADD CONSTRAINT budgets_recurrence_start_day_check
  CHECK (recurrence_start_day IS NULL OR (recurrence_start_day >= 1 AND recurrence_start_day <= 31));

-- Create index on recurrence_frequency for efficient filtering
CREATE INDEX IF NOT EXISTS idx_budgets_recurrence_frequency
  ON budgets(recurrence_frequency)
  WHERE recurrence_frequency IS NOT NULL;

-- Create index on recurrence_start_day for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_budgets_recurrence_start_day
  ON budgets(recurrence_start_day)
  WHERE recurrence_start_day IS NOT NULL;

-- Add helpful comments for documentation
COMMENT ON COLUMN budgets.recurrence_frequency IS
  'Payment frequency: NULL (one-time payment, default), weekly (every 7 days), bi-weekly (every 14 days)';

COMMENT ON COLUMN budgets.recurrence_start_day IS
  'Day of month (1-31) for the first payment. Subsequent payments calculated automatically based on frequency. If day exceeds month length (e.g., 31 in February), it will be clamped to the last valid day.';

-- Verify migration success
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'budgets'
  AND column_name IN ('recurrence_frequency', 'recurrence_start_day')
ORDER BY ordinal_position;
