import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

export async function POST() {
  try {
    // Test database connection
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

    try {
      // Check if period_id column already exists
      const periodIdColumnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incomes' AND column_name = 'period_id'
      `;
      if (periodIdColumnCheck.length === 0) {
        await sql`
          ALTER TABLE incomes 
          ADD COLUMN period_id UUID REFERENCES periods(id)
        `;
        console.log('Added period_id column to incomes table');
      }

      // Check if event column already exists
      const eventColumnCheck = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incomes' AND column_name = 'event'
      `;
      if (eventColumnCheck.length === 0) {
        await sql`
          ALTER TABLE incomes 
          ADD COLUMN event VARCHAR(255)
        `;
        console.log('Added event column to incomes table');
      }

      return NextResponse.json({
        success: true,
        message: 'Ensured period_id and event columns exist in incomes table',
      });
    } catch (error) {
      console.error('Error adding period_id to incomes table:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error adding period_id column: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error in database migration:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
