import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateInvestmentScenarioSchema,
  INVEST_ERROR_MESSAGES,
  type InvestmentScenario,
  type InvestmentScenarioListResponse,
} from '@/types/invest-simulator';
import { calculateInvestmentSummary } from '@/lib/invest-calculations';

/**
 * GET /api/invest-scenarios
 *
 * List all investment scenarios with their projected final balances
 */
export async function GET() {
  try {
    const scenarios = await sql`
      SELECT
        id,
        name,
        initial_amount,
        monthly_contribution,
        term_months,
        annual_rate,
        compounding_frequency,
        currency,
        notes,
        created_at,
        updated_at
      FROM investment_scenarios
      ORDER BY updated_at DESC
    `;

    // Map database results to type and calculate projected balances
    const mappedScenarios = scenarios.map((row: any) => {
      const scenario: InvestmentScenario = {
        id: row.id,
        name: row.name,
        initialAmount: parseFloat(row.initial_amount),
        monthlyContribution: parseFloat(row.monthly_contribution),
        termMonths: row.term_months,
        annualRate: parseFloat(row.annual_rate),
        compoundingFrequency: row.compounding_frequency,
        currency: row.currency,
        notes: row.notes || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };

      // Calculate projected final balance
      const summary = calculateInvestmentSummary({
        initialAmount: scenario.initialAmount,
        monthlyContribution: scenario.monthlyContribution,
        termMonths: scenario.termMonths,
        annualRate: scenario.annualRate,
        compoundingFrequency: scenario.compoundingFrequency,
      });

      return {
        ...scenario,
        projectedFinalBalance: summary.finalBalance,
      };
    });

    const response: InvestmentScenarioListResponse = {
      scenarios: mappedScenarios,
      totalCount: mappedScenarios.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching investment scenarios:', error);

    // Check if tables don't exist
    if (
      error instanceof Error &&
      error.message.includes('relation "investment_scenarios" does not exist')
    ) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: 'TABLES_NOT_FOUND',
          migrationEndpoint: '/api/migrate-invest-simulator',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error al obtener escenarios de inversión',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invest-scenarios
 *
 * Create a new investment scenario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = CreateInvestmentScenarioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos de entrada inválidos',
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const {
      name,
      initialAmount,
      monthlyContribution,
      termMonths,
      annualRate,
      compoundingFrequency,
      currency,
      notes,
    } = validation.data;

    // Check for duplicate name
    const [duplicate] = await sql`
      SELECT id FROM investment_scenarios
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
    `;

    if (duplicate) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.DUPLICATE_NAME,
          code: 'DUPLICATE_NAME',
        },
        { status: 409 }
      );
    }

    // Insert new scenario
    const [scenario] = await sql`
      INSERT INTO investment_scenarios (
        name,
        initial_amount,
        monthly_contribution,
        term_months,
        annual_rate,
        compounding_frequency,
        currency,
        notes
      )
      VALUES (
        ${name.trim()},
        ${initialAmount},
        ${monthlyContribution},
        ${termMonths},
        ${annualRate},
        ${compoundingFrequency},
        ${currency},
        ${notes ?? null}
      )
      RETURNING
        id,
        name,
        initial_amount,
        monthly_contribution,
        term_months,
        annual_rate,
        compounding_frequency,
        currency,
        notes,
        created_at,
        updated_at
    `;

    const result: InvestmentScenario = {
      id: scenario.id,
      name: scenario.name,
      initialAmount: parseFloat(scenario.initial_amount),
      monthlyContribution: parseFloat(scenario.monthly_contribution),
      termMonths: scenario.term_months,
      annualRate: parseFloat(scenario.annual_rate),
      compoundingFrequency: scenario.compounding_frequency,
      currency: scenario.currency,
      notes: scenario.notes || undefined,
      createdAt: scenario.created_at,
      updatedAt: scenario.updated_at,
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating investment scenario:', error);

    // Check if tables don't exist
    if (
      error instanceof Error &&
      error.message.includes('relation "investment_scenarios" does not exist')
    ) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: 'TABLES_NOT_FOUND',
          migrationEndpoint: '/api/migrate-invest-simulator',
        },
        { status: 404 }
      );
    }

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      (error.message.includes('unique constraint') ||
        error.message.includes('duplicate key'))
    ) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.DUPLICATE_NAME,
          code: 'DUPLICATE_NAME',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Error al crear escenario de inversión',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
