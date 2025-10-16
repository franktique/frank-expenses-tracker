-- Rollback Script for Expected Savings Migration
-- This script removes the expected_savings column and related constraints
--
-- WARNING: This will permanently delete all expected_savings data!
-- Use with caution and ensure you have backups if needed.

-- Begin transaction for atomic rollback
BEGIN;

-- Step 1: Drop the check constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_expected_savings_valid'
    AND table_name = 'simulation_budgets'
  ) THEN
    ALTER TABLE simulation_budgets
    DROP CONSTRAINT check_expected_savings_valid;

    RAISE NOTICE 'Check constraint check_expected_savings_valid dropped';
  ELSE
    RAISE NOTICE 'Check constraint check_expected_savings_valid does not exist';
  END IF;
END $$;

-- Step 2: Drop the index
DROP INDEX IF EXISTS idx_simulation_budgets_expected_savings;
RAISE NOTICE 'Index idx_simulation_budgets_expected_savings dropped if it existed';

-- Step 3: Drop the expected_savings column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulation_budgets' AND column_name = 'expected_savings'
  ) THEN
    ALTER TABLE simulation_budgets
    DROP COLUMN expected_savings;

    RAISE NOTICE 'Column expected_savings dropped from simulation_budgets table';
  ELSE
    RAISE NOTICE 'Column expected_savings does not exist in simulation_budgets table';
  END IF;
END $$;

-- Commit transaction
COMMIT;

-- Verification query
SELECT
  column_name
FROM information_schema.columns
WHERE table_name = 'simulation_budgets';

RAISE NOTICE 'Rollback completed. Verify that expected_savings column is no longer in the list above.';
