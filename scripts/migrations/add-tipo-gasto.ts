import { sql } from "@/lib/db";

/**
 * Migration: Add tipo_gasto column to categories table
 *
 * This migration adds a new column to track expense type classification:
 * - F (Fijo) - Fixed expenses
 * - V (Variable) - Variable expenses
 * - SF (Semi Fijo) - Semi-fixed expenses
 *
 * The column is optional (NULL default) for backward compatibility.
 */

export async function migrateAddTipoGasto() {
  try {
    console.log("Starting migration: Add tipo_gasto column to categories table");

    // Check if column already exists
    const columnCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'tipo_gasto'
      )
    `;

    const columnExists = columnCheckResult[0]?.exists || false;

    if (columnExists) {
      console.log("Column tipo_gasto already exists. Skipping migration.");
      return { success: true, message: "Column already exists" };
    }

    // Add the tipo_gasto column with default value 'F' (Fijo)
    await sql`
      ALTER TABLE categories
      ADD COLUMN tipo_gasto VARCHAR(2) DEFAULT 'F'
    `;

    console.log("✓ Successfully added tipo_gasto column to categories table with default value 'F' (Fijo)");

    // Update any NULL values to 'F' (Fijo) for backward compatibility
    await sql`
      UPDATE categories
      SET tipo_gasto = 'F'
      WHERE tipo_gasto IS NULL
    `;

    console.log("✓ Successfully set default 'F' value for all existing categories");

    // Add check constraint to ensure only valid values are stored
    await sql`
      ALTER TABLE categories
      ADD CONSTRAINT check_valid_tipo_gasto
      CHECK (tipo_gasto IN ('F', 'V', 'SF', 'E'))
    `;

    console.log("✓ Successfully added check constraint for tipo_gasto values");

    return {
      success: true,
      message: "Migration completed successfully",
      details: {
        column_added: "tipo_gasto",
        type: "VARCHAR(2)",
        default: "NULL",
        valid_values: ["F", "V", "SF"],
      },
    };
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  }
}

// Run migration if executed directly
if (require.main === module) {
  migrateAddTipoGasto()
    .then((result) => {
      console.log("Migration result:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration error:", error);
      process.exit(1);
    });
}
