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

    try {
      // First, drop the unique constraint that prevents having multiple budgets for same category and period
      await sql`
        ALTER TABLE budgets DROP CONSTRAINT IF EXISTS budgets_category_id_period_id_key
      `;
      console.log('Dropped unique constraint on budgets table');

      // Add payment_method column to budgets table with a default value of 'cash'
      await sql`
        ALTER TABLE budgets ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) NOT NULL DEFAULT 'cash'
      `;
      console.log('Added payment_method column to budgets table');

      // Add new constraint that ensures uniqueness by category, period, and payment method
      await sql`
        ALTER TABLE budgets ADD CONSTRAINT budgets_category_period_payment_unique 
        UNIQUE(category_id, period_id, payment_method)
      `;
      console.log('Added new unique constraint to budgets table');

      // Update the existing budgets to have explicit payment_method values
      await sql`
        UPDATE budgets SET payment_method = 'cash' WHERE payment_method = 'cash'
      `;
      console.log(
        'Updated existing budgets to have explicit payment_method values'
      );

      return NextResponse.json({
        success: true,
        message: 'Budget table schema updated successfully',
      });
    } catch (error) {
      console.error('Error updating budgets table:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Error updating budgets table: ' + (error as Error).message,
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating database schema:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
