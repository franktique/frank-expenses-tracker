import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';

const CUTOFF_DAY_CONSTRAINT = 'check_valid_cutoff_day';

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
    const columnExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_name = 'credit_cards'
        AND column_name = 'cutoff_day'
      ) as exists
    `;

    const constraintExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.table_constraints
        WHERE table_name = 'credit_cards'
        AND constraint_name = ${CUTOFF_DAY_CONSTRAINT}
      ) as exists
    `;

    const status = {
      cutoff_day_column_exists: columnExists[0]?.exists || false,
      constraint_exists: constraintExists[0]?.exists || false,
      migration_completed:
        (columnExists[0]?.exists || false) &&
        (constraintExists[0]?.exists || false),
    };

    return NextResponse.json({
      success: true,
      status,
      message: 'Migration status retrieved successfully',
    });
  } catch (error) {
    console.error('Error checking cutoff_day migration status:', error);
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
      // Step 1: Add cutoff_day column if it doesn't exist
      const columnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'credit_cards' AND column_name = 'cutoff_day'
        ) as exists
      `;

      if (!columnExists[0]?.exists) {
        await sql`
          ALTER TABLE credit_cards ADD COLUMN cutoff_day INTEGER
        `;
        console.log('Added cutoff_day column to credit_cards table');
      } else {
        console.log('cutoff_day column already exists in credit_cards table');
      }

      // Step 2: Add CHECK constraint for valid range (1-31) or NULL
      const constraintExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints
          WHERE table_name = 'credit_cards'
          AND constraint_name = ${CUTOFF_DAY_CONSTRAINT}
        ) as exists
      `;

      if (!constraintExists[0]?.exists) {
        // Identifier can't be a bind param in a tagged-template query, so it's
        // inlined directly; CUTOFF_DAY_CONSTRAINT is a hardcoded constant, never user input.
        await sql`
          ALTER TABLE credit_cards
          ADD CONSTRAINT check_valid_cutoff_day
            CHECK (cutoff_day IS NULL OR (cutoff_day >= 1 AND cutoff_day <= 31))
        `;
        console.log('Added cutoff_day CHECK constraint');
      } else {
        console.log('cutoff_day CHECK constraint already exists');
      }

      // Step 3: Verify the migration
      const cardCount = await sql`
        SELECT COUNT(*) as count, COUNT(cutoff_day) as cards_with_cutoff_day
        FROM credit_cards
      `;

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: 'Credit card cutoff_day migration completed successfully',
        results: {
          total_cards: cardCount[0]?.count || 0,
          cards_with_cutoff_day: cardCount[0]?.cards_with_cutoff_day || 0,
        },
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error('Error during credit card cutoff_day migration:', error);
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
      // Step 1: Drop the CHECK constraint
      const constraintExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints
          WHERE table_name = 'credit_cards'
          AND constraint_name = ${CUTOFF_DAY_CONSTRAINT}
        ) as exists
      `;

      if (constraintExists[0]?.exists) {
        await sql`
          ALTER TABLE credit_cards DROP CONSTRAINT check_valid_cutoff_day
        `;
        console.log('Dropped cutoff_day CHECK constraint');
      }

      // Step 2: Drop the cutoff_day column
      const columnExists = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_name = 'credit_cards' AND column_name = 'cutoff_day'
        ) as exists
      `;

      if (columnExists[0]?.exists) {
        await sql`ALTER TABLE credit_cards DROP COLUMN cutoff_day`;
        console.log('Dropped cutoff_day column from credit_cards table');
      }

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message:
          'Credit card cutoff_day migration rollback completed successfully',
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error(
      'Error during credit card cutoff_day migration rollback:',
      error
    );
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
