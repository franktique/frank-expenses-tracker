import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    // Check if tables already exist
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('interest_rate_scenarios')
    `;

    const scenariosExists = existingTables.some(
      (t: { table_name: string }) => t.table_name === "interest_rate_scenarios"
    );

    const createdTables: string[] = [];

    // Create interest_rate_scenarios table if it doesn't exist
    if (!scenariosExists) {
      await sql`
        CREATE TABLE interest_rate_scenarios (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          input_rate DECIMAL(12, 8) NOT NULL,
          input_rate_type VARCHAR(10) NOT NULL,
          notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT interest_rate_scenarios_name_unique UNIQUE (name),
          CONSTRAINT interest_rate_scenarios_type_check
            CHECK (input_rate_type IN ('EA', 'EM', 'ED', 'NM', 'NA')),
          CONSTRAINT interest_rate_scenarios_rate_check
            CHECK (input_rate >= 0 AND input_rate <= 10)
        )
      `;
      createdTables.push("interest_rate_scenarios");

      // Create index for faster lookups
      await sql`
        CREATE INDEX idx_interest_rate_scenarios_created_at
        ON interest_rate_scenarios(created_at DESC)
      `;
    }

    // Verify tables exist
    const verification = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('interest_rate_scenarios')
    `;

    const verifiedTables = verification.map((t: { table_name: string }) => t.table_name);

    return NextResponse.json({
      success: true,
      message: createdTables.length > 0
        ? `Tablas creadas: ${createdTables.join(", ")}`
        : "Las tablas ya existían",
      tables: verifiedTables,
      created: {
        interest_rate_scenarios: createdTables.includes("interest_rate_scenarios"),
      },
    });
  } catch (error) {
    console.error("Error in interest rate simulator migration:", error);

    // Handle specific error cases
    if (error instanceof Error) {
      // Table already exists (concurrent request)
      if (error.message.includes("already exists")) {
        return NextResponse.json({
          success: true,
          message: "Las tablas ya existían (creadas por otra solicitud)",
          tables: ["interest_rate_scenarios"],
          created: {
            interest_rate_scenarios: false,
          },
        });
      }

      // Connection error
      if (error.message.includes("connection")) {
        return NextResponse.json(
          {
            error: "Error de conexión a la base de datos",
            code: "CONNECTION_ERROR",
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error al ejecutar la migración",
        code: "MIGRATION_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Check table existence
    const existingTables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('interest_rate_scenarios')
    `;

    const tableNames = existingTables.map((t: { table_name: string }) => t.table_name);
    const scenariosExists = tableNames.includes("interest_rate_scenarios");

    // Get counts if tables exist
    let scenarioCount = 0;

    if (scenariosExists) {
      const [countResult] = await sql`
        SELECT COUNT(*) as count FROM interest_rate_scenarios
      `;
      scenarioCount = parseInt(countResult.count, 10);
    }

    // Determine migration status
    let status: "fully_migrated" | "not_migrated" | "partially_migrated";
    if (scenariosExists) {
      status = "fully_migrated";
    } else {
      status = "not_migrated";
    }

    return NextResponse.json({
      success: true,
      tables: tableNames,
      counts: {
        scenarios: scenarioCount,
      },
      status,
      migrationEndpoint: "/api/migrate-interest-rate-simulator",
    });
  } catch (error) {
    console.error("Error checking interest rate simulator migration status:", error);

    // If tables don't exist, return not_migrated status
    if (error instanceof Error && error.message.includes("does not exist")) {
      return NextResponse.json({
        success: true,
        tables: [],
        counts: { scenarios: 0 },
        status: "not_migrated",
        migrationEndpoint: "/api/migrate-interest-rate-simulator",
      });
    }

    return NextResponse.json(
      {
        error: "Error al verificar estado de migración",
        code: "CHECK_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
