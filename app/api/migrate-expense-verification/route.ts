import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * API endpoint to migrate the schema for expense verification.
 *
 * Adds the `is_verified` column to the expenses table: expenses created from
 * the mobile receipt scanner start as `false` and must be audited (marked as
 * verified) on the desktop. Idempotent — safe to call multiple times.
 *
 * GET  /api/migrate-expense-verification
 * POST /api/migrate-expense-verification
 */

async function runMigration() {
  // Check if the column already exists
  const checkColumnQuery = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'expenses' AND column_name = 'is_verified'
  `;
  const existingColumn = await sql.query(checkColumnQuery);

  if (existingColumn.length === 0) {
    await sql`
      ALTER TABLE expenses
      ADD COLUMN is_verified BOOLEAN NOT NULL DEFAULT TRUE
    `;
  }

  // Index (idempotent)
  await sql`
    CREATE INDEX IF NOT EXISTS idx_expenses_is_verified
    ON expenses(is_verified)
  `;

  return NextResponse.json({
    success: true,
    message: 'Expense verification column ready',
    created: existingColumn.length === 0,
    details: {
      column: 'is_verified',
      index: 'idx_expenses_is_verified',
    },
  });
}

export async function GET() {
  try {
    return await runMigration();
  } catch (error) {
    console.error('Expense verification migration failed:', error);
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
    await sql`DROP INDEX IF EXISTS idx_expenses_is_verified`;
    await sql`ALTER TABLE expenses DROP COLUMN IF EXISTS is_verified`;
    return NextResponse.json({ success: true, dropped: true });
  } catch (error) {
    console.error('Expense verification rollback failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Rollback failed: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
