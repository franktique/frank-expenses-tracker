import { sql } from "@/lib/db";

/**
 * Rollback: Remove tipo_gasto column from categories table
 *
 * This rollback removes the tipo_gasto column that was added by the
 * add-tipo-gasto migration. Use this if you need to revert the changes.
 */

export async function rollbackRemoveTipoGasto() {
  try {
    console.log("Starting rollback: Remove tipo_gasto column from categories table");

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
      console.log("Column tipo_gasto does not exist. Skipping rollback.");
      return { success: true, message: "Column does not exist" };
    }

    // First, drop the check constraint if it exists
    try {
      await sql`
        ALTER TABLE categories
        DROP CONSTRAINT IF EXISTS check_valid_tipo_gasto
      `;
      console.log("✓ Successfully dropped check constraint");
    } catch (constraintError) {
      console.warn("Warning: Could not drop constraint (may not exist):", constraintError);
    }

    // Drop the column
    await sql`
      ALTER TABLE categories
      DROP COLUMN tipo_gasto
    `;

    console.log("✓ Successfully removed tipo_gasto column from categories table");

    return {
      success: true,
      message: "Rollback completed successfully",
      details: {
        column_removed: "tipo_gasto",
      },
    };
  } catch (error) {
    console.error("Rollback failed:", error);
    throw error;
  }
}

// Run rollback if executed directly
if (require.main === module) {
  rollbackRemoveTipoGasto()
    .then((result) => {
      console.log("Rollback result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Rollback error:", error);
      process.exit(1);
    });
}
