import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const db = sql;

    // Check if pending column already exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'expenses' AND column_name = 'pending'
    `;

    const existingColumn = await db.query(checkColumnQuery);

    if (existingColumn.length === 0) {
      // Add pending column to expenses table
      await db`
        ALTER TABLE expenses
        ADD COLUMN pending BOOLEAN DEFAULT FALSE
      `;

      // Create index for better performance
      await db`
        CREATE INDEX IF NOT EXISTS idx_expenses_pending ON expenses(pending)
      `;

      return NextResponse.json({
        success: true,
        message: 'Pending column added successfully to expenses table',
        created: true,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Pending column already exists in expenses table',
        created: false,
      });
    }
  } catch (error) {
    console.error('Error adding pending column:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to add pending column to expenses table',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const db = sql;

    // Check if pending column exists
    const checkColumnQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'expenses' AND column_name = 'pending'
    `;

    const existingColumn = await db.query(checkColumnQuery);

    if (existingColumn.length > 0) {
      // Drop the index first
      await db`
        DROP INDEX IF EXISTS idx_expenses_pending
      `;

      // Drop the pending column
      await db`
        ALTER TABLE expenses
        DROP COLUMN IF EXISTS pending
      `;

      return NextResponse.json({
        success: true,
        message: 'Pending column removed successfully from expenses table',
        deleted: true,
      });
    } else {
      return NextResponse.json({
        success: true,
        message: 'Pending column does not exist in expenses table',
        deleted: false,
      });
    }
  } catch (error) {
    console.error('Error removing pending column:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to remove pending column from expenses table',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
