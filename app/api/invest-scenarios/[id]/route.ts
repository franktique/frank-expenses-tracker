import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  UpdateInvestmentScenarioSchema,
  INVEST_ERROR_MESSAGES,
  type InvestmentScenario,
} from '@/types/invest-simulator';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/invest-scenarios/[id]
 *
 * Get a single investment scenario by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

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
        notes,
        created_at,
        updated_at
      FROM investment_scenarios
      WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching investment scenario:', error);

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
        error: 'Error al obtener escenario de inversión',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/invest-scenarios/[id]
 *
 * Update an investment scenario
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = UpdateInvestmentScenarioSchema.safeParse(body);
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

    // Check if scenario exists
    const [existing] = await sql`
      SELECT id FROM investment_scenarios WHERE id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const updates = validation.data;

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const [duplicate] = await sql`
        SELECT id FROM investment_scenarios
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${updates.name}))
        AND id != ${id}
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
    }

    // Build update query dynamically
    // Handle notes specially: if explicitly set to null, clear it; if undefined, keep existing
    const notesValue =
      updates.notes === null ? null : (updates.notes ?? undefined);

    const [scenario] = await sql`
      UPDATE investment_scenarios
      SET
        name = COALESCE(${updates.name?.trim() ?? null}, name),
        initial_amount = COALESCE(${updates.initialAmount ?? null}, initial_amount),
        monthly_contribution = COALESCE(${updates.monthlyContribution ?? null}, monthly_contribution),
        term_months = COALESCE(${updates.termMonths ?? null}, term_months),
        annual_rate = COALESCE(${updates.annualRate ?? null}, annual_rate),
        compounding_frequency = COALESCE(${updates.compoundingFrequency ?? null}, compounding_frequency),
        currency = COALESCE(${updates.currency ?? null}, currency),
        notes = CASE
          WHEN ${notesValue === undefined ? null : 'update'} IS NULL THEN notes
          ELSE ${notesValue === undefined ? null : notesValue}
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
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

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating investment scenario:', error);

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
        error: 'Error al actualizar escenario de inversión',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invest-scenarios/[id]
 *
 * Delete an investment scenario (cascades to rate comparisons)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // Check if scenario exists
    const [existing] = await sql`
      SELECT id, name FROM investment_scenarios WHERE id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        {
          error: INVEST_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Delete scenario (rate comparisons cascade automatically)
    await sql`
      DELETE FROM investment_scenarios WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: `Escenario "${existing.name}" eliminado exitosamente`,
      deletedId: id,
    });
  } catch (error) {
    console.error('Error deleting investment scenario:', error);

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
        error: 'Error al eliminar escenario de inversión',
        code: 'INTERNAL_SERVER_ERROR',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
