-- Verification script for expense source fund migration
-- Run this after the migration to ensure everything is working correctly

-- Check 1: Verify source_fund_id column exists with correct structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'source_fund_id';

-- Check 2: Verify index exists
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename = 'expenses' AND indexname = 'idx_expenses_source_fund_id';

-- Check 3: Verify foreign key constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'expenses'
  AND kcu.column_name = 'source_fund_id';

-- Check 4: Verify validation functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN (
  'validate_expense_source_fund',
  'get_category_source_funds',
  'check_expense_source_fund_migration_status'
);

-- Check 5: Migration status summary
SELECT * FROM check_expense_source_fund_migration_status();

-- Check 6: Sample of migrated expenses with source fund information
SELECT 
  e.id,
  e.description,
  e.amount,
  e.date,
  c.name as category_name,
  sf.name as source_fund_name,
  df.name as destination_fund_name,
  CASE 
    WHEN e.source_fund_id = e.destination_fund_id THEN 'Same Fund'
    WHEN e.destination_fund_id IS NULL THEN 'No Transfer'
    ELSE 'Fund Transfer'
  END as transaction_type
FROM expenses e
JOIN categories c ON e.category_id = c.id
LEFT JOIN funds sf ON e.source_fund_id = sf.id
LEFT JOIN funds df ON e.destination_fund_id = df.id
ORDER BY e.date DESC
LIMIT 10;

-- Check 7: Categories without fund relationships (potential migration issues)
SELECT 
  c.id,
  c.name as category_name,
  c.fund_id as legacy_fund_id,
  lf.name as legacy_fund_name,
  COUNT(cfr.fund_id) as relationship_count,
  COUNT(e.id) as expense_count
FROM categories c
LEFT JOIN funds lf ON c.fund_id = lf.id
LEFT JOIN category_fund_relationships cfr ON c.id = cfr.category_id
LEFT JOIN expenses e ON c.id = e.category_id
WHERE c.fund_id IS NULL AND cfr.fund_id IS NULL
GROUP BY c.id, c.name, c.fund_id, lf.name
HAVING COUNT(e.id) > 0
ORDER BY COUNT(e.id) DESC;

-- Check 8: Expenses that could not be migrated
SELECT 
  e.id,
  e.description,
  e.amount,
  e.date,
  c.name as category_name,
  c.fund_id as category_legacy_fund,
  COUNT(cfr.fund_id) as category_fund_relationships
FROM expenses e
JOIN categories c ON e.category_id = c.id
LEFT JOIN category_fund_relationships cfr ON c.id = cfr.category_id
WHERE e.source_fund_id IS NULL
GROUP BY e.id, e.description, e.amount, e.date, c.name, c.fund_id
ORDER BY e.date DESC;

-- Check 9: Fund balance validation (source funds should have expenses deducted)
SELECT 
  f.id,
  f.name,
  f.current_balance,
  COALESCE(income_total.amount, 0) as total_income,
  COALESCE(source_expense_total.amount, 0) as total_source_expenses,
  COALESCE(dest_transfer_total.amount, 0) as total_destination_transfers,
  (f.initial_balance + COALESCE(income_total.amount, 0) - COALESCE(source_expense_total.amount, 0) + COALESCE(dest_transfer_total.amount, 0)) as calculated_balance,
  (f.current_balance - (f.initial_balance + COALESCE(income_total.amount, 0) - COALESCE(source_expense_total.amount, 0) + COALESCE(dest_transfer_total.amount, 0))) as balance_difference
FROM funds f
LEFT JOIN (
  SELECT fund_id, SUM(amount) as amount
  FROM incomes
  GROUP BY fund_id
) income_total ON f.id = income_total.fund_id
LEFT JOIN (
  SELECT source_fund_id, SUM(amount) as amount
  FROM expenses
  WHERE source_fund_id IS NOT NULL
  GROUP BY source_fund_id
) source_expense_total ON f.id = source_expense_total.source_fund_id
LEFT JOIN (
  SELECT destination_fund_id, SUM(amount) as amount
  FROM expenses
  WHERE destination_fund_id IS NOT NULL
  GROUP BY destination_fund_id
) dest_transfer_total ON f.id = dest_transfer_total.destination_fund_id
ORDER BY ABS(f.current_balance - (f.initial_balance + COALESCE(income_total.amount, 0) - COALESCE(source_expense_total.amount, 0) + COALESCE(dest_transfer_total.amount, 0))) DESC;

-- Check 10: Test validation function with sample data
-- This would test with actual category and fund IDs in a real environment
-- SELECT validate_expense_source_fund('category-uuid', 'fund-uuid');

-- Summary report
SELECT 
  'Expense Source Fund Migration Verification Summary' as report_section,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'expenses' AND column_name = 'source_fund_id'
    )
    THEN '✅ Column added'
    ELSE '❌ Column missing'
  END as column_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'expenses' AND indexname = 'idx_expenses_source_fund_id'
    )
    THEN '✅ Index created'
    ELSE '❌ Index missing'
  END as index_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%expense%source%fund%') >= 3
    THEN '✅ Functions created'
    ELSE '❌ Functions missing'
  END as function_status,
  CASE 
    WHEN (SELECT migration_complete FROM check_expense_source_fund_migration_status())
    THEN '✅ Migration complete'
    ELSE '⚠️ Migration incomplete'
  END as migration_status;