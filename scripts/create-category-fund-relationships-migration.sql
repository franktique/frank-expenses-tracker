-- Migration script for category-fund relationships
-- This script creates the many-to-many relationship table and migrates existing data

-- Step 1: Create the category_fund_relationships table
CREATE TABLE IF NOT EXISTS category_fund_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  fund_id UUID NOT NULL REFERENCES funds(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_id, fund_id)
);

-- Step 2: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_category_fund_relationships_category_id ON category_fund_relationships(category_id);
CREATE INDEX IF NOT EXISTS idx_category_fund_relationships_fund_id ON category_fund_relationships(fund_id);

-- Step 3: Migrate existing data from categories.fund_id to the new relationship table
-- Only migrate categories that have a fund_id assigned
INSERT INTO category_fund_relationships (category_id, fund_id)
SELECT id, fund_id 
FROM categories 
WHERE fund_id IS NOT NULL
ON CONFLICT (category_id, fund_id) DO NOTHING;

-- Step 4: Create validation function to check relationship integrity
CREATE OR REPLACE FUNCTION validate_category_fund_relationship_deletion(
  p_category_id UUID,
  p_fund_id UUID
) RETURNS TABLE (
  has_expenses BOOLEAN,
  expense_count INTEGER,
  can_delete BOOLEAN
) AS $$
BEGIN
  -- Check if there are expenses that use this category-fund combination
  -- Since expenses don't directly reference funds, we check if the category
  -- has expenses and the category is currently associated with this fund
  SELECT 
    COUNT(*) > 0 as has_expenses,
    COUNT(*)::INTEGER as expense_count,
    COUNT(*) = 0 as can_delete
  INTO has_expenses, expense_count, can_delete
  FROM expenses e
  WHERE e.category_id = p_category_id;
  
  RETURN QUERY SELECT has_expenses, expense_count, can_delete;
END;
$$ LANGUAGE plpgsql;

-- Step 5: Create function to get available funds for a category
CREATE OR REPLACE FUNCTION get_category_funds(p_category_id UUID)
RETURNS TABLE (
  fund_id UUID,
  fund_name VARCHAR(255),
  fund_description TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.name, f.description
  FROM funds f
  INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
  WHERE cfr.category_id = p_category_id
  ORDER BY f.name;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create function to check if a category has specific fund relationships
CREATE OR REPLACE FUNCTION category_has_fund_restrictions(p_category_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  relationship_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO relationship_count
  FROM category_fund_relationships
  WHERE category_id = p_category_id;
  
  RETURN relationship_count > 0;
END;
$$ LANGUAGE plpgsql;