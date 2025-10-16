-- Expected Savings Migration Script
-- This script adds the expected_savings column to simulation_budgets table
--
-- Purpose: Allow users to specify expected savings from each budget category
-- Impact: Balance calculation will be: Balance -= (efectivo_amount - expected_savings)

-- Begin transaction for atomic migration
BEGIN;

-- Step 1: Add expected_savings column to simulation_budgets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulation_budgets' AND column_name = 'expected_savings'
  ) THEN
    ALTER TABLE simulation_budgets
    ADD COLUMN expected_savings DECIMAL(10,2) DEFAULT 0 NOT NULL;

    RAISE NOTICE 'Column expected_savings added to simulation_budgets table';
  ELSE
    RAISE NOTICE 'Column expected_savings already exists in simulation_budgets table';
  END IF;
END $$;

-- Step 2: Add check constraint to ensure expected_savings is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_expected_savings_valid'
    AND table_name = 'simulation_budgets'
  ) THEN
    ALTER TABLE simulation_budgets
    ADD CONSTRAINT check_expected_savings_valid
    CHECK (expected_savings >= 0 AND expected_savings <= efectivo_amount);

    RAISE NOTICE 'Check constraint check_expected_savings_valid added';
  ELSE
    RAISE NOTICE 'Check constraint check_expected_savings_valid already exists';
  END IF;
END $$;

-- Step 3: Update existing records to have 0 expected_savings (idempotent)
UPDATE simulation_budgets
SET expected_savings = 0
WHERE expected_savings IS NULL;

-- Step 4: Create index for better performance on queries filtering by expected_savings
CREATE INDEX IF NOT EXISTS idx_simulation_budgets_expected_savings
ON simulation_budgets(expected_savings)
WHERE expected_savings > 0;

-- Commit transaction
COMMIT;

-- Verification queries (can be run separately to verify migration)
-- Check that column exists
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_budgets'
  AND column_name = 'expected_savings';

-- Count records with expected_savings
SELECT
  COUNT(*) as total_budgets,
  COUNT(CASE WHEN expected_savings > 0 THEN 1 END) as budgets_with_savings,
  SUM(expected_savings) as total_expected_savings
FROM simulation_budgets;

-- Show sample data
SELECT
  id,
  simulation_id,
  category_id,
  efectivo_amount,
  expected_savings,
  (efectivo_amount - expected_savings) as net_spend
FROM simulation_budgets
LIMIT 5;
