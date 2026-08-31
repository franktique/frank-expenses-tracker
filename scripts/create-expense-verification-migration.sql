-- Expense Verification Migration Script
-- Adds is_verified to the expenses table. Expenses created from the mobile
-- receipt scanner start as false and must be audited on the desktop.
-- Matches the SQL run by app/api/migrate-expense-verification/route.ts
-- (idempotent).

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_expenses_is_verified
  ON expenses(is_verified);

-- Verify the migration
SELECT
  'is_verified column ready' as status,
  COUNT(*) FILTER (WHERE is_verified = false) as unverified_count
FROM expenses;
