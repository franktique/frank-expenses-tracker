import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

/**
 * POST /api/migrate-invest-simulator
 *
 * Migration endpoint to create the investment simulator tables:
 * - investment_scenarios: Store investment configurations
 * - investment_rate_comparisons: Store additional rates for comparison
 *
 * Usage: Call this endpoint to initialize the investment simulator feature.
 * The migration is idempotent - safe to run multiple times.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if tables already exist
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('investment_scenarios', 'investment_rate_comparisons')
    `;

    const tableNames = existingTables.map((t: any) => t.table_name);
    const scenariosExists = tableNames.includes('investment_scenarios');
    const comparisonsExists = tableNames.includes(
      'investment_rate_comparisons'
    );

    // Create investment_scenarios table
    if (!scenariosExists) {
      await sql`
        CREATE TABLE investment_scenarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          initial_amount DECIMAL(15, 2) NOT NULL,
          monthly_contribution DECIMAL(15, 2) NOT NULL DEFAULT 0,
          term_months INTEGER NOT NULL,
          annual_rate DECIMAL(8, 4) NOT NULL,
          compounding_frequency VARCHAR(10) NOT NULL DEFAULT 'monthly',
          currency VARCHAR(3) NOT NULL DEFAULT 'COP',
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT investment_scenarios_name_unique UNIQUE (name),
          CONSTRAINT investment_scenarios_currency_check CHECK (currency IN ('USD', 'COP', 'EUR', 'MXN', 'ARS', 'GBP')),
          CONSTRAINT investment_scenarios_compounding_check CHECK (compounding_frequency IN ('daily', 'monthly'))
        )
      `;
      console.log('Created investment_scenarios table');
    } else {
      console.log('investment_scenarios table already exists');

      // Check if compounding_frequency column exists, add it if not
      const compoundingCol = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'investment_scenarios'
        AND column_name = 'compounding_frequency'
      `;

      if (compoundingCol.length === 0) {
        await sql`
          ALTER TABLE investment_scenarios
          ADD COLUMN compounding_frequency VARCHAR(10) NOT NULL DEFAULT 'monthly',
          ADD CONSTRAINT investment_scenarios_compounding_check CHECK (compounding_frequency IN ('daily', 'monthly'))
        `;
        console.log(
          'Added compounding_frequency column to investment_scenarios table'
        );
      }

      // Check if notes column exists, add it if not
      const notesCol = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'investment_scenarios'
        AND column_name = 'notes'
      `;

      if (notesCol.length === 0) {
        await sql`
          ALTER TABLE investment_scenarios
          ADD COLUMN notes TEXT
        `;
        console.log('Added notes column to investment_scenarios table');
      }
    }

    // Create investment_rate_comparisons table
    if (!comparisonsExists) {
      await sql`
        CREATE TABLE investment_rate_comparisons (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          investment_scenario_id UUID NOT NULL REFERENCES investment_scenarios(id) ON DELETE CASCADE,
          rate DECIMAL(8, 4) NOT NULL,
          label VARCHAR(100),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT investment_rate_comparisons_unique_rate UNIQUE (investment_scenario_id, rate)
        )
      `;
      console.log('Created investment_rate_comparisons table');

      // Create index for faster queries
      await sql`
        CREATE INDEX idx_investment_rate_comparisons_scenario
        ON investment_rate_comparisons(investment_scenario_id)
      `;
      console.log(
        'Created index on investment_rate_comparisons(investment_scenario_id)'
      );
    } else {
      console.log('investment_rate_comparisons table already exists');
    }

    // Verify tables were created successfully
    const verification = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('investment_scenarios', 'investment_rate_comparisons')
      ORDER BY table_name
    `;

    const createdTables = verification.map((t: any) => t.table_name);

    return NextResponse.json({
      success: true,
      message: 'Investment simulator migration completed successfully',
      tables: createdTables,
      created: {
        investment_scenarios: !scenariosExists,
        investment_rate_comparisons: !comparisonsExists,
      },
    });
  } catch (error) {
    console.error('Error during investment simulator migration:', error);

    // Handle duplicate table errors (likely from concurrent requests)
    if (error instanceof Error) {
      if (
        error.message.includes('already exists') ||
        error.message.includes('duplicate key')
      ) {
        // Verify tables exist despite the error
        const verification = await sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('investment_scenarios', 'investment_rate_comparisons')
          ORDER BY table_name
        `;

        const createdTables = verification.map((t: any) => t.table_name);

        if (createdTables.length === 2) {
          return NextResponse.json({
            success: true,
            message: 'Investment simulator tables already exist',
            tables: createdTables,
            note: 'Tables were created by another concurrent request',
          });
        }
      }

      if (error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Error de conexión con la base de datos',
            code: 'DATABASE_CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor durante la migración',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migrate-invest-simulator
 *
 * Check the migration status of investment simulator tables
 */
export async function GET() {
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('investment_scenarios', 'investment_rate_comparisons')
      ORDER BY table_name
    `;

    const existingTables = tables.map((t: any) => t.table_name);

    // Get table counts if they exist
    let counts: Record<string, number> = {};
    if (existingTables.includes('investment_scenarios')) {
      const [scenarioCount] = await sql`
        SELECT COUNT(*) as count FROM investment_scenarios
      `;
      counts.scenarios = parseInt(scenarioCount.count);
    }
    if (existingTables.includes('investment_rate_comparisons')) {
      const [comparisonCount] = await sql`
        SELECT COUNT(*) as count FROM investment_rate_comparisons
      `;
      counts.rateComparisons = parseInt(comparisonCount.count);
    }

    return NextResponse.json({
      success: true,
      tables: existingTables,
      counts,
      status:
        existingTables.length === 2
          ? 'fully_migrated'
          : existingTables.length === 0
            ? 'not_migrated'
            : 'partially_migrated',
    });
  } catch (error) {
    console.error(
      'Error checking investment simulator migration status:',
      error
    );

    return NextResponse.json(
      {
        error: 'Error al verificar el estado de la migración',
        code: 'VERIFICATION_ERROR',
      },
      { status: 500 }
    );
  }
}
