-- Rollback migration script for recurring date functionality
-- This script removes the recurring date columns and constraints

-- Remove indexes first
DROP INDEX IF EXISTS idx_categories_recurring_date;
DROP INDEX IF EXISTS idx_budgets_expected_date;

-- Remove check constraint from categories table
DO $$ 
BEGIN
    -- Check if the constraint exists
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'categories' AND constraint_name = 'recurring_date_check') THEN
        
        -- Drop the constraint
        ALTER TABLE categories DROP CONSTRAINT recurring_date_check;
        
        RAISE NOTICE 'Dropped recurring_date_check constraint from categories table';
    ELSE
        RAISE NOTICE 'recurring_date_check constraint does not exist';
    END IF;
END $$;

-- Drop recurring_date column from categories table
DO $$ 
BEGIN
    -- Check if the column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'categories' AND column_name = 'recurring_date') THEN
        
        -- Drop the column
        ALTER TABLE categories DROP COLUMN recurring_date;
        
        RAISE NOTICE 'Dropped recurring_date column from categories table';
    ELSE
        RAISE NOTICE 'recurring_date column does not exist in categories table';
    END IF;
END $$;

-- Drop expected_date column from budgets table
DO $$ 
BEGIN
    -- Check if the column exists
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'budgets' AND column_name = 'expected_date') THEN
        
        -- Drop the column
        ALTER TABLE budgets DROP COLUMN expected_date;
        
        RAISE NOTICE 'Dropped expected_date column from budgets table';
    ELSE
        RAISE NOTICE 'expected_date column does not exist in budgets table';
    END IF;
END $$;

RAISE NOTICE 'Rollback migration completed successfully';