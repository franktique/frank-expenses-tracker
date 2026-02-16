import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

export async function GET() {
  try {
    // First, test if we can connect to the database
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

    // Create simulation_incomes table
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS simulation_incomes (
          id SERIAL PRIMARY KEY,
          simulation_id INTEGER NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(10,2) NOT NULL DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('Simulation incomes table created or already exists');
    } catch (error) {
      console.error('Error creating simulation_incomes table:', error);
      return NextResponse.json(
        {
          success: false,
          message:
            'Error creating simulation_incomes table: ' +
            (error as Error).message,
        },
        { status: 500 }
      );
    }

    // Create indexes for optimal query performance
    try {
      // Index for simulation_incomes lookups by simulation_id
      await sql`
        CREATE INDEX IF NOT EXISTS idx_simulation_incomes_simulation_id
        ON simulation_incomes(simulation_id)
      `;

      // Index for sorting by created_at
      await sql`
        CREATE INDEX IF NOT EXISTS idx_simulation_incomes_created_at
        ON simulation_incomes(created_at DESC)
      `;

      console.log('Database indexes created successfully');
    } catch (error) {
      console.error('Error creating indexes:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error creating indexes: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Simulation incomes table and indexes created successfully',
    });
  } catch (error) {
    console.error('Error setting up simulation incomes table:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
