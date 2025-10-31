import { NextResponse } from "next/server";
import { sql, testConnection } from "@/lib/db";

/**
 * API endpoint to update the tipo_gasto constraint to include "E" (Eventual)
 *
 * This endpoint updates the check constraint on the tipo_gasto column
 * to allow the new "E" (Eventual) expense type in addition to F, V, SF.
 *
 * GET /api/migrate-tipo-gasto-constraint
 */

export async function GET() {
  try {
    // First, test if we can connect to the database
    const connectionTest = await testConnection();

    if (!connectionTest.connected) {
      return NextResponse.json(
        {
          success: false,
          message: "Could not connect to the database: " + connectionTest.error,
        },
        { status: 500 }
      );
    }

    // Check if column exists
    const columnCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'tipo_gasto'
      )
    `;

    const columnExists =
      columnCheckResult.length > 0 ? columnCheckResult[0].exists : false;

    if (!columnExists) {
      return NextResponse.json({
        success: false,
        message:
          "Column tipo_gasto does not exist. Run /api/migrate-tipo-gasto first.",
        skipped: true,
      });
    }

    // Check if the old constraint exists
    const constraintCheckResult = await sql`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'categories'
      AND constraint_name = 'check_valid_tipo_gasto'
    `;

    const constraintExists = constraintCheckResult.length > 0;

    if (!constraintExists) {
      return NextResponse.json({
        success: true,
        message: "Constraint does not exist or already updated",
        skipped: true,
      });
    }

    // Drop the old constraint
    try {
      await sql`
        ALTER TABLE categories
        DROP CONSTRAINT check_valid_tipo_gasto
      `;

      console.log("✓ Dropped old check constraint");
    } catch (dropError) {
      console.error("Error dropping constraint:", dropError);
      throw dropError;
    }

    // Create the new constraint that includes E (Eventual)
    try {
      await sql`
        ALTER TABLE categories
        ADD CONSTRAINT check_valid_tipo_gasto
        CHECK (tipo_gasto IN ('F', 'V', 'SF', 'E'))
      `;

      console.log("✓ Created updated check constraint with E (Eventual)");
    } catch (createError) {
      console.error("Error creating constraint:", createError);
      throw createError;
    }

    return NextResponse.json({
      success: true,
      message: "Constraint updated successfully",
      details: {
        constraint_updated: "check_valid_tipo_gasto",
        old_values: ["F", "V", "SF"],
        new_values: ["F", "V", "SF", "E"],
        description:
          "F = Fijo (Fixed), V = Variable, SF = Semi Fijo (Semi-Fixed), E = Eventual",
      },
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Migration failed: " + (error as Error).message,
      },
      { status: 500 }
    );
  }
}
