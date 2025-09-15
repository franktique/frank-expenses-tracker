-- Migration script for adding recurring date functionality
-- This script adds support for optional recurring dates on categories
-- and expected dates on budgets

-- Forward migration: Add recurring_date to categories table
DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'categories' AND column_name = 'recurring_date') THEN
        
        -- Add recurring_date column to categories table
        ALTER TABLE categories ADD COLUMN recurring_date INTEGER;
        
        -- Add check constraint to validate recurring_date values (1-31 or NULL)
        ALTER TABLE categories ADD CONSTRAINT recurring_date_check 
        CHECK (recurring_date IS NULL OR (recurring_date >= 1 AND recurring_date <= 31));
        
        RAISE NOTICE 'Added recurring_date column to categories table';
    ELSE
        RAISE NOTICE 'recurring_date column already exists in categories table';
    END IF;
END $$;

-- Forward migration: Add expected_date to budgets table
DO $$ 
BEGIN
    -- Check if the column already exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'budgets' AND column_name = 'expected_date') THEN
        
        -- Add expected_date column to budgets table
        ALTER TABLE budgets ADD COLUMN expected_date DATE;
        
        RAISE NOTICE 'Added expected_date column to budgets table';
    ELSE
        RAISE NOTICE 'expected_date column already exists in budgets table';
    END IF;
END $$;

-- Add indexes for better performance on date-based queries
CREATE INDEX IF NOT EXISTS idx_categories_recurring_date ON categories(recurring_date) WHERE recurring_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_budgets_expected_date ON budgets(expected_date) WHERE expected_date IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN categories.recurring_date IS 'Optional day of month (1-31) when this category expense typically occurs';
COMMENT ON COLUMN budgets.expected_date IS 'Expected date for the budget, auto-populated from category recurring_date';

RAISE NOTICE 'Migration completed successfully';

-- Sample data to verify the migration works (optional)
-- UPDATE categories SET recurring_date = 15 WHERE name = 'Some Category' LIMIT 1;