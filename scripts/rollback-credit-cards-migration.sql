-- Credit Cards Migration Rollback Script
-- This script removes the credit cards functionality and reverts database changes

-- Drop trigger and function
DROP TRIGGER IF EXISTS trigger_update_credit_card_updated_at ON credit_cards;
DROP FUNCTION IF EXISTS update_credit_card_updated_at();

-- Drop indexes
DROP INDEX IF EXISTS idx_expenses_credit_card_id;
DROP INDEX IF EXISTS idx_credit_cards_bank_franchise;
DROP INDEX IF EXISTS idx_credit_cards_created_at;

-- Remove credit_card_id column from expenses table
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'expenses' AND column_name = 'credit_card_id'
  ) THEN
    ALTER TABLE expenses DROP COLUMN credit_card_id;
  END IF;
END $$;

-- Drop credit_cards table
DROP TABLE IF EXISTS credit_cards CASCADE;

-- Verify rollback
SELECT 'Credit cards migration rolled back successfully' as status;