-- Fondos Management Migration Script
-- This script creates the funds table and adds fund-related columns to existing tables

-- Begin transaction for atomic migration
BEGIN;

-- Step 1: Create funds table
CREATE TABLE IF NOT EXISTS funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  initial_balance DECIMAL(10,2) DEFAULT 0,
  current_balance DECIMAL(10,2) DEFAULT 0,
  start_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 2: Create default fund 'Disponible'
INSERT INTO funds (name, description, initial_balance, start_date)
VALUES ('Disponible', 'Fondo por defecto para categorías sin asignación específica', 0, CURRENT_DATE)
ON CONFLICT (name) DO NOTHING;

-- Step 3: Add fund_id column to categories table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'categories' AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE categories ADD COLUMN fund_id UUID REFERENCES funds(id);
    
    -- Update existing categories to reference the default fund
    UPDATE categories 
    SET fund_id = (SELECT id FROM funds WHERE name = 'Disponible' LIMIT 1)
    WHERE fund_id IS NULL;
  END IF;
END $$;

-- Step 4: Add fund_id column to incomes table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'incomes' AND column_name = 'fund_id'
  ) THEN
    ALTER TABLE incomes ADD COLUMN fund_id UUID REFERENCES funds(id);
    
    -- Update existing incomes to reference the default fund
    UPDATE incomes 
    SET fund_id = (SELECT id FROM funds WHERE name = 'Disponible' LIMIT 1)
    WHERE fund_id IS NULL;
  END IF;
END $$;

-- Step 5: Add destination_fund_id column to expenses table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'destination_fund_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN destination_fund_id UUID REFERENCES funds(id);
  END IF;
END $$;

-- Step 6: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_categories_fund_id ON categories(fund_id);
CREATE INDEX IF NOT EXISTS idx_incomes_fund_id ON incomes(fund_id);
CREATE INDEX IF NOT EXISTS idx_expenses_destination_fund_id ON expenses(destination_fund_id);

-- Commit transaction
COMMIT;

-- Verification queries (optional - can be run separately)
-- SELECT 'funds' as table_name, count(*) as record_count FROM funds
-- UNION ALL
-- SELECT 'categories with fund_id', count(*) FROM categories WHERE fund_id IS NOT NULL
-- UNION ALL  
-- SELECT 'incomes with fund_id', count(*) FROM incomes WHERE fund_id IS NOT NULL;