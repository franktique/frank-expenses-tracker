import { NextResponse } from "next/server";
import { sql, testConnection } from "@/lib/db";

/**
 * API endpoint to migrate the database schema for default_day feature
 *
 * This endpoint adds:
 * - default_day column to the categories table (stores preferred day 1-31)
 * - default_date column to the budgets table (stores calculated date for budget)
 *
 * It's idempotent - it can be called multiple times safely.
 *
 * GET /api/migrate-default-day
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

    const migratedColumns = [];
    const skippedColumns = [];

    // Check if default_day column already exists in categories
    const defaultDayCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'categories'
        AND column_name = 'default_day'
      )
    `;

    const defaultDayExists =
      defaultDayCheckResult.length > 0
        ? defaultDayCheckResult[0].exists
        : false;

    if (!defaultDayExists) {
      // Add the default_day column to categories table
      await sql`
        ALTER TABLE categories
        ADD COLUMN default_day INTEGER
      `;
      migratedColumns.push("default_day");
      console.log("✓ Added default_day column to categories table");

      // Add check constraint to ensure default_day is between 1-31 or NULL
      try {
        await sql`
          ALTER TABLE categories
          ADD CONSTRAINT check_valid_default_day
          CHECK(default_day IS NULL OR (default_day >= 1 AND default_day <= 31))
        `;
        console.log("✓ Added check constraint for default_day values (1-31 or NULL)");
      } catch (constraintError) {
        console.warn("Warning: Could not add constraint:", constraintError);
        // Don't fail the migration if constraint creation fails
      }

      // Create index on default_day for efficient filtering
      try {
        await sql`
          CREATE INDEX IF NOT EXISTS idx_categories_default_day
          ON categories(default_day)
        `;
        console.log("✓ Created index on categories.default_day");
      } catch (indexError) {
        console.warn("Warning: Could not create index:", indexError);
        // Don't fail the migration if index creation fails
      }
    } else {
      skippedColumns.push("default_day");
      console.log("ℹ Column default_day already exists in categories table");
    }

    // Check if default_date column already exists in budgets
    const defaultDateCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets'
        AND column_name = 'default_date'
      )
    `;

    const defaultDateExists =
      defaultDateCheckResult.length > 0
        ? defaultDateCheckResult[0].exists
        : false;

    if (!defaultDateExists) {
      // Add the default_date column to budgets table
      await sql`
        ALTER TABLE budgets
        ADD COLUMN default_date DATE
      `;
      migratedColumns.push("default_date");
      console.log("✓ Added default_date column to budgets table");

      // Create index on default_date for efficient filtering
      try {
        await sql`
          CREATE INDEX IF NOT EXISTS idx_budgets_default_date
          ON budgets(default_date)
        `;
        console.log("✓ Created index on budgets.default_date");
      } catch (indexError) {
        console.warn("Warning: Could not create index:", indexError);
        // Don't fail the migration if index creation fails
      }
    } else {
      skippedColumns.push("default_date");
      console.log("ℹ Column default_date already exists in budgets table");
    }

    // Determine response based on migration status
    if (migratedColumns.length === 0) {
      return NextResponse.json({
        success: true,
        message: "All columns already exist",
        skipped: true,
        details: {
          skipped_columns: skippedColumns,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      details: {
        migrated_columns: migratedColumns,
        skipped_columns: skippedColumns,
        default_day_info: {
          column: "categories.default_day",
          type: "INTEGER",
          constraint: "1-31 or NULL",
          description: "Preferred day of month for category expenses (1-31)",
        },
        default_date_info: {
          column: "budgets.default_date",
          type: "DATE",
          description:
            "Calculated date based on category default_day and budget period",
        },
        note: "Use /api/categories/{id} to set default_day for a category. Budget default_dates will be automatically calculated when category is updated.",
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
