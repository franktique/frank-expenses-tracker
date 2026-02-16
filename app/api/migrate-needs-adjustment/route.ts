import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * API endpoint to add needs_adjustment column to simulation_budgets table
 *
 * This endpoint:
 * 1. Adds a boolean column to track categories that need adjustment/review
 * 2. Defaults to FALSE for existing rows
 * 3. Used for UI highlighting of categories pending review
 *
 * GET /api/migrate-needs-adjustment
 */

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

    // Check if simulation_budgets table exists
    const tableCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'simulation_budgets'
      )
    `;

    const tableExists =
      tableCheckResult.length > 0 ? tableCheckResult[0].exists : false;

    if (!tableExists) {
      return NextResponse.json({
        success: false,
        message:
          'Table simulation_budgets does not exist. Run simulation setup first.',
        skipped: true,
      });
    }

    const migrationResults: {
      step: string;
      success: boolean;
      message: string;
      skipped?: boolean;
    }[] = [];

    // Step 1: Add needs_adjustment column
    const columnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'simulation_budgets'
        AND column_name = 'needs_adjustment'
      )
    `;

    const columnExists = columnCheck.length > 0 ? columnCheck[0].exists : false;

    if (!columnExists) {
      try {
        await sql`
          ALTER TABLE simulation_budgets
          ADD COLUMN needs_adjustment BOOLEAN DEFAULT FALSE NOT NULL
        `;
        migrationResults.push({
          step: 'add_needs_adjustment_column',
          success: true,
          message: 'Added needs_adjustment column',
        });
        console.log('✓ Added needs_adjustment column');
      } catch (error) {
        migrationResults.push({
          step: 'add_needs_adjustment_column',
          success: false,
          message:
            'Failed to add needs_adjustment column: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'add_needs_adjustment_column',
        success: true,
        message: 'needs_adjustment column already exists',
        skipped: true,
      });
    }

    // Step 2: Create index for needs_adjustment
    const indexCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'simulation_budgets'
        AND indexname = 'idx_simulation_budgets_needs_adjustment'
      )
    `;

    const indexExists = indexCheck.length > 0 ? indexCheck[0].exists : false;

    if (!indexExists) {
      try {
        await sql`
          CREATE INDEX idx_simulation_budgets_needs_adjustment
          ON simulation_budgets(needs_adjustment)
          WHERE needs_adjustment = TRUE
        `;
        migrationResults.push({
          step: 'create_needs_adjustment_index',
          success: true,
          message: 'Created index for needs_adjustment',
        });
        console.log('✓ Created index idx_simulation_budgets_needs_adjustment');
      } catch (error) {
        migrationResults.push({
          step: 'create_needs_adjustment_index',
          success: false,
          message:
            'Failed to create needs_adjustment index: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'create_needs_adjustment_index',
        success: true,
        message: 'idx_simulation_budgets_needs_adjustment index already exists',
        skipped: true,
      });
    }

    // Get summary statistics
    const summaryStats = await sql`
      SELECT
        COUNT(*) as total_budgets,
        COUNT(CASE WHEN needs_adjustment = TRUE THEN 1 END) as budgets_needing_adjustment
      FROM simulation_budgets
    `;

    return NextResponse.json({
      success: true,
      message: 'Needs adjustment migration completed successfully',
      steps: migrationResults,
      summary: summaryStats[0],
      details: {
        new_columns: ['needs_adjustment'],
        indexes: ['idx_simulation_budgets_needs_adjustment'],
        description:
          'Added needs_adjustment boolean column to track categories pending review. ' +
          'When TRUE, the category row will be highlighted in dark-yellow in the UI.',
      },
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
