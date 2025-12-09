import { NextResponse } from "next/server";
import { sql, testConnection } from "@/lib/db";

/**
 * API endpoint to migrate the database schema for recurring budgets feature
 *
 * This endpoint adds:
 * - recurrence_frequency column to the budgets table (weekly, bi-weekly, or NULL for one-time)
 * - recurrence_start_day column to the budgets table (1-31, first payment day)
 *
 * It's idempotent - it can be called multiple times safely.
 *
 * GET /api/migrate-recurring-budgets
 *
 * Rollback instructions:
 * Run: /scripts/rollback-recurring-budgets-migration.sql
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

    // Check if recurrence_frequency column already exists
    const frequencyCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets'
        AND column_name = 'recurrence_frequency'
      )
    `;

    const frequencyExists =
      frequencyCheckResult.length > 0
        ? frequencyCheckResult[0].exists
        : false;

    if (!frequencyExists) {
      // Add the recurrence_frequency column to budgets table
      await sql`
        ALTER TABLE budgets
        ADD COLUMN recurrence_frequency VARCHAR(20)
      `;
      migratedColumns.push("recurrence_frequency");
      console.log("✓ Added recurrence_frequency column to budgets table");

      // Add check constraint for valid frequency values
      try {
        await sql`
          ALTER TABLE budgets
          ADD CONSTRAINT budgets_recurrence_frequency_check
          CHECK (recurrence_frequency IS NULL OR recurrence_frequency IN ('weekly', 'bi-weekly'))
        `;
        console.log(
          "✓ Added check constraint for recurrence_frequency (NULL, weekly, bi-weekly)"
        );
      } catch (constraintError) {
        console.warn("Warning: Could not add constraint:", constraintError);
        // Don't fail the migration if constraint creation fails
      }

      // Create index on recurrence_frequency for efficient filtering
      try {
        await sql`
          CREATE INDEX IF NOT EXISTS idx_budgets_recurrence_frequency
          ON budgets(recurrence_frequency)
          WHERE recurrence_frequency IS NOT NULL
        `;
        console.log("✓ Created index on budgets.recurrence_frequency");
      } catch (indexError) {
        console.warn("Warning: Could not create index:", indexError);
        // Don't fail the migration if index creation fails
      }
    } else {
      skippedColumns.push("recurrence_frequency");
      console.log("ℹ Column recurrence_frequency already exists in budgets table");
    }

    // Check if recurrence_start_day column already exists
    const startDayCheckResult = await sql`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'budgets'
        AND column_name = 'recurrence_start_day'
      )
    `;

    const startDayExists =
      startDayCheckResult.length > 0
        ? startDayCheckResult[0].exists
        : false;

    if (!startDayExists) {
      // Add the recurrence_start_day column to budgets table
      await sql`
        ALTER TABLE budgets
        ADD COLUMN recurrence_start_day INTEGER
      `;
      migratedColumns.push("recurrence_start_day");
      console.log("✓ Added recurrence_start_day column to budgets table");

      // Add check constraint for recurrence_start_day (1-31 or NULL)
      try {
        await sql`
          ALTER TABLE budgets
          ADD CONSTRAINT budgets_recurrence_start_day_check
          CHECK (recurrence_start_day IS NULL OR (recurrence_start_day >= 1 AND recurrence_start_day <= 31))
        `;
        console.log(
          "✓ Added check constraint for recurrence_start_day (1-31 or NULL)"
        );
      } catch (constraintError) {
        console.warn("Warning: Could not add constraint:", constraintError);
        // Don't fail the migration if constraint creation fails
      }

      // Create index on recurrence_start_day for efficient filtering
      try {
        await sql`
          CREATE INDEX IF NOT EXISTS idx_budgets_recurrence_start_day
          ON budgets(recurrence_start_day)
          WHERE recurrence_start_day IS NOT NULL
        `;
        console.log("✓ Created index on budgets.recurrence_start_day");
      } catch (indexError) {
        console.warn("Warning: Could not create index:", indexError);
        // Don't fail the migration if index creation fails
      }
    } else {
      skippedColumns.push("recurrence_start_day");
      console.log("ℹ Column recurrence_start_day already exists in budgets table");
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
        recurrence_frequency_info: {
          column: "budgets.recurrence_frequency",
          type: "VARCHAR(20)",
          constraint: "NULL, 'weekly', or 'bi-weekly'",
          description:
            "NULL = one-time payment (default), weekly = every 7 days, bi-weekly = every 14 days",
        },
        recurrence_start_day_info: {
          column: "budgets.recurrence_start_day",
          type: "INTEGER",
          constraint: "1-31 or NULL",
          description:
            "Day of month for first payment. Subsequent payments calculated based on frequency.",
        },
        usage_example: {
          description:
            "For a $400 gasoline budget paid weekly starting on day 5, the system will automatically split it into 4 payments of $100 on days 5, 12, 19, and 26",
          api_call: "POST /api/budgets with recurrenceFrequency: 'weekly', recurrenceStartDay: 5",
        },
        note: "Existing budgets without recurrence will continue to work (backward compatible). The projected execution dashboard will automatically display split payments.",
      },
    });
  } catch (error) {
    console.error("Migration failed:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Migration failed: " + (error as Error).message,
        error: error instanceof Error ? error.stack : String(error),
      },
      { status: 500 }
    );
  }
}
