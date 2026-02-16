import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting expense source fund migration...');

    // Step 1: Add source_fund_id column if it doesn't exist
    await sql`
      ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_fund_id UUID REFERENCES funds(id)
    `;
    console.log('✅ Added source_fund_id column to expenses table');

    // Step 2: Create index for performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_expenses_source_fund_id ON expenses(source_fund_id)
    `;
    console.log('✅ Created index on source_fund_id column');

    // Step 3: Create validation function
    await sql`
      CREATE OR REPLACE FUNCTION validate_expense_source_fund(
        p_category_id UUID,
        p_source_fund_id UUID
      ) RETURNS BOOLEAN AS $func$
      DECLARE
        relationship_exists BOOLEAN := FALSE;
        legacy_fund_match BOOLEAN := FALSE;
      BEGIN
        -- Check if source fund is related to category via category_fund_relationships
        SELECT EXISTS(
          SELECT 1 FROM category_fund_relationships cfr
          WHERE cfr.category_id = p_category_id 
          AND cfr.fund_id = p_source_fund_id
        ) INTO relationship_exists;
        
        -- If no relationship found, check legacy fund_id
        IF NOT relationship_exists THEN
          SELECT EXISTS(
            SELECT 1 FROM categories c
            WHERE c.id = p_category_id 
            AND c.fund_id = p_source_fund_id
          ) INTO legacy_fund_match;
        END IF;
        
        RETURN relationship_exists OR legacy_fund_match;
      END;
      $func$ LANGUAGE plpgsql
    `;
    console.log('✅ Created validation function');

    // Step 4: Create helper function to get available source funds
    await sql`
      CREATE OR REPLACE FUNCTION get_category_source_funds(p_category_id UUID)
      RETURNS TABLE (
        fund_id UUID,
        fund_name VARCHAR(255),
        fund_description TEXT,
        is_legacy BOOLEAN
      ) AS $func$
      BEGIN
        -- Return funds from category_fund_relationships first
        RETURN QUERY
        SELECT f.id, f.name, f.description, FALSE as is_legacy
        FROM funds f
        INNER JOIN category_fund_relationships cfr ON f.id = cfr.fund_id
        WHERE cfr.category_id = p_category_id
        ORDER BY cfr.created_at ASC;
        
        -- If no relationships found, return legacy fund_id
        IF NOT FOUND THEN
          RETURN QUERY
          SELECT f.id, f.name, f.description, TRUE as is_legacy
          FROM funds f
          INNER JOIN categories c ON f.id = c.fund_id
          WHERE c.id = p_category_id;
        END IF;
      END;
      $func$ LANGUAGE plpgsql
    `;
    console.log('✅ Created helper function for getting category source funds');

    // Step 5: Create migration status function
    await sql`
      CREATE OR REPLACE FUNCTION check_expense_source_fund_migration_status()
      RETURNS TABLE (
        total_expenses INTEGER,
        expenses_with_source_fund INTEGER,
        expenses_without_source_fund INTEGER,
        migration_complete BOOLEAN
      ) AS $func$
      DECLARE
        total_count INTEGER;
        with_source_count INTEGER;
        without_source_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO total_count FROM expenses;
        SELECT COUNT(*) INTO with_source_count FROM expenses WHERE source_fund_id IS NOT NULL;
        SELECT COUNT(*) INTO without_source_count FROM expenses WHERE source_fund_id IS NULL;
        
        RETURN QUERY SELECT 
          total_count,
          with_source_count,
          without_source_count,
          (without_source_count = 0) as migration_complete;
      END;
      $func$ LANGUAGE plpgsql
    `;
    console.log('✅ Created migration status function');

    // Step 6: Get pre-migration status
    const [preMigrationStatus] = await sql`
      SELECT * FROM check_expense_source_fund_migration_status()
    `;
    console.log('📊 Pre-migration status:', preMigrationStatus);

    // Step 7: Migrate existing expenses with source fund data
    const migrationResult = await sql`
      UPDATE expenses
      SET source_fund_id = (
        SELECT COALESCE(
          -- Try to get from category_fund_relationships first (take first available fund)
          (SELECT cfr.fund_id
           FROM category_fund_relationships cfr
           WHERE cfr.category_id = expenses.category_id
           ORDER BY cfr.created_at ASC
           LIMIT 1),
          -- Fallback to legacy fund_id from categories table
          (SELECT c.fund_id
           FROM categories c
           WHERE c.id = expenses.category_id)
        )
      )
      WHERE source_fund_id IS NULL
      RETURNING id, category_id, source_fund_id
    `;
    console.log(
      `✅ Migrated ${migrationResult.length} expenses with source fund data`
    );

    // Step 8: Get post-migration status
    const [postMigrationStatus] = await sql`
      SELECT * FROM check_expense_source_fund_migration_status()
    `;
    console.log('📊 Post-migration status:', postMigrationStatus);

    // Step 9: Check for expenses that couldn't be migrated
    const unmigrated = await sql`
      SELECT 
        e.id,
        e.description,
        c.name as category_name,
        c.fund_id as category_legacy_fund,
        COUNT(cfr.fund_id) as category_fund_relationships
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN category_fund_relationships cfr ON c.id = cfr.category_id
      WHERE e.source_fund_id IS NULL
      GROUP BY e.id, e.description, c.name, c.fund_id
      LIMIT 10
    `;

    if (unmigrated.length > 0) {
      console.warn(
        `⚠️ ${unmigrated.length} expenses could not be migrated (showing first 10):`,
        unmigrated
      );
    }

    // Step 10: Sample of successfully migrated expenses
    const sampleMigrated = await sql`
      SELECT 
        e.id,
        e.description,
        e.amount,
        c.name as category_name,
        sf.name as source_fund_name,
        df.name as destination_fund_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      LEFT JOIN funds sf ON e.source_fund_id = sf.id
      LEFT JOIN funds df ON e.destination_fund_id = df.id
      WHERE e.source_fund_id IS NOT NULL
      ORDER BY e.date DESC
      LIMIT 5
    `;
    console.log('📋 Sample migrated expenses:', sampleMigrated);

    return NextResponse.json({
      success: true,
      message: 'Expense source fund migration completed successfully',
      results: {
        pre_migration: preMigrationStatus,
        post_migration: postMigrationStatus,
        migrated_count: migrationResult.length,
        unmigrated_count: unmigrated.length,
        sample_migrated: sampleMigrated,
        unmigrated_sample: unmigrated.slice(0, 5), // Show first 5 unmigrated
      },
    });
  } catch (error) {
    console.error('Error during expense source fund migration:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check migration status without running migration
    const [status] = await sql`
      SELECT * FROM check_expense_source_fund_migration_status()
    `;

    // Check if column exists
    const [columnExists] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'source_fund_id'
      ) as column_exists
    `;

    // Check if functions exist
    const functions = await sql`
      SELECT routine_name
      FROM information_schema.routines 
      WHERE routine_name IN (
        'validate_expense_source_fund',
        'get_category_source_funds',
        'check_expense_source_fund_migration_status'
      )
    `;

    return NextResponse.json({
      migration_status: status,
      column_exists: columnExists.column_exists,
      functions_created: functions.length,
      functions: functions.map((f: { routine_name: string }) => f.routine_name),
      ready_for_migration: !columnExists.column_exists,
    });
  } catch (error) {
    console.error('Error checking migration status:', error);
    return NextResponse.json(
      {
        error: 'Failed to check migration status',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
