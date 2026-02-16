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

    // Create tables one by one with error handling for each
    try {
      // Create categories table
      await sql`
        CREATE TABLE IF NOT EXISTS categories (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL
        )
      `;
      console.log('Categories table created or already exists');
    } catch (error) {
      console.error('Error creating categories table:', error);
      return NextResponse.json(
        {
          success: false,
          message:
            'Error creating categories table: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }

    try {
      // Create periods table
      await sql`
        CREATE TABLE IF NOT EXISTS periods (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          month INTEGER NOT NULL,
          year INTEGER NOT NULL,
          is_open BOOLEAN NOT NULL DEFAULT false
        )
      `;
      console.log('Periods table created or already exists');
    } catch (error) {
      console.error('Error creating periods table:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error creating periods table: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }

    try {
      // Create budgets table
      await sql`
        CREATE TABLE IF NOT EXISTS budgets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
          expected_amount DECIMAL(15, 2) NOT NULL,
          UNIQUE(category_id, period_id)
        )
      `;
      console.log('Budgets table created or already exists');
    } catch (error) {
      console.error('Error creating budgets table:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error creating budgets table: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }

    try {
      // Create incomes table
      await sql`
        CREATE TABLE IF NOT EXISTS incomes (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          period_id UUID REFERENCES periods(id),
          date DATE NOT NULL,
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL
        )
      `;
      console.log('Incomes table created or already exists');
    } catch (error) {
      console.error('Error creating incomes table:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error creating incomes table: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }

    try {
      // Create expenses table
      await sql`
        CREATE TABLE IF NOT EXISTS expenses (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
          period_id UUID NOT NULL REFERENCES periods(id) ON DELETE CASCADE,
          date DATE NOT NULL,
          event VARCHAR(255),
          payment_method VARCHAR(50) NOT NULL,
          description VARCHAR(255) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL
        )
      `;
      console.log('Expenses table created or already exists');
    } catch (error) {
      console.error('Error creating expenses table:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error creating expenses table: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }

    try {
      // Create settings table
      await sql`
        CREATE TABLE IF NOT EXISTS settings (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          default_fund_id UUID REFERENCES funds(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log('Settings table created or already exists');

      // Create initial settings record if none exists
      const existingSettings = await sql`SELECT id FROM settings LIMIT 1`;
      if (existingSettings.length === 0) {
        await sql`
          INSERT INTO settings (default_fund_id)
          VALUES (NULL)
        `;
        console.log('Initial settings record created');
      }
    } catch (error) {
      console.error('Error creating settings table:', error);
      // Don't fail the entire setup if settings table creation fails
      // This table is optional and can be created later
      console.warn('Settings table creation failed, but continuing with setup');
    }

    return NextResponse.json({
      success: true,
      message: 'Database tables created successfully',
    });
  } catch (error) {
    console.error('Error setting up database:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
