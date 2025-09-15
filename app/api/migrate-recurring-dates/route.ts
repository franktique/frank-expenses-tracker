import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST() {
  try {
    // Check and add recurring_date column to categories
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'categories' AND column_name = 'recurring_date') THEN
          
          ALTER TABLE categories ADD COLUMN recurring_date INTEGER;
          
          ALTER TABLE categories ADD CONSTRAINT recurring_date_check 
          CHECK (recurring_date IS NULL OR (recurring_date >= 1 AND recurring_date <= 31));
          
          RAISE NOTICE 'Added recurring_date column to categories table';
        END IF;
      END $$;
    `;

    // Check and add expected_date column to budgets
    await sql`
      DO $$ 
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                       WHERE table_name = 'budgets' AND column_name = 'expected_date') THEN
          
          ALTER TABLE budgets ADD COLUMN expected_date DATE;
          
          RAISE NOTICE 'Added expected_date column to budgets table';
        END IF;
      END $$;
    `;

    // Create indexes
    await sql`
      CREATE INDEX IF NOT EXISTS idx_categories_recurring_date ON categories(recurring_date) WHERE recurring_date IS NOT NULL;
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_budgets_expected_date ON budgets(expected_date) WHERE expected_date IS NOT NULL;
    `;

    // Add comments
    await sql`
      COMMENT ON COLUMN categories.recurring_date IS 'Optional day of month (1-31) when this category expense typically occurs';
    `;

    await sql`
      COMMENT ON COLUMN budgets.expected_date IS 'Expected date for the budget, auto-populated from category recurring_date';
    `;

    return NextResponse.json({
      success: true,
      message: "Recurring dates migration completed successfully",
    });
  } catch (error) {
    console.error("Error running recurring dates migration:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Migration failed",
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}