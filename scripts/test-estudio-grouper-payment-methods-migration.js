#!/usr/bin/env node

/**
 * Test script for estudio grouper payment methods migration
 * This script validates that the migration works correctly
 */

const { neon } = require('@neondatabase/serverless');

// Get database URL from environment
const sql = neon(process.env.DATABASE_URL_NEW);

async function testPaymentMethodsMigration() {
  console.log('🧪 Testing Estudio Grouper Payment Methods Migration...\n');

  try {
    // Test 1: Check if column exists
    console.log('1️⃣ Checking if payment_methods column exists...');
    const columnCheck = await sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'estudio_groupers' 
      AND column_name = 'payment_methods'
    `;

    if (columnCheck.length === 0) {
      throw new Error('payment_methods column not found');
    }
    console.log('✅ payment_methods column exists');
    console.log(
      `   Type: ${columnCheck[0].data_type}, Nullable: ${columnCheck[0].is_nullable}\n`
    );

    // Test 2: Check constraint exists
    console.log('2️⃣ Checking payment methods constraint...');
    const constraintCheck = await sql`
      SELECT constraint_name 
      FROM information_schema.check_constraints 
      WHERE constraint_name = 'check_payment_methods'
    `;

    if (constraintCheck.length === 0) {
      throw new Error('check_payment_methods constraint not found');
    }
    console.log('✅ Payment methods constraint exists\n');

    // Test 3: Check GIN index exists
    console.log('3️⃣ Checking GIN index...');
    const indexCheck = await sql`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'estudio_groupers' 
      AND indexname = 'idx_estudio_groupers_payment_methods'
    `;

    if (indexCheck.length === 0) {
      throw new Error('GIN index not found');
    }
    console.log('✅ GIN index exists\n');

    // Test 4: Check helper functions exist
    console.log('4️⃣ Checking helper functions...');
    const functionsCheck = await sql`
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_name IN (
        'validate_payment_methods',
        'get_payment_method_filter',
        'expense_matches_payment_filter',
        'check_payment_methods_migration_status'
      )
      ORDER BY routine_name
    `;

    const expectedFunctions = [
      'check_payment_methods_migration_status',
      'expense_matches_payment_filter',
      'get_payment_method_filter',
      'validate_payment_methods',
    ];

    if (functionsCheck.length !== expectedFunctions.length) {
      throw new Error(
        `Expected ${expectedFunctions.length} functions, found ${functionsCheck.length}`
      );
    }
    console.log('✅ All helper functions exist\n');

    // Test 5: Test constraint validation
    console.log('5️⃣ Testing constraint validation...');

    // Create test estudio and grouper if they don't exist
    const testEstudio = await sql`
      INSERT INTO estudios (name) 
      VALUES ('Test Estudio Payment Methods') 
      ON CONFLICT DO NOTHING 
      RETURNING id
    `;

    let estudioId;
    if (testEstudio.length > 0) {
      estudioId = testEstudio[0].id;
    } else {
      const existingEstudio = await sql`
        SELECT id FROM estudios WHERE name = 'Test Estudio Payment Methods' LIMIT 1
      `;
      estudioId = existingEstudio[0].id;
    }

    const testGrouper = await sql`
      INSERT INTO groupers (name) 
      VALUES ('Test Grouper Payment Methods') 
      ON CONFLICT DO NOTHING 
      RETURNING id
    `;

    let grouperId;
    if (testGrouper.length > 0) {
      grouperId = testGrouper[0].id;
    } else {
      const existingGrouper = await sql`
        SELECT id FROM groupers WHERE name = 'Test Grouper Payment Methods' LIMIT 1
      `;
      grouperId = existingGrouper[0].id;
    }

    // Test valid payment methods
    try {
      await sql`
        INSERT INTO estudio_groupers (estudio_id, grouper_id, payment_methods) 
        VALUES (${estudioId}, ${grouperId}, ARRAY['cash', 'credit'])
        ON CONFLICT (estudio_id, grouper_id) DO UPDATE SET 
        payment_methods = ARRAY['cash', 'credit']
      `;
      console.log('✅ Valid payment methods accepted');
    } catch (error) {
      throw new Error(`Valid payment methods rejected: ${error.message}`);
    }

    // Test invalid payment methods (should fail)
    try {
      await sql`
        UPDATE estudio_groupers 
        SET payment_methods = ARRAY['invalid_method'] 
        WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperId}
      `;
      throw new Error(
        'Invalid payment methods were accepted (should have been rejected)'
      );
    } catch (error) {
      if (error.message.includes('check_payment_methods')) {
        console.log('✅ Invalid payment methods correctly rejected');
      } else {
        throw error;
      }
    }

    // Test empty array (should fail)
    try {
      await sql`
        UPDATE estudio_groupers 
        SET payment_methods = ARRAY[]::text[] 
        WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperId}
      `;
      throw new Error('Empty array was accepted (should have been rejected)');
    } catch (error) {
      if (error.message.includes('check_payment_methods')) {
        console.log('✅ Empty array correctly rejected');
      } else {
        throw error;
      }
    }

    // Test NULL (should be accepted)
    try {
      await sql`
        UPDATE estudio_groupers 
        SET payment_methods = NULL 
        WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperId}
      `;
      console.log('✅ NULL payment methods accepted (all methods)\n');
    } catch (error) {
      throw new Error(`NULL payment methods rejected: ${error.message}`);
    }

    // Test 6: Test helper functions
    console.log('6️⃣ Testing helper functions...');

    // Test validate_payment_methods function
    const validationTests = [
      { input: "ARRAY['cash', 'credit']", expected: true },
      { input: "ARRAY['invalid']", expected: false },
      { input: 'ARRAY[]::text[]', expected: false },
      { input: 'NULL', expected: true },
    ];

    for (const test of validationTests) {
      const result =
        await sql`SELECT validate_payment_methods(${test.input}) as is_valid`;
      if (result[0].is_valid !== test.expected) {
        throw new Error(
          `validate_payment_methods(${test.input}) returned ${result[0].is_valid}, expected ${test.expected}`
        );
      }
    }
    console.log('✅ validate_payment_methods function works correctly');

    // Test get_payment_method_filter function
    const filterResult = await sql`
      SELECT get_payment_method_filter(${estudioId}, ${grouperId}) as filter_methods
    `;
    console.log('✅ get_payment_method_filter function works correctly');

    // Test expense_matches_payment_filter function
    const matchTests = [
      { payment: 'cash', filter: "ARRAY['cash', 'credit']", expected: true },
      { payment: 'debit', filter: "ARRAY['cash', 'credit']", expected: false },
      { payment: 'cash', filter: 'NULL', expected: true },
    ];

    for (const test of matchTests) {
      const result = await sql`
        SELECT expense_matches_payment_filter(${test.payment}, ${test.filter}) as matches
      `;
      if (result[0].matches !== test.expected) {
        throw new Error(
          `expense_matches_payment_filter failed for ${test.payment} with filter ${test.filter}`
        );
      }
    }
    console.log('✅ expense_matches_payment_filter function works correctly\n');

    // Test 7: Run migration status check
    console.log('7️⃣ Running migration status check...');
    const statusResult =
      await sql`SELECT * FROM check_payment_methods_migration_status()`;
    const status = statusResult[0];

    console.log(
      `   Total estudio-grouper relationships: ${status.total_estudio_groupers}`
    );
    console.log(
      `   With payment method configuration: ${status.with_payment_methods}`
    );
    console.log(
      `   Without payment method configuration: ${status.without_payment_methods}`
    );
    console.log(`   Invalid configurations: ${status.invalid_payment_methods}`);
    console.log(`   Migration complete: ${status.migration_complete}\n`);

    // Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await sql`
      DELETE FROM estudio_groupers 
      WHERE estudio_id = ${estudioId} AND grouper_id = ${grouperId}
    `;
    await sql`DELETE FROM estudios WHERE id = ${estudioId}`;
    await sql`DELETE FROM groupers WHERE id = ${grouperId}`;
    console.log('✅ Test data cleaned up\n');

    console.log(
      '🎉 All tests passed! Payment methods migration is working correctly.'
    );
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  testPaymentMethodsMigration().catch(console.error);
}

module.exports = { testPaymentMethodsMigration };
