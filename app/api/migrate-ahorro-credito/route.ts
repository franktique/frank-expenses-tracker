import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * API endpoint to add ahorro_efectivo_amount and ahorro_credito_amount columns
 * to the simulation_budgets table
 *
 * This endpoint:
 * 1. Adds two new columns for separate efectivo and credito savings tracking
 * 2. Migrates existing expected_savings data to ahorro_efectivo_amount
 * 3. Adds check constraints to validate savings amounts
 * 4. Creates indexes for better query performance
 *
 * GET /api/migrate-ahorro-credito
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

    // Step 1: Add ahorro_efectivo_amount column
    const efectivoColumnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'simulation_budgets'
        AND column_name = 'ahorro_efectivo_amount'
      )
    `;

    const efectivoColumnExists =
      efectivoColumnCheck.length > 0 ? efectivoColumnCheck[0].exists : false;

    if (!efectivoColumnExists) {
      try {
        await sql`
          ALTER TABLE simulation_budgets
          ADD COLUMN ahorro_efectivo_amount DECIMAL(10,2) DEFAULT 0 NOT NULL
        `;
        migrationResults.push({
          step: 'add_ahorro_efectivo_column',
          success: true,
          message: 'Added ahorro_efectivo_amount column',
        });
        console.log('✓ Added ahorro_efectivo_amount column');
      } catch (error) {
        migrationResults.push({
          step: 'add_ahorro_efectivo_column',
          success: false,
          message:
            'Failed to add ahorro_efectivo_amount column: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'add_ahorro_efectivo_column',
        success: true,
        message: 'ahorro_efectivo_amount column already exists',
        skipped: true,
      });
    }

    // Step 2: Add ahorro_credito_amount column
    const creditoColumnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'simulation_budgets'
        AND column_name = 'ahorro_credito_amount'
      )
    `;

    const creditoColumnExists =
      creditoColumnCheck.length > 0 ? creditoColumnCheck[0].exists : false;

    if (!creditoColumnExists) {
      try {
        await sql`
          ALTER TABLE simulation_budgets
          ADD COLUMN ahorro_credito_amount DECIMAL(10,2) DEFAULT 0 NOT NULL
        `;
        migrationResults.push({
          step: 'add_ahorro_credito_column',
          success: true,
          message: 'Added ahorro_credito_amount column',
        });
        console.log('✓ Added ahorro_credito_amount column');
      } catch (error) {
        migrationResults.push({
          step: 'add_ahorro_credito_column',
          success: false,
          message:
            'Failed to add ahorro_credito_amount column: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'add_ahorro_credito_column',
        success: true,
        message: 'ahorro_credito_amount column already exists',
        skipped: true,
      });
    }

    // Step 3: Migrate existing expected_savings to ahorro_efectivo_amount
    // Only migrate if we just added the column (not if it already existed)
    if (!efectivoColumnExists) {
      try {
        const migrateResult = await sql`
          UPDATE simulation_budgets
          SET ahorro_efectivo_amount = expected_savings
          WHERE expected_savings > 0
        `;
        const rowCount = migrateResult.count;
        migrationResults.push({
          step: 'migrate_expected_savings',
          success: true,
          message: `Migrated expected_savings to ahorro_efectivo_amount for ${rowCount} rows`,
        });
        console.log(
          `✓ Migrated expected_savings to ahorro_efectivo_amount for ${rowCount} rows`
        );
      } catch (error) {
        migrationResults.push({
          step: 'migrate_expected_savings',
          success: false,
          message:
            'Failed to migrate expected_savings: ' + (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'migrate_expected_savings',
        success: true,
        message: 'Skipped migration (column already exists)',
        skipped: true,
      });
    }

    // Step 4: Add check constraint for ahorro_efectivo_amount
    const efectivoConstraintCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'simulation_budgets'
        AND constraint_name = 'check_ahorro_efectivo_valid'
      )
    `;

    const efectivoConstraintExists =
      efectivoConstraintCheck.length > 0
        ? efectivoConstraintCheck[0].exists
        : false;

    if (!efectivoConstraintExists) {
      try {
        await sql`
          ALTER TABLE simulation_budgets
          ADD CONSTRAINT check_ahorro_efectivo_valid
          CHECK (ahorro_efectivo_amount >= 0 AND ahorro_efectivo_amount <= efectivo_amount)
        `;
        migrationResults.push({
          step: 'add_ahorro_efectivo_constraint',
          success: true,
          message: 'Added check constraint for ahorro_efectivo_amount',
        });
        console.log('✓ Added check constraint check_ahorro_efectivo_valid');
      } catch (error) {
        migrationResults.push({
          step: 'add_ahorro_efectivo_constraint',
          success: false,
          message:
            'Failed to add ahorro_efectivo constraint: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'add_ahorro_efectivo_constraint',
        success: true,
        message: 'check_ahorro_efectivo_valid constraint already exists',
        skipped: true,
      });
    }

    // Step 5: Add check constraint for ahorro_credito_amount
    const creditoConstraintCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'simulation_budgets'
        AND constraint_name = 'check_ahorro_credito_valid'
      )
    `;

    const creditoConstraintExists =
      creditoConstraintCheck.length > 0
        ? creditoConstraintCheck[0].exists
        : false;

    if (!creditoConstraintExists) {
      try {
        await sql`
          ALTER TABLE simulation_budgets
          ADD CONSTRAINT check_ahorro_credito_valid
          CHECK (ahorro_credito_amount >= 0 AND ahorro_credito_amount <= credito_amount)
        `;
        migrationResults.push({
          step: 'add_ahorro_credito_constraint',
          success: true,
          message: 'Added check constraint for ahorro_credito_amount',
        });
        console.log('✓ Added check constraint check_ahorro_credito_valid');
      } catch (error) {
        migrationResults.push({
          step: 'add_ahorro_credito_constraint',
          success: false,
          message:
            'Failed to add ahorro_credito constraint: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'add_ahorro_credito_constraint',
        success: true,
        message: 'check_ahorro_credito_valid constraint already exists',
        skipped: true,
      });
    }

    // Step 6: Create index for ahorro_efectivo_amount
    const efectivoIndexCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'simulation_budgets'
        AND indexname = 'idx_simulation_budgets_ahorro_efectivo'
      )
    `;

    const efectivoIndexExists =
      efectivoIndexCheck.length > 0 ? efectivoIndexCheck[0].exists : false;

    if (!efectivoIndexExists) {
      try {
        await sql`
          CREATE INDEX idx_simulation_budgets_ahorro_efectivo
          ON simulation_budgets(ahorro_efectivo_amount)
          WHERE ahorro_efectivo_amount > 0
        `;
        migrationResults.push({
          step: 'create_ahorro_efectivo_index',
          success: true,
          message: 'Created index for ahorro_efectivo_amount',
        });
        console.log('✓ Created index idx_simulation_budgets_ahorro_efectivo');
      } catch (error) {
        migrationResults.push({
          step: 'create_ahorro_efectivo_index',
          success: false,
          message:
            'Failed to create ahorro_efectivo index: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'create_ahorro_efectivo_index',
        success: true,
        message: 'idx_simulation_budgets_ahorro_efectivo index already exists',
        skipped: true,
      });
    }

    // Step 7: Create index for ahorro_credito_amount
    const creditoIndexCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE tablename = 'simulation_budgets'
        AND indexname = 'idx_simulation_budgets_ahorro_credito'
      )
    `;

    const creditoIndexExists =
      creditoIndexCheck.length > 0 ? creditoIndexCheck[0].exists : false;

    if (!creditoIndexExists) {
      try {
        await sql`
          CREATE INDEX idx_simulation_budgets_ahorro_credito
          ON simulation_budgets(ahorro_credito_amount)
          WHERE ahorro_credito_amount > 0
        `;
        migrationResults.push({
          step: 'create_ahorro_credito_index',
          success: true,
          message: 'Created index for ahorro_credito_amount',
        });
        console.log('✓ Created index idx_simulation_budgets_ahorro_credito');
      } catch (error) {
        migrationResults.push({
          step: 'create_ahorro_credito_index',
          success: false,
          message:
            'Failed to create ahorro_credito index: ' +
            (error as Error).message,
        });
        throw error;
      }
    } else {
      migrationResults.push({
        step: 'create_ahorro_credito_index',
        success: true,
        message: 'idx_simulation_budgets_ahorro_credito index already exists',
        skipped: true,
      });
    }

    // Get summary statistics
    const summaryStats = await sql`
      SELECT
        COUNT(*) as total_budgets,
        COUNT(CASE WHEN ahorro_efectivo_amount > 0 THEN 1 END) as budgets_with_ahorro_efectivo,
        COUNT(CASE WHEN ahorro_credito_amount > 0 THEN 1 END) as budgets_with_ahorro_credito,
        SUM(ahorro_efectivo_amount) as total_ahorro_efectivo,
        SUM(ahorro_credito_amount) as total_ahorro_credito
      FROM simulation_budgets
    `;

    return NextResponse.json({
      success: true,
      message: 'Ahorro credito migration completed successfully',
      steps: migrationResults,
      summary: summaryStats[0],
      details: {
        new_columns: ['ahorro_efectivo_amount', 'ahorro_credito_amount'],
        constraints: [
          'check_ahorro_efectivo_valid',
          'check_ahorro_credito_valid',
        ],
        indexes: [
          'idx_simulation_budgets_ahorro_efectivo',
          'idx_simulation_budgets_ahorro_credito',
        ],
        description:
          'Added separate columns for efectivo and credito savings. ' +
          'Existing expected_savings migrated to ahorro_efectivo_amount. ' +
          'Balance calculation: efectivo - ahorro_efectivo_amount. ' +
          'Total calculation: efectivo + credito - ahorro_efectivo_amount - ahorro_credito_amount.',
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
