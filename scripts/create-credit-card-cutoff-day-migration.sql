-- Migration: Add cutoff_day to credit_cards
-- This migration adds support for the "Fecha de Corte" (statement closing day)
-- on credit cards, used to project the payment for next month's budget.

-- Add cutoff_day column to credit_cards table
-- Allows specifying the day of month (1-31) when the card's statement cycle closes
ALTER TABLE credit_cards
ADD COLUMN IF NOT EXISTS cutoff_day INTEGER;

-- Add constraint to ensure cutoff_day is between 1-31 or NULL
ALTER TABLE credit_cards
ADD CONSTRAINT check_valid_cutoff_day
  CHECK(cutoff_day IS NULL OR (cutoff_day >= 1 AND cutoff_day <= 31));

-- Log migration completion
SELECT 'Migration completed: Added cutoff_day to credit_cards' as migration_status;
