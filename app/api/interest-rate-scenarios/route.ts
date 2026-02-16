import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateInterestRateScenarioSchema,
  INTEREST_RATE_ERROR_MESSAGES,
  type InterestRateScenario,
  type InterestRateScenarioListResponse,
  type InterestRateScenarioWithConversions,
  type RateType,
} from '@/types/interest-rate-simulator';
import { convertRate } from '@/lib/interest-rate-calculations';

/**
 * GET /api/interest-rate-scenarios
 * List all interest rate scenarios with their conversions
 */
export async function GET() {
  try {
    const scenarios = await sql`
      SELECT
        id,
        name,
        input_rate,
        input_rate_type,
        notes,
        created_at,
        updated_at
      FROM interest_rate_scenarios
      ORDER BY created_at DESC
    `;

    const mappedScenarios: InterestRateScenarioWithConversions[] =
      scenarios.map(
        (row: {
          id: string;
          name: string;
          input_rate: string;
          input_rate_type: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        }) => {
          const inputRate = parseFloat(row.input_rate);
          const inputRateType = row.input_rate_type as RateType;

          const scenario: InterestRateScenario = {
            id: row.id,
            name: row.name,
            inputRate,
            inputRateType,
            notes: row.notes ?? undefined,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };

          const conversions = convertRate(inputRate, inputRateType);

          return {
            ...scenario,
            conversions,
          };
        }
      );

    const response: InterestRateScenarioListResponse = {
      scenarios: mappedScenarios,
      totalCount: mappedScenarios.length,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error listing interest rate scenarios:', error);

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
 * POST /api/interest-rate-scenarios
 * Create a new interest rate scenario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = CreateInterestRateScenarioSchema.safeParse(body);
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

    const { name, inputRate, inputRateType, notes } = validation.data;

    // Check for duplicate name
    const [duplicate] = await sql`
      SELECT id FROM interest_rate_scenarios
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
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

    // Insert scenario
    const [scenario] = await sql`
      INSERT INTO interest_rate_scenarios (
        name,
        input_rate,
        input_rate_type,
        notes
      ) VALUES (
        ${name},
        ${inputRate},
        ${inputRateType},
        ${notes ?? null}
      )
      RETURNING
        id,
        name,
        input_rate,
        input_rate_type,
        notes,
        created_at,
        updated_at
    `;

    const result: InterestRateScenarioWithConversions = {
      id: scenario.id,
      name: scenario.name,
      inputRate: parseFloat(scenario.input_rate),
      inputRateType: scenario.input_rate_type as RateType,
      notes: scenario.notes ?? undefined,
      createdAt: scenario.created_at,
      updatedAt: scenario.updated_at,
      conversions: convertRate(
        parseFloat(scenario.input_rate),
        scenario.input_rate_type as RateType
      ),
    };

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error('Error creating interest rate scenario:', error);

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
