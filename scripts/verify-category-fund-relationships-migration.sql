-- Verification script for category-fund relationships migration
-- Run this after the migration to ensure everything is working correctly

-- Check 1: Verify table exists with correct structure
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'category_fund_relationships'
ORDER BY ordinal_position;

-- Check 2: Verify indexes exist
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename = 'category_fund_relationships';

-- Check 3: Verify foreign key constraints
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
  AND tc.table_name = 'category_fund_relationships';

-- Check 4: Verify unique constraint
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' 
  AND tc.table_name = 'category_fund_relationships';

-- Check 5: Verify functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN (
  'validate_category_fund_relationship_deletion',
  'get_category_funds',
  'category_has_fund_restrictions'
);

-- Check 6: Count migrated relationships
SELECT 
  COUNT(*) as total_relationships,
  COUNT(DISTINCT category_id) as categories_with_funds,
  COUNT(DISTINCT fund_id) as funds_with_categories
FROM category_fund_relationships;

-- Check 7: Compare with original categories.fund_id relationships
SELECT 
  'Original categories with fund_id' as source,
  COUNT(*) as count
FROM categories 
WHERE fund_id IS NOT NULL
UNION ALL
SELECT 
  'Migrated relationships' as source,
  COUNT(*) as count
FROM category_fund_relationships;

-- Check 8: Test validation function (example usage)
-- This would test with actual category and fund IDs in a real environment
-- SELECT * FROM validate_category_fund_relationship_deletion('category-uuid', 'fund-uuid');

-- Check 9: Test get_category_funds function (example usage)
-- SELECT * FROM get_category_funds('category-uuid');

-- Check 10: Test category_has_fund_restrictions function (example usage)
-- SELECT category_has_fund_restrictions('category-uuid');

-- Summary report
SELECT 
  'Migration Verification Summary' as report_section,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'category_fund_relationships')
    THEN '✅ Table created'
    ELSE '❌ Table missing'
  END as table_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'category_fund_relationships') >= 2
    THEN '✅ Indexes created'
    ELSE '❌ Indexes missing'
  END as index_status,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name LIKE '%category%fund%') >= 3
    THEN '✅ Functions created'
    ELSE '❌ Functions missing'
  END as function_status;