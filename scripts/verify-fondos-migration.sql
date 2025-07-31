-- Verification script for Fondos Migration
-- Run this script to verify that the migration was applied correctly

-- Check if funds table exists and has correct structure
SELECT 'funds_table_structure' as check_name, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_name = 'funds'
ORDER BY ordinal_position;

-- Check if default fund exists
SELECT 'default_fund_exists' as check_name, 
       id, 
       name, 
       description, 
       initial_balance, 
       current_balance, 
       start_date
FROM funds 
WHERE name = 'Disponible';

-- Check if fund_id column was added to categories table
SELECT 'categories_fund_column' as check_name,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'categories' AND column_name = 'fund_id';

-- Check if fund_id column was added to incomes table
SELECT 'incomes_fund_column' as check_name,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'incomes' AND column_name = 'fund_id';

-- Check if destination_fund_id column was added to expenses table
SELECT 'expenses_destination_fund_column' as check_name,
       column_name,
       data_type,
       is_nullable
FROM information_schema.columns 
WHERE table_name = 'expenses' AND column_name = 'destination_fund_id';

-- Check if indexes were created
SELECT 'fund_indexes' as check_name,
       indexname,
       tablename
FROM pg_indexes 
WHERE indexname LIKE '%fund%';

-- Count records with fund assignments
SELECT 'record_counts' as check_name,
       'categories_with_fund_id' as table_info,
       count(*) as count
FROM categories 
WHERE fund_id IS NOT NULL
UNION ALL
SELECT 'record_counts',
       'incomes_with_fund_id',
       count(*)
FROM incomes 
WHERE fund_id IS NOT NULL
UNION ALL
SELECT 'record_counts',
       'total_funds',
       count(*)
FROM funds;