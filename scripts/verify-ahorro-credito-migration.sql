-- Verification Script for Ahorro Credito Migration
-- Run this script to verify that the migration was successful

-- Check 1: Verify columns exist
SELECT
  'Columns Check' as check_type,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'simulation_budgets'
  AND column_name IN ('ahorro_efectivo_amount', 'ahorro_credito_amount')
ORDER BY column_name;

-- Expected result:
-- | column_name              | data_type | numeric_precision | numeric_scale | column_default | is_nullable |
-- |--------------------------|-----------|-------------------|---------------|----------------|-------------|
-- | ahorro_credito_amount    | numeric   | 10                | 2             | 0              | NO          |
-- | ahorro_efectivo_amount   | numeric   | 10                | 2             | 0              | NO          |

-- Check 2: Verify constraints exist
SELECT
  'Constraints Check' as check_type,
  constraint_name,
  check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'simulation_budgets'
  AND tc.constraint_name IN ('check_ahorro_efectivo_valid', 'check_ahorro_credito_valid')
ORDER BY constraint_name;

-- Expected result:
-- | check_type                  | constraint_name                 | check_clause                                        |
-- |-----------------------------|---------------------------------|-----------------------------------------------------|
-- | Constraints Check           | check_ahorro_efectivo_valid     | CHECK (ahorro_efectivo_amount >= 0 AND ahorro_efectivo_amount <= efectivo_amount) |
-- | Constraints Check           | check_ahorro_credito_valid      | CHECK (ahorro_credito_amount >= 0 AND ahorro_credito_amount <= credito_amount) |

-- Check 3: Verify indexes exist
SELECT
  'Indexes Check' as check_type,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'simulation_budgets'
  AND indexname IN ('idx_simulation_budgets_ahorro_efectivo', 'idx_simulation_budgets_ahorro_credito')
ORDER BY indexname;

-- Expected result:
-- | check_type         | indexname                              | indexdef |
-- |--------------------|----------------------------------------|----------|
-- | Indexes Check      | idx_simulation_budgets_ahorro_credito  | CREATE INDEX idx_simulation_budgets_ahorro_credito ON public.simulation_budgets USING btree (ahorro_credito_amount) WHERE ahorro_credito_amount > 0::numeric |
-- | Indexes Check      | idx_simulation_budgets_ahorro_efectivo | CREATE INDEX idx_simulation_budgets_ahorro_efectivo ON public.simulation_budgets USING btree (ahorro_efectivo_amount) WHERE ahorro_efectivo_amount > 0::numeric |

-- Check 4: Summary statistics
SELECT
  'Summary Statistics' as check_type,
  COUNT(*) as total_budgets,
  COUNT(CASE WHEN ahorro_efectivo_amount > 0 THEN 1 END) as budgets_with_ahorro_efectivo,
  COUNT(CASE WHEN ahorro_credito_amount > 0 THEN 1 END) as budgets_with_ahorro_credito,
  ROUND(SUM(ahorro_efectivo_amount)::numeric, 2) as total_ahorro_efectivo,
  ROUND(SUM(ahorro_credito_amount)::numeric, 2) as total_ahorro_credito,
  ROUND(AVG(ahorro_efectivo_amount)::numeric, 2) as avg_ahorro_efectivo,
  ROUND(AVG(ahorro_credito_amount)::numeric, 2) as avg_ahorro_credito
FROM simulation_budgets;

-- Check 5: Data integrity check - ensure ahorro_efectivo <= efectivo
SELECT
  'Data Integrity - Efectivo' as check_type,
  COUNT(*) as violated_constraints
FROM simulation_budgets
WHERE ahorro_efectivo_amount > efectivo_amount;

-- Expected result: 0 (no violations)

-- Check 6: Data integrity check - ensure ahorro_credito <= credito
SELECT
  'Data Integrity - Credito' as check_type,
  COUNT(*) as violated_constraints
FROM simulation_budgets
WHERE ahorro_credito_amount > credito_amount;

-- Expected result: 0 (no violations)

-- Check 7: Sample data with calculations
SELECT
  'Sample Data' as check_type,
  id,
  simulation_id,
  category_id,
  efectivo_amount,
  credito_amount,
  ahorro_efectivo_amount,
  ahorro_credito_amount,
  expected_savings,
  ROUND((efectivo_amount - ahorro_efectivo_amount)::numeric, 2) as net_spend_efectivo,
  ROUND((efectivo_amount + credito_amount - ahorro_efectivo_amount - ahorro_credito_amount)::numeric, 2) as total,
  ROUND((ahorro_efectivo_amount / NULLIF(efectivo_amount, 0) * 100)::numeric, 2) as ahorro_efectivo_pct,
  ROUND((ahorro_credito_amount / NULLIF(credito_amount, 0) * 100)::numeric, 2) as ahorro_credito_pct
FROM simulation_budgets
ORDER BY simulation_id, category_id
LIMIT 10;

-- Check 8: Migration summary - expected_savings to ahorro_efectivo_amount
SELECT
  'Migration Summary' as check_type,
  COUNT(*) as total_records,
  COUNT(CASE WHEN expected_savings > 0 THEN 1 END) as had_expected_savings,
  COUNT(CASE WHEN ahorro_efectivo_amount > 0 THEN 1 END) as has_ahorro_efectivo,
  COUNT(CASE WHEN expected_savings = ahorro_efectivo_amount THEN 1 END) as migrated_correctly,
  COUNT(CASE WHEN expected_savings > 0 AND ahorro_efectivo_amount = 0 THEN 1 END) as not_migrated
FROM simulation_budgets;

-- Expected result: migrated_correctly should equal had_expected_savings (all records migrated)
