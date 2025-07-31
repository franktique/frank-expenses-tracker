-- Fondos Management Rollback Script
-- This script removes all fund-related changes and drops the funds table

-- Begin transaction for atomic rollback
BEGIN;

-- Step 1: Drop indexes
DROP INDEX IF EXISTS idx_categories_fund_id;
DROP INDEX IF EXISTS idx_incomes_fund_id;
DROP INDEX IF EXISTS idx_expenses_destination_fund_id;

-- Step 2: Remove destination_fund_id column from expenses table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'destination_fund_id'
  ) THEN
    ALTER TABLE expenses DROP COLUMN destination_fund_id;
  END IF;
END $$;

-- Step 3: Remove fund_id column from incomes table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incomes' AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE incomes DROP COLUMN fund_id;
  END IF;
END $$;

-- Step 4: Remove fund_id column from categories table
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE categories DROP COLUMN fund_id;
  END IF;
END $$;

-- Step 5: Drop funds table
DROP TABLE IF EXISTS funds CASCADE;

-- Commit transaction
COMMIT;

-- Verification queries (optional - can be run separately)
-- SELECT 'funds table exists' as check_name, 
--        CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'funds') 
--             THEN 'YES' ELSE 'NO' END as result
-- UNION ALL
-- SELECT 'categories fund_id column exists',
--        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'fund_id')
--             THEN 'YES' ELSE 'NO' END
-- UNION ALL
-- SELECT 'incomes fund_id column exists',
--        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'incomes' AND column_name = 'fund_id')
--             THEN 'YES' ELSE 'NO' END
-- UNION ALL
-- SELECT 'expenses destination_fund_id column exists',
--        CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'destination_fund_id')
--             THEN 'YES' ELSE 'NO' END;