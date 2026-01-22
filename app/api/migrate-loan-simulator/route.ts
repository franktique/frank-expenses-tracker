import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * POST /api/migrate-loan-simulator
 *
 * Migration endpoint to create the loan simulator tables:
 * - loan_scenarios: Store loan configurations
 * - loan_extra_payments: Store extra payment simulations
 *
 * Usage: Call this endpoint to initialize the loan simulator feature.
 * The migration is idempotent - safe to run multiple times.
 */
export async function POST(request: NextRequest) {
  try {
    // Check if tables already exist
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('loan_scenarios', 'loan_extra_payments')
    `;

    const tableNames = existingTables.map((t: any) => t.table_name);
    const scenariosExists = tableNames.includes("loan_scenarios");
    const extraPaymentsExists = tableNames.includes("loan_extra_payments");

    // Create loan_scenarios table
    if (!scenariosExists) {
      await sql`
        CREATE TABLE loan_scenarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          principal DECIMAL(15, 2) NOT NULL,
          interest_rate DECIMAL(5, 2) NOT NULL,
          term_months INTEGER NOT NULL,
          start_date DATE NOT NULL,
          currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT loan_scenarios_name_unique UNIQUE (name),
          CONSTRAINT loan_scenarios_currency_check CHECK (currency IN ('USD', 'COP', 'EUR', 'MXN', 'ARS', 'GBP'))
        )
      `;
      console.log("Created loan_scenarios table");
    } else {
      // Check if currency column exists, add it if not
      const columns = await sql`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'loan_scenarios'
        AND column_name = 'currency'
      `;

      if (columns.length === 0) {
        await sql`
          ALTER TABLE loan_scenarios
          ADD COLUMN currency VARCHAR(3) NOT NULL DEFAULT 'USD',
          ADD CONSTRAINT loan_scenarios_currency_check CHECK (currency IN ('USD', 'COP', 'EUR', 'MXN', 'ARS', 'GBP'))
        `;
        console.log("Added currency column to loan_scenarios table");
      }

      // Update principal column size if needed
      const principalColumn = await sql`
        SELECT numeric_precision
        FROM information_schema.columns
        WHERE table_name = 'loan_scenarios'
        AND column_name = 'principal'
      `;

      if (principalColumn.length > 0 && parseInt(principalColumn[0].numeric_precision) < 15) {
        await sql`
          ALTER TABLE loan_scenarios
          ALTER COLUMN principal TYPE DECIMAL(15, 2)
        `;
        console.log("Updated principal column to DECIMAL(15, 2)");
      }

      console.log("loan_scenarios table already exists");
    }

    // Create loan_extra_payments table
    if (!extraPaymentsExists) {
      await sql`
        CREATE TABLE loan_extra_payments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          loan_scenario_id UUID NOT NULL REFERENCES loan_scenarios(id) ON DELETE CASCADE,
          payment_number INTEGER NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          description VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT loan_extra_payments_unique_payment UNIQUE (loan_scenario_id, payment_number)
        )
      `;
      console.log("Created loan_extra_payments table");

      // Create index for faster queries
      await sql`
        CREATE INDEX idx_loan_extra_payments_scenario
        ON loan_extra_payments(loan_scenario_id)
      `;
      console.log("Created index on loan_extra_payments(loan_scenario_id)");
    } else {
      console.log("loan_extra_payments table already exists");
    }

    // Verify tables were created successfully
    const verification = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('loan_scenarios', 'loan_extra_payments')
      ORDER BY table_name
    `;

    const createdTables = verification.map((t: any) => t.table_name);

    return NextResponse.json({
      success: true,
      message: "Loan simulator migration completed successfully",
      tables: createdTables,
      created: {
        loan_scenarios: !scenariosExists,
        loan_extra_payments: !extraPaymentsExists,
      },
    });
  } catch (error) {
    console.error("Error during loan simulator migration:", error);

    // Handle duplicate table errors (likely from concurrent requests)
    if (error instanceof Error) {
      if (
        error.message.includes("already exists") ||
        error.message.includes("duplicate key")
      ) {
        // Verify tables exist despite the error
        const verification = await sql`
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('loan_scenarios', 'loan_extra_payments')
          ORDER BY table_name
        `;

        const createdTables = verification.map((t: any) => t.table_name);

        if (createdTables.length === 2) {
          return NextResponse.json({
            success: true,
            message: "Loan simulator tables already exist",
            tables: createdTables,
            note: "Tables were created by another concurrent request",
          });
        }
      }

      if (error.message.includes("connection")) {
        return NextResponse.json(
          {
            error: "Error de conexión con la base de datos",
            code: "DATABASE_CONNECTION_ERROR",
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor durante la migración",
        code: "INTERNAL_SERVER_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/migrate-loan-simulator
 *
 * Check the migration status of loan simulator tables
 */
export async function GET() {
  try {
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('loan_scenarios', 'loan_extra_payments')
      ORDER BY table_name
    `;

    const existingTables = tables.map((t: any) => t.table_name);

    // Get table counts if they exist
    let counts: any = {};
    if (existingTables.includes("loan_scenarios")) {
      const [scenarioCount] = await sql`
        SELECT COUNT(*) as count FROM loan_scenarios
      `;
      counts.scenarios = scenarioCount.count;
    }
    if (existingTables.includes("loan_extra_payments")) {
      const [paymentCount] = await sql`
        SELECT COUNT(*) as count FROM loan_extra_payments
      `;
      counts.extraPayments = paymentCount.count;
    }

    return NextResponse.json({
      success: true,
      tables: existingTables,
      counts,
      status:
        existingTables.length === 2 ? "fully_migrated" : "partially_migrated",
    });
  } catch (error) {
    console.error("Error checking loan simulator migration status:", error);

    return NextResponse.json(
      {
        error: "Error al verificar el estado de la migración",
        code: "VERIFICATION_ERROR",
      },
      { status: 500 }
    );
  }
}
