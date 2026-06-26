import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * POST /api/migrate-event-dates
 *
 * Idempotent migration that adds start_date and end_date columns to events table.
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

    await sql`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS start_date DATE
    `;

    await sql`
      ALTER TABLE events ADD COLUMN IF NOT EXISTS end_date DATE
    `;

    return NextResponse.json({
      success: true,
      message: 'Migration completed: start_date and end_date added to events table',
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
