-- Ahorro Credito Migration Script
-- This script adds the ahorro_efectivo_amount and ahorro_credito_amount columns
-- to the simulation_budgets table
--
-- Purpose: Split expected_savings into separate efectivo and credito savings
-- Impact: Balance calculation remains: Balance -= (efectivo_amount - ahorro_efectivo_amount)
--         Total calculation: total = efectivo + credito - ahorro_efectivo - ahorro_credito

-- Begin transaction for atomic migration
BEGIN;

-- Step 1: Add ahorro_efectivo_amount column to simulation_budgets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulation_budgets' AND column_name = 'ahorro_efectivo_amount'
  ) THEN
    ALTER TABLE simulation_budgets
    ADD COLUMN ahorro_efectivo_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

    RAISE NOTICE 'Column ahorro_efectivo_amount added to simulation_budgets table';
  ELSE
    RAISE NOTICE 'Column ahorro_efectivo_amount already exists in simulation_budgets table';
  END IF;
END $$;

-- Step 2: Add ahorro_credito_amount column to simulation_budgets table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'simulation_budgets' AND column_name = 'ahorro_credito_amount'
  ) THEN
    ALTER TABLE simulation_budgets
    ADD COLUMN ahorro_credito_amount DECIMAL(10,2) DEFAULT 0 NOT NULL;

    RAISE NOTICE 'Column ahorro_credito_amount added to simulation_budgets table';
  ELSE
    RAISE NOTICE 'Column ahorro_credito_amount already exists in simulation_budgets table';
  END IF;
END $$;

-- Step 3: Migrate existing expected_savings data to ahorro_efectivo_amount
-- We migrate to ahorro_efectivo_amount since savings from cash is more common
UPDATE simulation_budgets
SET ahorro_efectivo_amount = expected_savings
WHERE expected_savings > 0;

RAISE NOTICE 'Migrated existing expected_savings to ahorro_efectivo_amount';

-- Step 4: Add check constraint for ahorro_efectivo_amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_ahorro_efectivo_valid'
    AND table_name = 'simulation_budgets'
  ) THEN
    ALTER TABLE simulation_budgets
    ADD CONSTRAINT check_ahorro_efectivo_valid
    CHECK (ahorro_efectivo_amount >= 0 AND ahorro_efectivo_amount <= efectivo_amount);

    RAISE NOTICE 'Check constraint check_ahorro_efectivo_valid added';
  ELSE
    RAISE NOTICE 'Check constraint check_ahorro_efectivo_valid already exists';
  END IF;
END $$;

-- Step 5: Add check constraint for ahorro_credito_amount
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'check_ahorro_credito_valid'
    AND table_name = 'simulation_budgets'
  ) THEN
    ALTER TABLE simulation_budgets
    ADD CONSTRAINT check_ahorro_credito_valid
    CHECK (ahorro_credito_amount >= 0 AND ahorro_credito_amount <= credito_amount);

    RAISE NOTICE 'Check constraint check_ahorro_credito_valid added';
  ELSE
    RAISE NOTICE 'Check constraint check_ahorro_credito_valid already exists';
  END IF;
END $$;

-- Step 6: Create index for ahorro_efectivo_amount for better performance
CREATE INDEX IF NOT EXISTS idx_simulation_budgets_ahorro_efectivo
ON simulation_budgets(ahorro_efectivo_amount)
WHERE ahorro_efectivo_amount > 0;

-- Step 7: Create index for ahorro_credito_amount for better performance
CREATE INDEX IF NOT EXISTS idx_simulation_budgets_ahorro_credito
ON simulation_budgets(ahorro_credito_amount)
WHERE ahorro_credito_amount > 0;

-- Commit transaction
COMMIT;

-- Verification queries (can be run separately to verify migration)
-- Check that columns exist
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_budgets'
  AND column_name IN ('ahorro_efectivo_amount', 'ahorro_credito_amount')
ORDER BY column_name;

-- Count records with ahorro values
SELECT
  COUNT(*) as total_budgets,
  COUNT(CASE WHEN ahorro_efectivo_amount > 0 THEN 1 END) as budgets_with_ahorro_efectivo,
  COUNT(CASE WHEN ahorro_credito_amount > 0 THEN 1 END) as budgets_with_ahorro_credito,
  SUM(ahorro_efectivo_amount) as total_ahorro_efectivo,
  SUM(ahorro_credito_amount) as total_ahorro_credito
FROM simulation_budgets;

-- Show sample data with new columns
SELECT
  id,
  simulation_id,
  category_id,
  efectivo_amount,
  credito_amount,
  ahorro_efectivo_amount,
  ahorro_credito_amount,
  expected_savings,
  (efectivo_amount - ahorro_efectivo_amount) as net_spend_efectivo,
  (efectivo_amount + credito_amount - ahorro_efectivo_amount - ahorro_credito_amount) as total
FROM simulation_budgets
LIMIT 5;
