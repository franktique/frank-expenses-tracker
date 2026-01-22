import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  CreateRateComparisonSchema,
  INVEST_ERROR_MESSAGES,
  type RateComparison,
} from "@/types/invest-simulator";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/invest-scenarios/[id]/rate-comparisons
 *
 * Get all rate comparisons for an investment scenario
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if scenario exists
    const [scenario] = await sql`
      SELECT id FROM investment_scenarios WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get rate comparisons
    const comparisons = await sql`
      SELECT id, investment_scenario_id, rate, label, created_at
      FROM investment_rate_comparisons
      WHERE investment_scenario_id = ${id}
      ORDER BY rate ASC
    `;

    const result: RateComparison[] = comparisons.map((row: any) => ({
      id: row.id,
      investmentScenarioId: row.investment_scenario_id,
      rate: parseFloat(row.rate),
      label: row.label,
      createdAt: row.created_at,
    }));

    return NextResponse.json({
      rateComparisons: result,
      totalCount: result.length,
    });
  } catch (error) {
    console.error("Error fetching rate comparisons:", error);

    // Check if tables don't exist
    if (
      error instanceof Error &&
      (error.message.includes('relation "investment_scenarios" does not exist') ||
        error.message.includes('relation "investment_rate_comparisons" does not exist'))
    ) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: "TABLES_NOT_FOUND",
          migrationEndpoint: "/api/migrate-invest-simulator",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Error al obtener comparaciones de tasas",
        code: "INTERNAL_SERVER_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invest-scenarios/[id]/rate-comparisons
 *
 * Add a new rate comparison to an investment scenario
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = CreateRateComparisonSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos de entrada inválidos",
          code: "VALIDATION_ERROR",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { rate, label } = validation.data;

    // Check if scenario exists
    const [scenario] = await sql`
      SELECT id, annual_rate FROM investment_scenarios WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Check if this rate is the same as the base rate
    const baseRate = parseFloat(scenario.annual_rate);
    if (Math.abs(rate - baseRate) < 0.0001) {
      return NextResponse.json(
        {
          error: "No puede agregar la tasa base como comparación",
          code: "INVALID_RATE",
        },
        { status: 400 }
      );
    }

    // Check for duplicate rate
    const [duplicate] = await sql`
      SELECT id FROM investment_rate_comparisons
      WHERE investment_scenario_id = ${id}
      AND ABS(rate - ${rate}) < 0.0001
    `;

    if (duplicate) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.DUPLICATE_RATE,
          code: "DUPLICATE_RATE",
        },
        { status: 409 }
      );
    }

    // Insert new rate comparison
    const [comparison] = await sql`
      INSERT INTO investment_rate_comparisons (
        investment_scenario_id,
        rate,
        label
      )
      VALUES (
        ${id},
        ${rate},
        ${label ?? null}
      )
      RETURNING id, investment_scenario_id, rate, label, created_at
    `;

    const result: RateComparison = {
      id: comparison.id,
      investmentScenarioId: comparison.investment_scenario_id,
      rate: parseFloat(comparison.rate),
      label: comparison.label,
      createdAt: comparison.created_at,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating rate comparison:", error);

    // Check if tables don't exist
    if (
      error instanceof Error &&
      (error.message.includes('relation "investment_scenarios" does not exist') ||
        error.message.includes('relation "investment_rate_comparisons" does not exist'))
    ) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: "TABLES_NOT_FOUND",
          migrationEndpoint: "/api/migrate-invest-simulator",
        },
        { status: 404 }
      );
    }

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      (error.message.includes("unique constraint") ||
        error.message.includes("duplicate key"))
    ) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.DUPLICATE_RATE,
          code: "DUPLICATE_RATE",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: "Error al crear comparación de tasa",
        code: "INTERNAL_SERVER_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invest-scenarios/[id]/rate-comparisons
 *
 * Delete a rate comparison by rate value (query param: ?rate=X)
 * Or delete all rate comparisons if no rate specified
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const rateParam = searchParams.get("rate");
    const comparisonId = searchParams.get("comparisonId");

    // Check if scenario exists
    const [scenario] = await sql`
      SELECT id FROM investment_scenarios WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: "NOT_FOUND",
        },
        { status: 404 }
      );
    }

    if (comparisonId) {
      // Delete specific comparison by ID
      const [deleted] = await sql`
        DELETE FROM investment_rate_comparisons
        WHERE id = ${comparisonId}
        AND investment_scenario_id = ${id}
        RETURNING id, rate
      `;

      if (!deleted) {
        return NextResponse.json(
          {
            error: INVEST_ERROR_MESSAGES.RATE_COMPARISON_NOT_FOUND,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Comparación de tasa ${deleted.rate}% eliminada`,
        deletedId: deleted.id,
      });
    } else if (rateParam) {
      // Delete by rate value
      const rate = parseFloat(rateParam);

      if (isNaN(rate)) {
        return NextResponse.json(
          {
            error: "Valor de tasa inválido",
            code: "INVALID_RATE",
          },
          { status: 400 }
        );
      }

      const [deleted] = await sql`
        DELETE FROM investment_rate_comparisons
        WHERE investment_scenario_id = ${id}
        AND ABS(rate - ${rate}) < 0.0001
        RETURNING id, rate
      `;

      if (!deleted) {
        return NextResponse.json(
          {
            error: INVEST_ERROR_MESSAGES.RATE_COMPARISON_NOT_FOUND,
            code: "NOT_FOUND",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `Comparación de tasa ${deleted.rate}% eliminada`,
        deletedId: deleted.id,
      });
    } else {
      // Delete all comparisons for this scenario
      const deleted = await sql`
        DELETE FROM investment_rate_comparisons
        WHERE investment_scenario_id = ${id}
        RETURNING id
      `;

      return NextResponse.json({
        success: true,
        message: `${deleted.length} comparaciones eliminadas`,
        deletedCount: deleted.length,
      });
    }
  } catch (error) {
    console.error("Error deleting rate comparison:", error);

    // Check if tables don't exist
    if (
      error instanceof Error &&
      (error.message.includes('relation "investment_scenarios" does not exist') ||
        error.message.includes('relation "investment_rate_comparisons" does not exist'))
    ) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: "TABLES_NOT_FOUND",
          migrationEndpoint: "/api/migrate-invest-simulator",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: "Error al eliminar comparación de tasa",
        code: "INTERNAL_SERVER_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
