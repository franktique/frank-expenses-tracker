import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  UpdateInterestRateScenarioSchema,
  INTEREST_RATE_ERROR_MESSAGES,
  type InterestRateScenarioWithConversions,
  type RateType,
} from '@/types/interest-rate-simulator';
import { convertRate } from '@/lib/interest-rate-calculations';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/interest-rate-scenarios/[id]
 * Get a single interest rate scenario by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [scenario] = await sql`
      SELECT
        id,
        name,
        input_rate,
        input_rate_type,
        notes,
        created_at,
        updated_at
      FROM interest_rate_scenarios
      WHERE id = ${id}
    `;

    if (!scenario) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    const inputRate = parseFloat(scenario.input_rate);
    const inputRateType = scenario.input_rate_type as RateType;

    const result: InterestRateScenarioWithConversions = {
      id: scenario.id,
      name: scenario.name,
      inputRate,
      inputRateType,
      notes: scenario.notes ?? undefined,
      createdAt: scenario.created_at,
      updatedAt: scenario.updated_at,
      conversions: convertRate(inputRate, inputRateType),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error getting interest rate scenario:', error);

    // Handle table not found
    if (
      error instanceof Error &&
      error.message.includes(
        'relation "interest_rate_scenarios" does not exist'
      )
    ) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: 'TABLES_NOT_FOUND',
          migrationEndpoint: '/api/migrate-interest-rate-simulator',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: INTEREST_RATE_ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/interest-rate-scenarios/[id]
 * Update an existing interest rate scenario
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Validate input
    const validation = UpdateInterestRateScenarioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.VALIDATION_ERROR,
          code: 'VALIDATION_ERROR',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Check if scenario exists
    const [existing] = await sql`
      SELECT id FROM interest_rate_scenarios WHERE id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Check for duplicate name if name is being updated
    if (updates.name) {
      const [duplicate] = await sql`
        SELECT id FROM interest_rate_scenarios
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${updates.name}))
        AND id != ${id}
      `;

      if (duplicate) {
        return NextResponse.json(
          {
            error: INTEREST_RATE_ERROR_MESSAGES.DUPLICATE_NAME,
            code: 'DUPLICATE_NAME',
          },
          { status: 409 }
        );
      }
    }

    // Build dynamic update query
    const [updated] = await sql`
      UPDATE interest_rate_scenarios
      SET
        name = COALESCE(${updates.name ?? null}, name),
        input_rate = COALESCE(${updates.inputRate ?? null}, input_rate),
        input_rate_type = COALESCE(${updates.inputRateType ?? null}, input_rate_type),
        notes = CASE
          WHEN ${updates.notes === null} THEN NULL
          WHEN ${updates.notes !== undefined} THEN ${updates.notes ?? null}
          ELSE notes
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING
        id,
        name,
        input_rate,
        input_rate_type,
        notes,
        created_at,
        updated_at
    `;

    const inputRate = parseFloat(updated.input_rate);
    const inputRateType = updated.input_rate_type as RateType;

    const result: InterestRateScenarioWithConversions = {
      id: updated.id,
      name: updated.name,
      inputRate,
      inputRateType,
      notes: updated.notes ?? undefined,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at,
      conversions: convertRate(inputRate, inputRateType),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating interest rate scenario:', error);

    // Handle table not found
    if (
      error instanceof Error &&
      error.message.includes(
        'relation "interest_rate_scenarios" does not exist'
      )
    ) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: 'TABLES_NOT_FOUND',
          migrationEndpoint: '/api/migrate-interest-rate-simulator',
        },
        { status: 404 }
      );
    }

    // Handle unique constraint violation
    if (
      error instanceof Error &&
      error.message.includes('interest_rate_scenarios_name_unique')
    ) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.DUPLICATE_NAME,
          code: 'DUPLICATE_NAME',
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: INTEREST_RATE_ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/interest-rate-scenarios/[id]
 * Delete an interest rate scenario
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const [deleted] = await sql`
      DELETE FROM interest_rate_scenarios
      WHERE id = ${id}
      RETURNING id
    `;

    if (!deleted) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: 'NOT_FOUND',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, id: deleted.id });
  } catch (error) {
    console.error('Error deleting interest rate scenario:', error);

    // Handle table not found
    if (
      error instanceof Error &&
      error.message.includes(
        'relation "interest_rate_scenarios" does not exist'
      )
    ) {
      return NextResponse.json(
        {
          error: INTEREST_RATE_ERROR_MESSAGES.TABLES_NOT_FOUND,
          code: 'TABLES_NOT_FOUND',
          migrationEndpoint: '/api/migrate-interest-rate-simulator',
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        error: INTEREST_RATE_ERROR_MESSAGES.INTERNAL_ERROR,
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
