import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  CreateLoanScenarioSchema,
  LOAN_ERROR_MESSAGES,
} from "@/types/loan-simulator";

/**
 * GET /api/loan-scenarios
 *
 * Get all loan scenarios
 *
 * Query Parameters:
 * - sort: Field to sort by (name, created_at, updated_at)
 * - order: Sort order (asc, desc)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "created_at";
    const order = searchParams.get("order") || "desc";

    // Validate sort field
    const validSortFields = ["name", "created_at", "updated_at", "principal"];
    const sortField = validSortFields.includes(sort) ? sort : "created_at";

    // Validate order
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    // Use conditional query to avoid sql.unsafe()
    let scenarios;
    if (sortField === "created_at" && sortOrder === "ASC") {
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY created_at ASC
      `;
    } else if (sortField === "created_at" && sortOrder === "DESC") {
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY created_at DESC
      `;
    } else if (sortField === "updated_at" && sortOrder === "ASC") {
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY updated_at ASC
      `;
    } else if (sortField === "updated_at" && sortOrder === "DESC") {
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY updated_at DESC
      `;
    } else if (sortField === "name" && sortOrder === "ASC") {
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY name ASC
      `;
    } else if (sortField === "name" && sortOrder === "DESC") {
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY name DESC
      `;
    } else if (sortField === "principal" && sortOrder === "ASC") {
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY principal ASC
      `;
    } else {
      // Default: created_at DESC
      scenarios = await sql`
        SELECT id, name, principal, interest_rate as "interestRate", term_months as "termMonths", start_date as "startDate", currency, created_at as "createdAt", updated_at as "updatedAt"
        FROM loan_scenarios
        ORDER BY principal DESC
      `;
    }

    // Get extra payments count for each scenario
    const scenariosWithCounts = await Promise.all(
      scenarios.map(async (scenario: any) => {
        const [extraPaymentCount] = await sql`
          SELECT COUNT(*) as count
          FROM loan_extra_payments
          WHERE loan_scenario_id = ${scenario.id}
        `;
        return {
          ...scenario,
          extraPaymentsCount: parseInt(extraPaymentCount.count),
        };
      })
    );

    return NextResponse.json({
      scenarios: scenariosWithCounts,
      totalCount: scenariosWithCounts.length,
    });
  } catch (error) {
    console.error("Error fetching loan scenarios:", error);

    // Check if tables exist
    if (error instanceof Error) {
      if (error.message.includes('relation "loan_scenarios" does not exist')) {
        return NextResponse.json(
          {
            error: "Loan simulator tables not found. Please run the migration.",
            code: "TABLES_NOT_FOUND",
            migrationEndpoint: "/api/migrate-loan-simulator",
          },
          { status: 404 }
        );
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
        error: "Error interno del servidor al cargar los escenarios de préstamo",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/loan-scenarios
 *
 * Create a new loan scenario
 *
 * Request Body:
 * {
 *   "name": string,
 *   "principal": number,
 *   "interestRate": number,
 *   "termMonths": number,
 *   "startDate": string (ISO date)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validation = CreateLoanScenarioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, principal, interestRate, termMonths, startDate, currency } =
      validation.data;

    // Check for duplicate names
    const [duplicate] = await sql`
      SELECT id, name FROM loan_scenarios
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
      LIMIT 1
    `;

    if (duplicate) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.DUPLICATE_NAME,
          code: "DUPLICATE_NAME",
          existing: { id: duplicate.id, name: duplicate.name },
        },
        { status: 409 }
      );
    }

    // Insert new loan scenario
    const [scenario] = await sql`
      INSERT INTO loan_scenarios (
        name,
        principal,
        interest_rate,
        term_months,
        start_date,
        currency
      )
      VALUES (
        ${name.trim()},
        ${principal},
        ${interestRate},
        ${termMonths},
        ${startDate},
        ${currency || "USD"}
      )
      RETURNING *
    `;

    return NextResponse.json(scenario, { status: 201 });
  } catch (error) {
    console.error("Error creating loan scenario:", error);

    // Check if tables exist
    if (error instanceof Error) {
      if (
        error.message.includes('relation "loan_scenarios" does not exist') ||
        error.message.includes("loan_scenarios")
      ) {
        return NextResponse.json(
          {
            error: "Loan simulator tables not found. Please run the migration.",
            code: "TABLES_NOT_FOUND",
            migrationEndpoint: "/api/migrate-loan-simulator",
          },
          { status: 404 }
        );
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
        error: "Error interno del servidor al crear el escenario de préstamo",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
