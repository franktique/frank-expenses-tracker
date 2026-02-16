import { NextResponse } from 'next/server';
import { testConnection } from '@/lib/db';
import {
  migrateCategoryFundRelationships,
  checkMigrationStatus,
  ensureBackwardCompatibility,
} from '@/lib/category-fund-migration';

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

    // Get migration status
    const status = await checkMigrationStatus();

    return NextResponse.json({
      success: true,
      status,
      message: 'Migration status retrieved successfully',
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
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

    // Run the migration using the new utility
    const migrationResult = await migrateCategoryFundRelationships();

    if (migrationResult.success) {
      // Ensure backward compatibility after successful migration
      const compatibilityResult = await ensureBackwardCompatibility();

      // Combine results
      const combinedWarnings = [
        ...(migrationResult.warnings || []),
        ...(compatibilityResult.warnings || []),
      ];

      return NextResponse.json({
        ...migrationResult,
        backwardCompatibility: compatibilityResult,
        warnings: combinedWarnings.length > 0 ? combinedWarnings : undefined,
      });
    }

    return NextResponse.json(migrationResult, {
      status: migrationResult.success ? 200 : 500,
    });
  } catch (error) {
    console.error('Error during category fund relationships migration:', error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// Rollback endpoint for migration (keeping existing functionality)
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
      // Step 1: Drop validation functions
      await sql`
        DROP FUNCTION IF EXISTS validate_category_fund_relationship_deletion(UUID, UUID)
      `;
      await sql`
        DROP FUNCTION IF EXISTS get_category_funds(UUID)
      `;
      await sql`
        DROP FUNCTION IF EXISTS category_has_fund_restrictions(UUID)
      `;
      console.log('Dropped validation functions');

      // Step 2: Drop indexes
      await sql`
        DROP INDEX IF EXISTS idx_category_fund_relationships_category_id
      `;
      await sql`
        DROP INDEX IF EXISTS idx_category_fund_relationships_fund_id
      `;
      console.log('Dropped category fund relationship indexes');

      // Step 3: Drop the category_fund_relationships table
      await sql`
        DROP TABLE IF EXISTS category_fund_relationships CASCADE
      `;
      console.log('Dropped category_fund_relationships table');

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message:
          'Category fund relationships migration rollback completed successfully',
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error(
      'Error during category fund relationships migration rollback:',
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
