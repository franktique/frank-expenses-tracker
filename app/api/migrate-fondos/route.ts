import { NextResponse } from "next/server";
import { sql, testConnection } from "@/lib/db";

export async function POST() {
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

    // Begin transaction for atomic migration
    await sql`BEGIN`;

    try {
      // Step 1: Create funds table
      await sql`
        CREATE TABLE IF NOT EXISTS funds (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          initial_balance DECIMAL(10,2) DEFAULT 0,
          current_balance DECIMAL(10,2) DEFAULT 0,
          start_date DATE NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `;
      console.log("Funds table created or already exists");

      // Step 2: Create default fund 'Disponible' if it doesn't exist
      const existingDefaultFund = await sql`
        SELECT id FROM funds WHERE name = 'Disponible'
      `;

      let defaultFundId: string;
      if (existingDefaultFund.length === 0) {
        const defaultFund = await sql`
          INSERT INTO funds (name, description, initial_balance, start_date)
          VALUES ('Disponible', 'Fondo por defecto para categorías sin asignación específica', 0, CURRENT_DATE)
          RETURNING id
        `;
        defaultFundId = defaultFund[0].id;
        console.log(
          "Default fund 'Disponible' created with ID:",
          defaultFundId
        );
      } else {
        defaultFundId = existingDefaultFund[0].id;
        console.log(
          "Default fund 'Disponible' already exists with ID:",
          defaultFundId
        );
      }

      // Step 3: Add fund_id column to categories table if it doesn't exist
      const categoriesColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'fund_id'
      `;

      if (categoriesColumns.length === 0) {
        await sql`
          ALTER TABLE categories 
          ADD COLUMN fund_id UUID REFERENCES funds(id)
        `;
        console.log("Added fund_id column to categories table");

        // Update existing categories to reference the default fund
        await sql`
          UPDATE categories 
          SET fund_id = ${defaultFundId} 
          WHERE fund_id IS NULL
        `;
        console.log("Updated existing categories to reference default fund");
      } else {
        console.log("fund_id column already exists in categories table");
      }

      // Step 4: Add fund_id column to incomes table if it doesn't exist
      const incomesColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incomes' AND column_name = 'fund_id'
      `;

      if (incomesColumns.length === 0) {
        await sql`
          ALTER TABLE incomes 
          ADD COLUMN fund_id UUID REFERENCES funds(id)
        `;
        console.log("Added fund_id column to incomes table");

        // Update existing incomes to reference the default fund
        await sql`
          UPDATE incomes 
          SET fund_id = ${defaultFundId} 
          WHERE fund_id IS NULL
        `;
        console.log("Updated existing incomes to reference default fund");
      } else {
        console.log("fund_id column already exists in incomes table");
      }

      // Step 5: Add destination_fund_id column to expenses table if it doesn't exist
      const expensesColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'destination_fund_id'
      `;

      if (expensesColumns.length === 0) {
        await sql`
          ALTER TABLE expenses 
          ADD COLUMN destination_fund_id UUID REFERENCES funds(id)
        `;
        console.log("Added destination_fund_id column to expenses table");
      } else {
        console.log(
          "destination_fund_id column already exists in expenses table"
        );
      }

      // Step 6: Create indexes for better performance
      await sql`
        CREATE INDEX IF NOT EXISTS idx_categories_fund_id ON categories(fund_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_incomes_fund_id ON incomes(fund_id)
      `;
      await sql`
        CREATE INDEX IF NOT EXISTS idx_expenses_destination_fund_id ON expenses(destination_fund_id)
      `;
      console.log("Created indexes for fund-related columns");

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: "Fondos migration completed successfully",
        defaultFundId: defaultFundId,
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error("Error during fondos migration:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}

// Rollback endpoint for migration
export async function DELETE() {
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

    // Begin transaction for atomic rollback
    await sql`BEGIN`;

    try {
      // Step 1: Remove fund-related columns from expenses table
      const expensesColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'expenses' AND column_name = 'destination_fund_id'
      `;

      if (expensesColumns.length > 0) {
        await sql`
          ALTER TABLE expenses 
          DROP COLUMN destination_fund_id
        `;
        console.log("Removed destination_fund_id column from expenses table");
      }

      // Step 2: Remove fund-related columns from incomes table
      const incomesColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'incomes' AND column_name = 'fund_id'
      `;

      if (incomesColumns.length > 0) {
        await sql`
          ALTER TABLE incomes 
          DROP COLUMN fund_id
        `;
        console.log("Removed fund_id column from incomes table");
      }

      // Step 3: Remove fund-related columns from categories table
      const categoriesColumns = await sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'fund_id'
      `;

      if (categoriesColumns.length > 0) {
        await sql`
          ALTER TABLE categories 
          DROP COLUMN fund_id
        `;
        console.log("Removed fund_id column from categories table");
      }

      // Step 4: Drop funds table
      await sql`
        DROP TABLE IF EXISTS funds CASCADE
      `;
      console.log("Dropped funds table");

      // Step 5: Drop indexes
      await sql`
        DROP INDEX IF EXISTS idx_categories_fund_id
      `;
      await sql`
        DROP INDEX IF EXISTS idx_incomes_fund_id
      `;
      await sql`
        DROP INDEX IF EXISTS idx_expenses_destination_fund_id
      `;
      console.log("Dropped fund-related indexes");

      // Commit transaction
      await sql`COMMIT`;

      return NextResponse.json({
        success: true,
        message: "Fondos migration rollback completed successfully",
      });
    } catch (error) {
      // Rollback transaction on error
      await sql`ROLLBACK`;
      throw error;
    }
  } catch (error) {
    console.error("Error during fondos migration rollback:", error);
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
