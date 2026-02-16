import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * API endpoint to move recurrence settings from budgets to categories table
 *
 * This endpoint:
 * - Adds recurrence_frequency column to categories table
 * - Migrates any existing recurrence data from budgets to categories
 * - Removes recurrence column from budgets table
 * - Uses the existing default_day field for the first payment day
 *
 * It's idempotent - it can be called multiple times safely.
 *
 * GET /api/migrate-recurrence-to-categories
 *
 * Rollback instructions:
 * Run: /scripts/rollback-move-recurrence-to-categories.sql
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

    const migratedSteps = [];
    const skippedSteps = [];

    // Step 1: Check if recurrence_frequency column exists in categories
    const categoriesFrequencyCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'recurrence_frequency'
      )
    `;

    const categoriesFrequencyExists =
      categoriesFrequencyCheck.length > 0
        ? categoriesFrequencyCheck[0].exists
        : false;

    if (!categoriesFrequencyExists) {
      // Add recurrence_frequency to categories
      await sql`
        ALTER TABLE categories
        ADD COLUMN recurrence_frequency VARCHAR(20)
      `;
      migratedSteps.push('Added recurrence_frequency column to categories');

      // Add constraint
      try {
        await sql`
          ALTER TABLE categories
          ADD CONSTRAINT categories_recurrence_frequency_check
          CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('weekly', 'bi-weekly'))
        `;
        migratedSteps.push(
          'Added check constraint for categories.recurrence_frequency'
        );
      } catch (constraintError) {
        console.warn('Warning: Could not add constraint:', constraintError);
      }

      // Create index
      try {
        await sql`
          CREATE INDEX IF NOT EXISTS idx_categories_recurrence_frequency
          ON categories(recurrence_frequency)
          WHERE recurrence_frequency IS NOT NULL
        `;
        migratedSteps.push('Created index on categories.recurrence_frequency');
      } catch (indexError) {
        console.warn('Warning: Could not create index:', indexError);
      }
    } else {
      skippedSteps.push('recurrence_frequency already exists in categories');
    }

    // Step 2: Migrate data from budgets to categories (if budgets table has recurrence columns)
    const budgetsFrequencyCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets'
        AND column_name = 'recurrence_frequency'
      )
    `;

    const budgetsHasRecurrence =
      budgetsFrequencyCheck.length > 0
        ? budgetsFrequencyCheck[0].exists
        : false;

    if (budgetsHasRecurrence) {
      // Migrate data from budgets to categories
      await sql`
        UPDATE categories c
        SET
          recurrence_frequency = (
            SELECT b.recurrence_frequency
            FROM budgets b
            WHERE b.category_id = c.id
              AND b.recurrence_frequency IS NOT NULL
            LIMIT 1
          )
        WHERE EXISTS (
          SELECT 1 FROM budgets b
          WHERE b.category_id = c.id
            AND b.recurrence_frequency IS NOT NULL
        )
      `;
      migratedSteps.push(
        'Migrated recurrence_frequency from budgets to categories'
      );

      // Drop column from budgets
      await sql`ALTER TABLE budgets DROP COLUMN IF EXISTS recurrence_frequency`;
      migratedSteps.push(
        'Removed recurrence_frequency column from budgets table'
      );

      // Drop index
      await sql`DROP INDEX IF EXISTS idx_budgets_recurrence_frequency`;
      migratedSteps.push('Removed index from budgets table');
    } else {
      skippedSteps.push(
        'Budgets table has no recurrence_frequency column to migrate'
      );
    }

    // Determine response based on migration status
    if (migratedSteps.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'Migration already complete',
        skipped: true,
        details: {
          skipped_steps: skippedSteps,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      details: {
        migrated_steps: migratedSteps,
        skipped_steps: skippedSteps,
        info: "Recurrence settings are now defined at the category level. When creating budgets, the category's recurrence settings will be automatically applied.",
      },
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Migration failed: ' + (error as Error).message,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
