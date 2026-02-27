import { NextResponse } from 'next/server';
import { sql, testConnection } from '@/lib/db';

/**
 * API endpoint to migrate the database schema for credit card - category association
 *
 * This endpoint adds the default_credit_card_id column to the categories table.
 * It's idempotent - it can be called multiple times safely.
 *
 * POST /api/migrate-category-credit-card  - apply migration
 * DELETE /api/migrate-category-credit-card - rollback migration
 */

export async function POST() {
  try {
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
    const columnCheck = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'default_credit_card_id'
      )
    `;
    const columnExists = columnCheck.length > 0 ? columnCheck[0].exists : false;

    if (columnExists) {
      return NextResponse.json({
        success: true,
        message: 'Column default_credit_card_id already exists',
        skipped: true,
      });
    }

    // Add the column
    await sql`
      ALTER TABLE categories
      ADD COLUMN default_credit_card_id UUID
      REFERENCES credit_cards(id) ON DELETE SET NULL
    `;
    console.log('✓ Added default_credit_card_id column to categories table');

    // Add index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_categories_default_credit_card_id
      ON categories(default_credit_card_id)
    `;
    console.log('✓ Created index idx_categories_default_credit_card_id');

    return NextResponse.json({
      success: true,
      message: 'Migration completed successfully',
      details: {
        column_added: 'default_credit_card_id',
        type: 'UUID (FK → credit_cards.id, ON DELETE SET NULL)',
        index_created: 'idx_categories_default_credit_card_id',
        description:
          'Allows each category to have an optional default credit card for expense pre-selection and budget projection',
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

export async function DELETE() {
  try {
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

    // Drop index
    await sql`
      DROP INDEX IF EXISTS idx_categories_default_credit_card_id
    `;
    console.log('✓ Dropped index idx_categories_default_credit_card_id');

    // Drop column
    await sql`
      ALTER TABLE categories
      DROP COLUMN IF EXISTS default_credit_card_id
    `;
    console.log('✓ Dropped default_credit_card_id column from categories table');

    return NextResponse.json({
      success: true,
      message: 'Rollback completed successfully',
    });
  } catch (error) {
    console.error('Rollback failed:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Rollback failed: ' + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
