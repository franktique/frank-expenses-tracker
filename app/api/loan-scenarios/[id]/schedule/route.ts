import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { LOAN_ERROR_MESSAGES } from '@/types/loan-simulator';
import {
  generateAmortizationSchedule,
  calculateExtraPaymentImpact,
} from '@/lib/loan-calculations';

/**
 * GET /api/loan-scenarios/[id]/schedule
 *
 * Generate payment schedule for a loan scenario
 *
 * Query Parameters:
 * - includeExtraPayments (boolean): Include extra payments in calculation (default: true)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeExtraPayments =
      searchParams.get('includeExtraPayments') !== 'false';

    // Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: 'ID de préstamo inválido',
          code: 'INVALID_ID',
        },
        { status: 400 }
      );
    }

    // Fetch loan scenario
    const [scenario] = await sql`
      SELECT
        id,
        name,
        principal,
        interest_rate as "interestRate",
        term_months as "termMonths",
        start_date as "startDate",
        currency,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM loan_scenarios
      WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'SCENARIO_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Fetch extra payments if requested
    let extraPayments: any[] = [];
    if (includeExtraPayments) {
      extraPayments = await sql`
        SELECT
          id,
          loan_scenario_id,
          payment_number,
          amount,
          description,
          created_at
        FROM loan_extra_payments
        WHERE loan_scenario_id = ${id}
        ORDER BY payment_number ASC
      `;
    }

    // Generate amortization schedule
    const schedule = generateAmortizationSchedule(
      {
        id: scenario.id,
        name: scenario.name,
        principal: parseFloat(scenario.principal),
        interestRate: parseFloat(scenario.interestRate),
        termMonths: parseInt(scenario.termMonths),
        startDate: scenario.startDate,
        currency: scenario.currency || 'USD',
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
      },
      extraPayments
    );

    // Calculate summary with/without extra payments
    const impact = calculateExtraPaymentImpact(
      {
        id: scenario.id,
        name: scenario.name,
        principal: parseFloat(scenario.principal),
        interestRate: parseFloat(scenario.interestRate),
        termMonths: parseInt(scenario.termMonths),
        startDate: scenario.startDate,
        currency: scenario.currency || 'USD',
        createdAt: scenario.createdAt,
        updatedAt: scenario.updatedAt,
      },
      extraPayments
    );

    return NextResponse.json({
      loanScenarioId: id,
      summary: impact.newSummary,
      payments: schedule,
      extraPayments,
      originalSummary: impact.originalSummary,
      monthsSaved: impact.monthsSaved,
      interestSaved: impact.interestSaved,
    });
  } catch (error) {
    console.error('Error generating payment schedule:', error);

    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return NextResponse.json(
          {
            error: 'Error de conexión con la base de datos',
            code: 'DATABASE_CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor al generar el calendario de pagos',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
