-- Credit Cards Migration Script
-- This script creates the credit_cards table and adds credit_card_id to expenses table

-- Create credit_cards table
CREATE TABLE IF NOT EXISTS credit_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name VARCHAR(255) NOT NULL,
  franchise VARCHAR(50) NOT NULL CHECK (franchise IN ('visa', 'mastercard', 'american_express', 'discover', 'other')),
  last_four_digits CHAR(4) NOT NULL CHECK (last_four_digits ~ '^[0-9]{4}$'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate cards
  UNIQUE(bank_name, franchise, last_four_digits)
);

-- Add credit_card_id column to expenses table (if it doesn't exist)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'credit_card_id'
  ) THEN
    ALTER TABLE expenses ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_expenses_credit_card_id ON expenses(credit_card_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_bank_franchise ON credit_cards(bank_name, franchise);
CREATE INDEX IF NOT EXISTS idx_credit_cards_created_at ON credit_cards(created_at);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_credit_card_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS trigger_update_credit_card_updated_at ON credit_cards;
CREATE TRIGGER trigger_update_credit_card_updated_at
  BEFORE UPDATE ON credit_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_credit_card_updated_at();

-- Verify the migration
SELECT 
  'credit_cards table created' as status,
  COUNT(*) as record_count
FROM credit_cards;

SELECT 
  'expenses table updated' as status,
  COUNT(*) as total_expenses,
  COUNT(credit_card_id) as expenses_with_credit_cards
FROM expenses;