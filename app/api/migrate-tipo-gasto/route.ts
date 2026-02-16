import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * API endpoint to migrate the database schema for tipo_gasto feature
 *
 * This endpoint adds the tipo_gasto column to the categories table.
 * It's idempotent - it can be called multiple times safely.
 *
 * GET /api/migrate-tipo-gasto
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

    // Check if column already exists
    const columnCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'tipo_gasto'
      )
    `;

    const columnExists =
      columnCheckResult.length > 0 ? columnCheckResult[0].exists : false;

    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: 'Column tipo_gasto already exists',
        skipped: true,
      });
    }

    // Add the tipo_gasto column with default value 'F' (Fijo)
    await sql`
      ALTER TABLE categories
      ADD COLUMN tipo_gasto VARCHAR(2) DEFAULT 'F'
    `;

    console.log(
      "✓ Added tipo_gasto column to categories table with default value 'F' (Fijo)"
    );

    // Update any NULL values to 'F' (Fijo) for backward compatibility
    await sql`
      UPDATE categories
      SET tipo_gasto = 'F'
      WHERE tipo_gasto IS NULL
    `;

    console.log("✓ Set default 'F' value for all existing categories");

    // Add check constraint to ensure only valid values are stored
    try {
      await sql`
        ALTER TABLE categories
        ADD CONSTRAINT check_valid_tipo_gasto
        CHECK (tipo_gasto IN ('F', 'V', 'SF', 'E'))
      `;
      console.log('✓ Added check constraint for tipo_gasto values');
    } catch (constraintError) {
      console.warn('Warning: Could not add constraint:', constraintError);
      // Don't fail the migration if constraint creation fails
    }

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      details: {
        column_added: 'tipo_gasto',
        type: 'VARCHAR(2)',
        default: 'F (Fijo)',
        valid_values: ['F', 'V', 'SF', 'E'],
        description:
          'F = Fijo (Fixed), V = Variable, SF = Semi Fijo (Semi-Fixed), E = Eventual',
        note: "All existing categories have been set to 'F' (Fijo) as the default expense type",
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
