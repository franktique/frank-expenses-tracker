-- Expense Duplicate Reviews Migration
-- Cola de revisión: el móvil detecta un gasto posiblemente ya ingresado y, en
-- vez de duplicarlo o pisar su detalle, envía aquí lo escaneado para que se
-- compare y se decida en el desktop. Idempotente.

CREATE TABLE IF NOT EXISTS expense_duplicate_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  proposed JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'applied', 'dismissed')),
  applied_fields JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_expense_duplicate_reviews_status
  ON expense_duplicate_reviews(status);
CREATE INDEX IF NOT EXISTS idx_expense_duplicate_reviews_expense_id
  ON expense_duplicate_reviews(expense_id);
