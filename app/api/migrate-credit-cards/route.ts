import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

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

    const { sql } = await import('@/lib/db');

    // Check migration status
    const creditCardsTableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_cards'
      ) as exists
    `;

    const creditCardColumnExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'expenses' 
        AND column_name = 'credit_card_id'
      ) as exists
    `;

    const status = {
      credit_cards_table_exists: creditCardsTableExists[0]?.exists || false,
      credit_card_column_exists: creditCardColumnExists[0]?.exists || false,
      migration_completed:
        (creditCardsTableExists[0]?.exists || false) &&
        (creditCardColumnExists[0]?.exists || false),
    };

    return NextResponse.json({
      success: true,
      status,
      message: 'Migration status retrieved successfully',
    });
  } catch (error) {
    console.error('Error checking credit cards migration status:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
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

    const { sql } = await import('@/lib/db');

    // Begin transaction for atomic migration
    await sql`BEGIN`;

    try {
      // Step 1: Create credit_cards table
      await sql`
        CREATE TABLE IF NOT EXISTS credit_cards (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          bank_name VARCHAR(255) NOT NULL,
          franchise VARCHAR(50) NOT NULL CHECK (franchise IN ('visa', 'mastercard', 'american_express', 'discover', 'other')),
          last_four_digits CHAR(4) NOT NULL CHECK (last_four_digits ~ '^[0-9]{4}$'),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          
          -- Unique constraint to prevent duplicate cards
          UNIQUE(bank_name, franchise, last_four_digits)
        )
      `;
      console.log('Created credit_cards table');

      // Step 2: Add credit_card_id column to expenses table (if it doesn't exist)
      const columnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'expenses' AND column_name = 'credit_card_id'
        ) as exists
      `;

      if (!columnExists[0]?.exists) {
        await sql`
          ALTER TABLE expenses ADD COLUMN credit_card_id UUID REFERENCES credit_cards(id) ON DELETE SET NULL
        `;
        console.log('Added credit_card_id column to expenses table');
      } else {
        console.log('credit_card_id column already exists in expenses table');
      }

      // Step 3: Create indexes for performance optimization
      await sql`CREATE INDEX IF NOT EXISTS idx_expenses_credit_card_id ON expenses(credit_card_id)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_credit_cards_bank_franchise ON credit_cards(bank_name, franchise)`;
      await sql`CREATE INDEX IF NOT EXISTS idx_credit_cards_created_at ON credit_cards(created_at)`;
      console.log('Created performance indexes');

      // Step 4: Create function to update updated_at timestamp
      await sql`
        CREATE OR REPLACE FUNCTION update_credit_card_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
          NEW.updated_at = NOW();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
      `;

      // Step 5: Create trigger to automatically update updated_at
      await sql`DROP TRIGGER IF EXISTS trigger_update_credit_card_updated_at ON credit_cards`;
      await sql`
        CREATE TRIGGER trigger_update_credit_card_updated_at
          BEFORE UPDATE ON credit_cards
          FOR EACH ROW
          EXECUTE FUNCTION update_credit_card_updated_at()
      `;
      console.log('Created updated_at trigger for credit_cards table');

      // Step 6: Verify the migration
      const creditCardsCount =
        await sql`SELECT COUNT(*) as count FROM credit_cards`;
      const expensesCount =
        await sql`SELECT COUNT(*) as total_expenses, COUNT(credit_card_id) as expenses_with_credit_cards FROM expenses`;

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Credit cards migration completed successfully',
        results: {
          credit_cards_count: creditCardsCount[0]?.count || 0,
          total_expenses: expensesCount[0]?.total_expenses || 0,
          expenses_with_credit_cards:
            expensesCount[0]?.expenses_with_credit_cards || 0,
        },
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Error during credit cards migration:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// Rollback endpoint for migration
export async function DELETE() {
  try {
    const { sql } = await import('@/lib/db');

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

    // Begin transaction for atomic rollback
    await sql`BEGIN`;

    try {
      // Step 1: Drop trigger and function
      await sql`DROP TRIGGER IF EXISTS trigger_update_credit_card_updated_at ON credit_cards`;
      await sql`DROP FUNCTION IF EXISTS update_credit_card_updated_at()`;
      console.log('Dropped trigger and function');

      // Step 2: Drop indexes
      await sql`DROP INDEX IF EXISTS idx_expenses_credit_card_id`;
      await sql`DROP INDEX IF EXISTS idx_credit_cards_bank_franchise`;
      await sql`DROP INDEX IF EXISTS idx_credit_cards_created_at`;
      console.log('Dropped indexes');

      // Step 3: Remove credit_card_id column from expenses table
      const columnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'expenses' AND column_name = 'credit_card_id'
        ) as exists
      `;

      if (columnExists[0]?.exists) {
        await sql`ALTER TABLE expenses DROP COLUMN credit_card_id`;
        console.log('Removed credit_card_id column from expenses table');
      }

      // Step 4: Drop credit_cards table
      await sql`DROP TABLE IF EXISTS credit_cards CASCADE`;
      console.log('Dropped credit_cards table');

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Credit cards migration rollback completed successfully',
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Error during credit cards migration rollback:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
