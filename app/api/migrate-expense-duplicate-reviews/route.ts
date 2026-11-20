import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * Crea la tabla `expense_duplicate_reviews` (cola de posibles duplicados
 * enviados desde el móvil para validar en el desktop). Idempotente.
 *
 * GET | POST /api/migrate-expense-duplicate-reviews
 * DELETE     /api/migrate-expense-duplicate-reviews  (rollback)
 */
async function runMigration() {
  await sql`
    CREATE TABLE IF NOT EXISTS expense_duplicate_reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
      proposed JSONB NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'applied', 'dismissed')),
      applied_fields JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_expense_duplicate_reviews_status
    ON expense_duplicate_reviews(status)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_expense_duplicate_reviews_expense_id
    ON expense_duplicate_reviews(expense_id)
  `;
  return NextResponse.json({
    success: true,
    message: 'expense_duplicate_reviews table ready',
  });
}

export async function GET() {
  try {
    return await runMigration();
  } catch (error) {
    console.error('Duplicate reviews migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Migration failed: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  return GET();
}

export async function DELETE() {
  try {
    await sql`DROP TABLE IF EXISTS expense_duplicate_reviews`;
    return NextResponse.json({ success: true, dropped: true });
  } catch (error) {
    console.error('Duplicate reviews rollback failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Rollback failed: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
