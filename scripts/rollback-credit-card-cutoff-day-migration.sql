-- Rollback: Remove cutoff_day from credit_cards
-- This script reverses the credit card cutoff_day migration

-- Drop constraint and column from credit_cards
ALTER TABLE credit_cards
DROP CONSTRAINT IF EXISTS check_valid_cutoff_day;

ALTER TABLE credit_cards
DROP COLUMN IF EXISTS cutoff_day;

-- Log rollback completion
SELECT 'Rollback completed: Removed cutoff_day from credit_cards' as rollback_status;
