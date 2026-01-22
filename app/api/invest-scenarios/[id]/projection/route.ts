import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  INVEST_ERROR_MESSAGES,
  type InvestmentProjectionResponse,
  type CompoundingFrequency,
} from "@/types/invest-simulator";
import {
  calculateInvestmentSummary,
  generateProjectionSchedule,
  generateMonthlySummarySchedule,
  compareRates,
} from "@/lib/invest-calculations";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/invest-scenarios/[id]/projection
 *
 * Get the full projection for an investment scenario including:
 * - Summary statistics
 * - Detailed period-by-period schedule
 * - Rate comparisons (if any exist)
 *
 * Query params:
 * - view: 'detailed' | 'monthly' (default: 'monthly')
 *   - 'detailed': Full period-by-period detail (can be large for daily compounding)
 *   - 'monthly': Monthly summary even for daily compounding (better for charts)
 * - includeComparisons: 'true' | 'false' (default: 'true')
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const view = searchParams.get("view") || "monthly";
    const includeComparisons = searchParams.get("includeComparisons") !== "false";

    // Get scenario from database
    const [scenario] = await sql`
      SELECT
        id,
        name,
        initial_amount,
        monthly_contribution,
        term_months,
        annual_rate,
        compounding_frequency,
        currency,
        created_at,
        updated_at
      FROM investment_scenarios
      WHERE id = ${id}
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

    // Parse scenario data
    const scenarioData = {
      initialAmount: parseFloat(scenario.initial_amount),
      monthlyContribution: parseFloat(scenario.monthly_contribution),
      termMonths: scenario.term_months as number,
      annualRate: parseFloat(scenario.annual_rate),
      compoundingFrequency: scenario.compounding_frequency as CompoundingFrequency,
    };

    // Calculate summary
    const summary = calculateInvestmentSummary(scenarioData);

    // Generate schedule based on view preference
    const schedule =
      view === "detailed"
        ? generateProjectionSchedule(scenarioData)
        : generateMonthlySummarySchedule(scenarioData);

    // Prepare response
    const response: InvestmentProjectionResponse = {
      investmentScenarioId: id,
      summary,
      schedule,
    };

    // Include rate comparisons if requested
    if (includeComparisons) {
      const rateComparisons = await sql`
        SELECT id, rate, label, created_at
        FROM investment_rate_comparisons
        WHERE investment_scenario_id = ${id}
        ORDER BY rate ASC
      `;

      if (rateComparisons.length > 0) {
        const additionalRates = rateComparisons.map((r: any) => ({
          rate: parseFloat(r.rate),
          label: r.label,
        }));

        response.rateComparisons = compareRates(scenarioData, additionalRates);
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error calculating investment projection:", error);

    // Check if tables don't exist
    if (
      error instanceof Error &&
      error.message.includes('relation "investment_scenarios" does not exist')
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
        error: "Error al calcular proyección de inversión",
        code: "INTERNAL_SERVER_ERROR",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
