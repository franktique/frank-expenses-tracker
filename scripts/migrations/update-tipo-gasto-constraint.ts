import { sql } from '@/lib/db';

/**
 * Migration: Update tipo_gasto constraint to include "E" (Eventual)
 *
 * This migration updates the check constraint on the tipo_gasto column
 * to allow the new "E" (Eventual) expense type in addition to F, V, SF.
 */

export async function migrateUpdateTipoGastoConstraint() {
  try {
    console.log(
      'Starting migration: Update tipo_gasto constraint to include E (Eventual)'
    );

    // Check if column exists
    const columnCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'tipo_gasto'
      )
    `;

    const columnExists = columnCheckResult[0]?.exists || false;

    if (!columnExists) {
      console.log(
        'Column tipo_gasto does not exist. Skipping constraint update.'
      );
      return {
        success: true,
        message: 'Column does not exist, skipping migration',
      };
    }

    // Check if the old constraint exists
    const constraintCheckResult = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'categories'
      AND constraint_name = 'check_valid_tipo_gasto'
    `;

    const constraintExists = constraintCheckResult.length > 0;

    if (constraintExists) {
      // Drop the old constraint
      try {
        await sql`
          ALTER TABLE categories
          DROP CONSTRAINT check_valid_tipo_gasto
        `;
        console.log('✓ Successfully dropped old check constraint');
      } catch (dropError) {
        console.error('Error dropping constraint:', dropError);
        throw dropError;
      }
    }

    // Create the new constraint that includes E (Eventual)
    await sql`
      ALTER TABLE categories
      ADD CONSTRAINT check_valid_tipo_gasto
      CHECK (tipo_gasto IN ('F', 'V', 'SF', 'E'))
    `;

    console.log(
      '✓ Successfully added updated check constraint with E (Eventual)'
    );

    return {
      success: true,
      message: 'Constraint updated successfully',
      details: {
        constraint_updated: 'check_valid_tipo_gasto',
        old_values: ['F', 'V', 'SF'],
        new_values: ['F', 'V', 'SF', 'E'],
        description:
          'F = Fijo (Fixed), V = Variable, SF = Semi Fijo (Semi-Fixed), E = Eventual',
      },
    };
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateUpdateTipoGastoConstraint()
    .then((result) => {
      console.log('Migration result:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration error:', error);
      process.exit(1);
    });
}
