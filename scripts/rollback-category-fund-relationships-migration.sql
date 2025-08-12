-- Rollback script for category-fund relationships migration
-- This script removes the many-to-many relationship table and related functions

-- Step 1: Drop validation functions
DROP FUNCTION IF EXISTS validate_category_fund_relationship_deletion(UUID, UUID);
DROP FUNCTION IF EXISTS get_category_funds(UUID);
DROP FUNCTION IF EXISTS category_has_fund_restrictions(UUID);

-- Step 2: Drop indexes
DROP INDEX IF EXISTS idx_category_fund_relationships_category_id;
DROP INDEX IF EXISTS idx_category_fund_relationships_fund_id;

-- Step 3: Drop the category_fund_relationships table
DROP TABLE IF EXISTS category_fund_relationships CASCADE;

-- Note: The original categories.fund_id column is preserved for backward compatibility
-- and can be used to restore the original one-to-one relationships if needed