import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting estudio grouper payment methods migration...');

    // Step 1: Add payment_methods column if it doesn't exist
    await sql`
      ALTER TABLE estudio_groupers 
      ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT NULL
    `;
    console.log('✅ Added payment_methods column to estudio_groupers table');

    // Step 2: Add constraint validation for payment method values
    await sql`
      ALTER TABLE estudio_groupers 
      ADD CONSTRAINT IF NOT EXISTS check_payment_methods 
      CHECK (
        payment_methods IS NULL OR 
        (payment_methods <@ ARRAY['cash', 'credit', 'debit']::text[] AND array_length(payment_methods, 1) > 0)
      )
    `;
    console.log('✅ Added payment methods validation constraint');

    // Step 3: Create GIN index for efficient array querying
    await sql`
      CREATE INDEX IF NOT EXISTS idx_estudio_groupers_payment_methods 
      ON estudio_groupers USING GIN(payment_methods)
    `;
    console.log('✅ Created GIN index for payment methods');

    // Step 4: Add column comment for documentation
    await sql`
      COMMENT ON COLUMN estudio_groupers.payment_methods IS 'Array of payment methods to include for this agrupador (cash, credit, debit). NULL means all methods are included.'
    `;
    console.log('✅ Added column documentation');

    // Step 5: Create helper function to validate payment method arrays
    await sql`
      CREATE OR REPLACE FUNCTION validate_payment_methods(methods TEXT[])
      RETURNS BOOLEAN AS $func$
      DECLARE
        valid_methods TEXT[] := ARRAY['cash', 'credit', 'debit'];
        method TEXT;
      BEGIN
        -- NULL is valid (means all methods)
        IF methods IS NULL THEN
          RETURN TRUE;
        END IF;
        
        -- Empty array is not valid
        IF array_length(methods, 1) IS NULL OR array_length(methods, 1) = 0 THEN
          RETURN FALSE;
        END IF;
        
        -- Check each method is valid
        FOREACH method IN ARRAY methods
        LOOP
          IF NOT (method = ANY(valid_methods)) THEN
            RETURN FALSE;
          END IF;
        END LOOP;
        
        RETURN TRUE;
      END;
      $func$ LANGUAGE plpgsql
    `;
    console.log('✅ Created payment methods validation function');

    // Step 6: Create function to get payment method filter for dashboard queries
    await sql`
      CREATE OR REPLACE FUNCTION get_payment_method_filter(
        p_estudio_id INTEGER,
        p_grouper_id INTEGER
      ) RETURNS TEXT[] AS $func$
      DECLARE
        configured_methods TEXT[];
      BEGIN
        -- Get configured payment methods for this estudio-grouper combination
        SELECT eg.payment_methods INTO configured_methods
        FROM estudio_groupers eg
        WHERE eg.estudio_id = p_estudio_id 
        AND eg.grouper_id = p_grouper_id;
        
        -- Return configured methods, or NULL if not found (which means all methods)
        RETURN configured_methods;
      END;
      $func$ LANGUAGE plpgsql
    `;
    console.log('✅ Created payment method filter function');

    // Step 7: Create function to check if expense matches payment method filter
    await sql`
      CREATE OR REPLACE FUNCTION expense_matches_payment_filter(
        p_expense_payment_method TEXT,
        p_filter_methods TEXT[]
      ) RETURNS BOOLEAN AS $func$
      BEGIN
        -- If filter is NULL, include all payment methods
        IF p_filter_methods IS NULL THEN
          RETURN TRUE;
        END IF;
        
        -- Check if expense payment method is in the filter array
        RETURN p_expense_payment_method = ANY(p_filter_methods);
      END;
      $func$ LANGUAGE plpgsql
    `;
    console.log('✅ Created expense payment filter matching function');

    // Step 8: Create function to check migration status and validate data
    await sql`
      CREATE OR REPLACE FUNCTION check_payment_methods_migration_status()
      RETURNS TABLE (
        total_estudio_groupers INTEGER,
        with_payment_methods INTEGER,
        without_payment_methods INTEGER,
        invalid_payment_methods INTEGER,
        migration_complete BOOLEAN
      ) AS $func$
      DECLARE
        total_count INTEGER;
        with_methods_count INTEGER;
        without_methods_count INTEGER;
        invalid_count INTEGER;
      BEGIN
        SELECT COUNT(*) INTO total_count FROM estudio_groupers;
        
        SELECT COUNT(*) INTO with_methods_count 
        FROM estudio_groupers 
        WHERE payment_methods IS NOT NULL;
        
        SELECT COUNT(*) INTO without_methods_count 
        FROM estudio_groupers 
        WHERE payment_methods IS NULL;
        
        SELECT COUNT(*) INTO invalid_count 
        FROM estudio_groupers 
        WHERE payment_methods IS NOT NULL 
        AND NOT validate_payment_methods(payment_methods);
        
        RETURN QUERY SELECT 
          total_count,
          with_methods_count,
          without_methods_count,
          invalid_count,
          (invalid_count = 0) as migration_complete;
      END;
      $func$ LANGUAGE plpgsql
    `;
    console.log('✅ Created migration status function');

    // Step 9: Get pre-migration status
    const [preMigrationStatus] = await sql`
      SELECT * FROM check_payment_methods_migration_status()
    `;
    console.log('📊 Pre-migration status:', preMigrationStatus);

    // Step 10: Validate existing data integrity
    const invalidData = await sql`
      SELECT 
        eg.estudio_id,
        eg.grouper_id,
        eg.payment_methods,
        e.name as estudio_name,
        g.name as grouper_name
      FROM estudio_groupers eg
      JOIN estudios e ON eg.estudio_id = e.id
      JOIN groupers g ON eg.grouper_id = g.id
      WHERE eg.payment_methods IS NOT NULL 
      AND NOT validate_payment_methods(eg.payment_methods)
      LIMIT 10
    `;

    if (invalidData.length > 0) {
      console.warn(
        `⚠️ Found ${invalidData.length} invalid payment method configurations:`,
        invalidData
      );
    }

    // Step 11: Get post-migration status
    const [postMigrationStatus] = await sql`
      SELECT * FROM check_payment_methods_migration_status()
    `;
    console.log('📊 Post-migration status:', postMigrationStatus);

    // Step 12: Sample of existing estudio-grouper relationships
    const sampleRelationships = await sql`
      SELECT 
        eg.estudio_id,
        eg.grouper_id,
        eg.percentage,
        eg.payment_methods,
        e.name as estudio_name,
        g.name as grouper_name
      FROM estudio_groupers eg
      JOIN estudios e ON eg.estudio_id = e.id
      JOIN groupers g ON eg.grouper_id = g.id
      ORDER BY eg.estudio_id, eg.grouper_id
      LIMIT 5
    `;
    console.log(
      '📋 Sample estudio-grouper relationships:',
      sampleRelationships
    );

    return NextResponse.json({
      success: true,
      message:
        'Estudio grouper payment methods migration completed successfully',
      results: {
        pre_migration: preMigrationStatus,
        post_migration: postMigrationStatus,
        invalid_data_count: invalidData.length,
        sample_relationships: sampleRelationships,
        invalid_data_sample: invalidData.slice(0, 5), // Show first 5 invalid entries
      },
    });
  } catch (error) {
    console.error(
      'Error during estudio grouper payment methods migration:',
      error
    );

    // Attempt rollback on error
    try {
      console.log('Attempting rollback...');
      await rollbackMigration();
      console.log('✅ Rollback completed successfully');
    } catch (rollbackError) {
      console.error('❌ Rollback failed:', rollbackError);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Migration failed',
        details: (error as Error).message,
        rollback_attempted: true,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check migration status without running migration
    const [status] = await sql`
      SELECT * FROM check_payment_methods_migration_status()
    `;

    // Check if column exists
    const [columnExists] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'estudio_groupers' AND column_name = 'payment_methods'
      ) as column_exists
    `;

    // Check if constraint exists
    const [constraintExists] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'estudio_groupers' AND constraint_name = 'check_payment_methods'
      ) as constraint_exists
    `;

    // Check if index exists
    const [indexExists] = await sql`
      SELECT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'estudio_groupers' AND indexname = 'idx_estudio_groupers_payment_methods'
      ) as index_exists
    `;

    // Check if functions exist
    const functions = await sql`
      SELECT routine_name
      FROM information_schema.routines 
      WHERE routine_name IN (
        'validate_payment_methods',
        'get_payment_method_filter',
        'expense_matches_payment_filter',
        'check_payment_methods_migration_status'
      )
    `;

    return NextResponse.json({
      migration_status: status,
      column_exists: columnExists.column_exists,
      constraint_exists: constraintExists.constraint_exists,
      index_exists: indexExists.index_exists,
      functions_created: functions.length,
      functions: functions.map((f: { routine_name: string }) => f.routine_name),
      ready_for_migration: !columnExists.column_exists,
      migration_complete:
        columnExists.column_exists &&
        constraintExists.constraint_exists &&
        indexExists.index_exists &&
        functions.length === 4,
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

export async function DELETE() {
  try {
    console.log(
      'Starting estudio grouper payment methods migration rollback...'
    );

    await rollbackMigration();

    console.log('✅ Rollback completed successfully');

    return NextResponse.json({
      success: true,
      message:
        'Estudio grouper payment methods migration rollback completed successfully',
    });
  } catch (error) {
    console.error('Error during rollback:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Rollback failed',
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

async function rollbackMigration() {
  // Step 1: Drop helper functions
  await sql`DROP FUNCTION IF EXISTS validate_payment_methods(TEXT[])`;
  console.log('✅ Dropped validate_payment_methods function');

  await sql`DROP FUNCTION IF EXISTS get_payment_method_filter(INTEGER, INTEGER)`;
  console.log('✅ Dropped get_payment_method_filter function');

  await sql`DROP FUNCTION IF EXISTS expense_matches_payment_filter(TEXT, TEXT[])`;
  console.log('✅ Dropped expense_matches_payment_filter function');

  await sql`DROP FUNCTION IF EXISTS check_payment_methods_migration_status()`;
  console.log('✅ Dropped check_payment_methods_migration_status function');

  // Step 2: Drop the GIN index
  await sql`DROP INDEX IF EXISTS idx_estudio_groupers_payment_methods`;
  console.log('✅ Dropped GIN index');

  // Step 3: Drop the constraint
  await sql`ALTER TABLE estudio_groupers DROP CONSTRAINT IF EXISTS check_payment_methods`;
  console.log('✅ Dropped payment methods constraint');

  // Step 4: Drop the payment_methods column
  await sql`ALTER TABLE estudio_groupers DROP COLUMN IF EXISTS payment_methods`;
  console.log('✅ Dropped payment_methods column');
}
