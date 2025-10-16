-- Verification Script for Expected Savings Migration
-- This script verifies that the migration was successful

-- Check 1: Verify column exists with correct properties
SELECT
  'Column exists' as check_name,
  CASE
    WHEN column_name IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_budgets'
  AND column_name = 'expected_savings';

-- Check 2: Verify constraint exists
SELECT
  'Check constraint exists' as check_name,
  CASE
    WHEN constraint_name IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'simulation_budgets'
  AND constraint_name = 'check_expected_savings_valid';

-- Check 3: Verify index exists
SELECT
  'Index exists' as check_name,
  CASE
    WHEN indexname IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE tablename = 'simulation_budgets'
  AND indexname = 'idx_simulation_budgets_expected_savings';

-- Check 4: Verify data integrity (all existing records have expected_savings = 0)
SELECT
  'Data integrity check' as check_name,
  CASE
    WHEN COUNT(*) = COUNT(CASE WHEN expected_savings = 0 THEN 1 END) THEN 'PASS'
    WHEN COUNT(*) = 0 THEN 'PASS (no data)'
    ELSE 'FAIL'
  END as status,
  COUNT(*) as total_records,
  COUNT(CASE WHEN expected_savings = 0 THEN 1 END) as records_with_zero_savings,
  COUNT(CASE WHEN expected_savings > 0 THEN 1 END) as records_with_savings,
  COUNT(CASE WHEN expected_savings IS NULL THEN 1 END) as records_with_null_savings
FROM simulation_budgets;

-- Check 5: Sample data display
SELECT
  id,
  simulation_id,
  efectivo_amount,
  credito_amount,
  expected_savings,
  (efectivo_amount - expected_savings) as net_efectivo_spend
FROM simulation_budgets
ORDER BY id
LIMIT 10;

-- Check 6: Verify constraint works (this should succeed)
-- Uncomment to test:
-- DO $$
-- BEGIN
--   -- Test valid data (should work)
--   INSERT INTO simulation_budgets (simulation_id, category_id, efectivo_amount, expected_savings)
--   VALUES (999999, '00000000-0000-0000-0000-000000000000', 100, 50);
--
--   DELETE FROM simulation_budgets WHERE simulation_id = 999999;
--   RAISE NOTICE 'Valid constraint test: PASS';
-- EXCEPTION WHEN OTHERS THEN
--   RAISE NOTICE 'Valid constraint test: FAIL - %', SQLERRM;
-- END $$;

-- Check 7: Verify constraint prevents invalid data (should fail gracefully)
-- Uncomment to test:
-- DO $$
-- BEGIN
--   -- Test invalid data (should fail due to constraint)
--   INSERT INTO simulation_budgets (simulation_id, category_id, efectivo_amount, expected_savings)
--   VALUES (999999, '00000000-0000-0000-0000-000000000000', 100, 150);
--
--   RAISE NOTICE 'Invalid constraint test: FAIL - constraint did not prevent invalid data';
--   DELETE FROM simulation_budgets WHERE simulation_id = 999999;
-- EXCEPTION WHEN check_violation THEN
--   RAISE NOTICE 'Invalid constraint test: PASS - constraint correctly prevented invalid data';
-- WHEN OTHERS THEN
--   RAISE NOTICE 'Invalid constraint test: FAIL - unexpected error: %', SQLERRM;
-- END $$;

-- Summary
SELECT
  '=== MIGRATION VERIFICATION SUMMARY ===' as summary;
