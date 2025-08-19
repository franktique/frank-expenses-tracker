-- Verification script for estudio grouper payment methods migration
-- This script checks that the migration was applied correctly

-- Check if payment_methods column exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'estudio_groupers' 
AND column_name = 'payment_methods';

-- Check if constraint exists
SELECT 
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_name = 'check_payment_methods';

-- Check if GIN index exists
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'estudio_groupers' 
AND indexname = 'idx_estudio_groupers_payment_methods';

-- Check if helper functions exist
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines 
WHERE routine_name IN (
  'validate_payment_methods',
  'get_payment_method_filter',
  'expense_matches_payment_filter',
  'check_payment_methods_migration_status'
)
ORDER BY routine_name;

-- Check column comment
SELECT 
  col_description(c.oid, a.attnum) as column_comment
FROM pg_class c
JOIN pg_attribute a ON c.oid = a.attrelid
WHERE c.relname = 'estudio_groupers'
AND a.attname = 'payment_methods'
AND NOT a.attisdropped;

-- Run migration status check if function exists
DO $
DECLARE
  migration_status RECORD;
  function_exists BOOLEAN;
BEGIN
  -- Check if the status function exists
  SELECT EXISTS(
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'check_payment_methods_migration_status'
  ) INTO function_exists;
  
  IF function_exists THEN
    SELECT * INTO migration_status FROM check_payment_methods_migration_status();
    
    RAISE NOTICE 'Migration Status Check:';
    RAISE NOTICE '  Total estudio-grouper relationships: %', migration_status.total_estudio_groupers;
    RAISE NOTICE '  With payment method configuration: %', migration_status.with_payment_methods;
    RAISE NOTICE '  Without payment method configuration: %', migration_status.without_payment_methods;
    RAISE NOTICE '  Invalid configurations: %', migration_status.invalid_payment_methods;
    RAISE NOTICE '  Migration complete: %', migration_status.migration_complete;
  ELSE
    RAISE NOTICE 'Migration status function not found - migration may not be complete';
  END IF;
END $;