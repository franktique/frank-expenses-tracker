import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * POST /api/migrate-events
 *
 * Idempotent migration that:
 * 1. Creates the `events` table if it does not exist
 * 2. Adds `event_id` FK column to `expenses` if it does not exist
 * 3. Migrates existing free-text event strings → rows in `events`
 * 4. Back-fills `expenses.event_id` by matching trimmed event names
 *
 * DELETE /api/migrate-events
 * Rollback: nullify event_id on expenses, drop column, drop events table.
 */

export async function POST() {
  try {
    const connectionTest = await testConnection();
    if (!connectionTest.connected) {
      return NextResponse.json(
        {
          success: false,
          message: 'Could not connect to the database: ' + connectionTest.error,
        },
        { status: 500 }
      );
    }

    // 1. Create events table (idempotent)
    await sql`
      CREATE TABLE IF NOT EXISTS events (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL,
        description TEXT,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    // Unique index on name (case-insensitive via lower())
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS events_name_unique
        ON events (LOWER(TRIM(name)))
    `;

    // 2. Add event_id column to expenses if it does not exist
    const columnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenses'
          AND column_name = 'event_id'
      )
    `;
    const columnExists = columnCheck[0]?.exists ?? false;

    if (!columnExists) {
      await sql`
        ALTER TABLE expenses
        ADD COLUMN event_id INTEGER REFERENCES events(id) ON DELETE SET NULL
      `;
    }

    // 3. Insert distinct non-null/non-empty event names from expenses
    const insertResult = await sql`
      INSERT INTO events (name)
      SELECT DISTINCT TRIM(event)
      FROM expenses
      WHERE event IS NOT NULL
        AND TRIM(event) <> ''
      ON CONFLICT DO NOTHING
    `;
    const eventsCreated = insertResult.count ?? 0;

    // 4. Back-fill event_id on expenses
    const updateResult = await sql`
      UPDATE expenses e
      SET event_id = ev.id
      FROM events ev
      WHERE LOWER(TRIM(e.event)) = LOWER(TRIM(ev.name))
        AND e.event IS NOT NULL
        AND TRIM(e.event) <> ''
        AND e.event_id IS NULL
    `;
    const expensesUpdated = updateResult.count ?? 0;

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      events_created: eventsCreated,
      expenses_updated: expensesUpdated,
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Migration failed: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const connectionTest = await testConnection();
    if (!connectionTest.connected) {
      return NextResponse.json(
        {
          success: false,
          message: 'Could not connect to the database: ' + connectionTest.error,
        },
        { status: 500 }
      );
    }

    // Nullify event_id on all expenses
    await sql`UPDATE expenses SET event_id = NULL`;

    // Drop event_id column if it exists
    const columnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'expenses'
          AND column_name = 'event_id'
      )
    `;
    if (columnCheck[0]?.exists) {
      await sql`ALTER TABLE expenses DROP COLUMN event_id`;
    }

    // Drop events table
    await sql`DROP TABLE IF EXISTS events`;

    return NextResponse.json({
      success: true,
      message: 'Rollback completed successfully',
    });
  } catch (error) {
    console.error('Rollback failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Rollback failed: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
