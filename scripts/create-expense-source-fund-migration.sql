-- Migration script for expense source fund tracking
-- This script adds source_fund_id column to expenses table and migrates existing data

-- Step 1: Add source_fund_id column to expenses table
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_fund_id UUID REFERENCES funds(id);

-- Step 2: Create index for performance optimization on source_fund_id column
CREATE INDEX IF NOT EXISTS idx_expenses_source_fund_id ON expenses(source_fund_id);

-- Step 3: Migrate existing expenses with source fund data based on category relationships
-- Priority order:
-- 1. Use category_fund_relationships if available (new many-to-many system)
-- 2. Fall back to categories.fund_id (legacy one-to-one system)
UPDATE expenses
SET source_fund_id = (
  SELECT COALESCE(
    -- Try to get from category_fund_relationships first (take first available fund)
    (SELECT cfr.fund_id
     FROM category_fund_relationships cfr
     WHERE cfr.category_id = expenses.category_id
     ORDER BY cfr.created_at ASC
     LIMIT 1),
    -- Fallback to legacy fund_id from categories table
    (SELECT c.fund_id
     FROM categories c
     WHERE c.id = expenses.category_id)
  )
)
WHERE source_fund_id IS NULL;

-- Step 4: Create validation function to ensure source fund is related to category
CREATE OR REPLACE FUNCTION validate_expense_source_fund(
  p_category_id UUID,
  p_source_fund_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  relationship_exists BOOLEAN := FALSE;
  legacy_fund_match BOOLEAN := FALSE;
BEGIN
  -- Check if source fund is related to category via category_fund_relationships
  SELECT EXISTS(
    SELECT 1 FROM category_fund_relationships cfr
    WHERE cfr.category_id = p_category_id 
    AND cfr.fund_id = p_source_fund_id
  ) INTO relationship_exists;
  
  -- If no relationship found, check legacy fund_id
  IF NOT relationship_exists THEN
    SELECT EXISTS(
      SELECT 1 FROM categories c
      WHERE c.id = p_category_id 
      AND c.fund_id = p_source_fund_id
    ) INTO legacy_fund_match;
  END IF;
  
  RETURN relationship_exists OR legacy_fund_match;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to get available source funds for a category
CREATE OR REPLACE FUNCTION get_category_source_funds(p_category_id UUID)
RETURNS TABLE (
  fund_id UUID,
  fund_name VARCHAR(255),
  fund_description TEXT,
  is_legacy BOOLEAN
) AS $$
BEGIN
  -- Return funds from category_fund_relationships first
  RETURN QUERY
  SELECT f.id, f.name, f.description, FALSE as is_legacy
  FROM funds f
  INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
  WHERE cfr.category_id = p_category_id
  ORDER BY cfr.created_at ASC;
  
  -- If no relationships found, return legacy fund_id
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT f.id, f.name, f.description, TRUE as is_legacy
    FROM funds f
    INNER JOIN categories c ON f.id = c.fund_id
    WHERE c.id = p_category_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to check migration status
CREATE OR REPLACE FUNCTION check_expense_source_fund_migration_status()
RETURNS TABLE (
  total_expenses INTEGER,
  expenses_with_source_fund INTEGER,
  expenses_without_source_fund INTEGER,
  migration_complete BOOLEAN
) AS $$
DECLARE
  total_count INTEGER;
  with_source_count INTEGER;
  without_source_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM expenses;
  SELECT COUNT(*) INTO with_source_count FROM expenses WHERE source_fund_id IS NOT NULL;
  SELECT COUNT(*) INTO without_source_count FROM expenses WHERE source_fund_id IS NULL;
  
  RETURN QUERY SELECT 
    total_count,
    with_source_count,
    without_source_count,
    (without_source_count = 0) as migration_complete;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Log migration results
DO $$
DECLARE
  migration_status RECORD;
BEGIN
  SELECT * INTO migration_status FROM check_expense_source_fund_migration_status();
  
  RAISE NOTICE 'Expense Source Fund Migration Results:';
  RAISE NOTICE '  Total expenses: %', migration_status.total_expenses;
  RAISE NOTICE '  Expenses with source fund: %', migration_status.expenses_with_source_fund;
  RAISE NOTICE '  Expenses without source fund: %', migration_status.expenses_without_source_fund;
  RAISE NOTICE '  Migration complete: %', migration_status.migration_complete;
  
  IF migration_status.expenses_without_source_fund > 0 THEN
    RAISE WARNING 'Some expenses could not be migrated. Check categories without fund relationships.';
  END IF;
END $$;