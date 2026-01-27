-- Rollback Ahorro Credito Migration Script
-- This script removes the ahorro_efectivo_amount and ahorro_credito_amount columns
-- from the simulation_budgets table
--
-- WARNING: This will permanently delete any ahorro_efectivo and ahorro_credito data
-- that was added after the migration. Ensure you have a backup before running.

-- Begin transaction for atomic rollback
BEGIN;

-- Step 1: Drop check constraint for ahorro_efectivo_amount
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_ahorro_efectivo_valid'
    AND table_name = 'simulation_budgets'
  ) THEN
    ALTER TABLE simulation_budgets
    DROP CONSTRAINT check_ahorro_efectivo_valid;

    RAISE NOTICE 'Dropped check constraint check_ahorro_efectivo_valid';
  ELSE
    RAISE NOTICE 'Check constraint check_ahorro_efectivo_valid does not exist';
  END IF;
END $$;

-- Step 2: Drop check constraint for ahorro_credito_amount
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_ahorro_credito_valid'
    AND table_name = 'simulation_budgets'
  ) THEN
    ALTER TABLE simulation_budgets
    DROP CONSTRAINT check_ahorro_credito_valid;

    RAISE NOTICE 'Dropped check constraint check_ahorro_credito_valid';
  ELSE
    RAISE NOTICE 'Check constraint check_ahorro_credito_valid does not exist';
  END IF;
END $$;

-- Step 3: Drop index for ahorro_efectivo_amount
DROP INDEX IF EXISTS idx_simulation_budgets_ahorro_efectivo;

-- Step 4: Drop index for ahorro_credito_amount
DROP INDEX IF EXISTS idx_simulation_budgets_ahorro_credito;

-- Step 5: Drop ahorro_efectivo_amount column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulation_budgets' AND column_name = 'ahorro_efectivo_amount'
  ) THEN
    ALTER TABLE simulation_budgets
    DROP COLUMN ahorro_efectivo_amount;

    RAISE NOTICE 'Dropped column ahorro_efectivo_amount';
  ELSE
    RAISE NOTICE 'Column ahorro_efectivo_amount does not exist';
  END IF;
END $$;

-- Step 6: Drop ahorro_credito_amount column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulation_budgets' AND column_name = 'ahorro_credito_amount'
  ) THEN
    ALTER TABLE simulation_budgets
    DROP COLUMN ahorro_credito_amount;

    RAISE NOTICE 'Dropped column ahorro_credito_amount';
  ELSE
    RAISE NOTICE 'Column ahorro_credito_amount does not exist';
  END IF;
END $$;

-- Commit transaction
COMMIT;

-- Verification query (can be run separately to verify rollback)
-- Check that columns have been removed
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_budgets'
  AND column_name IN ('ahorro_efectivo_amount', 'ahorro_credito_amount');

-- Should return no rows if rollback was successful
