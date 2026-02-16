import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  validateCreateSimulation,
  checkSimulationDataConsistency,
  getValidationFeedback,
} from '@/lib/simulation-validation';

// GET /api/simulations - List all simulations
export async function GET() {
  try {
    const simulations = await sql`
      SELECT 
        s.*,
        COUNT(sb.id) as budget_count
      FROM simulations s
      LEFT JOIN simulation_budgets sb ON s.id = sb.simulation_id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `;

    return NextResponse.json(simulations);
  } catch (error) {
    console.error('Error fetching simulations:', error);

    // Enhanced error handling
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
        error: 'Error interno del servidor al cargar simulaciones',
        code: 'INTERNAL_SERVER_ERROR',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// POST /api/simulations - Create new simulation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Comprehensive validation using Zod schema
    const validation = validateCreateSimulation(body);
    if (!validation.success) {
      const feedback = getValidationFeedback(validation.errors);
      return NextResponse.json(
        {
          error: feedback.summary,
          details: feedback.details,
          validation_errors: validation.errors,
        },
        { status: 400 }
      );
    }

    const { name, description } = validation.data ?? {
      name: '',
      description: null,
    };

    // Check for duplicate names (case-insensitive)
    const existingSimulation = await sql`
      SELECT id, name FROM simulations 
      WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
      LIMIT 1
    `;

    if (existingSimulation.length > 0) {
      return NextResponse.json(
        {
          error: 'Ya existe una simulación con este nombre',
          code: 'DUPLICATE_NAME',
          existing_simulation: {
            id: existingSimulation[0].id,
            name: existingSimulation[0].name,
          },
        },
        { status: 409 }
      );
    }

    // Create simulation with transaction for data consistency
    const [newSimulation] = await sql`
      INSERT INTO simulations (name, description)
      VALUES (${name.trim()}, ${description || null})
      RETURNING *
    `;

    // Verify the created simulation
    if (!newSimulation || !newSimulation.id) {
      throw new Error('Failed to create simulation - no data returned');
    }

    // Add budget_count for consistency with GET response
    const simulationWithCount = {
      ...newSimulation,
      budget_count: 0,
    };

    // Log successful creation for monitoring
    console.log(
      `Simulation created successfully: ID ${newSimulation.id}, Name: "${newSimulation.name}"`
    );

    return NextResponse.json(simulationWithCount, { status: 201 });
  } catch (error) {
    console.error('Error creating simulation:', error);

    // Handle specific database errors
    if (error instanceof Error) {
      if (
        error.message.includes('duplicate key') ||
        error.message.includes('unique constraint')
      ) {
        return NextResponse.json(
          {
            error: 'Ya existe una simulación con este nombre',
            code: 'DUPLICATE_NAME',
          },
          { status: 409 }
        );
      }

      if (
        error.message.includes('connection') ||
        error.message.includes('timeout')
      ) {
        return NextResponse.json(
          {
            error: 'Error de conexión con la base de datos',
            code: 'DATABASE_CONNECTION_ERROR',
            retryable: true,
          },
          { status: 503 }
        );
      }

      if (
        error.message.includes('invalid input') ||
        error.message.includes('constraint')
      ) {
        return NextResponse.json(
          {
            error: 'Datos inválidos para crear la simulación',
            code: 'INVALID_DATA',
            details: error.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor al crear la simulación',
        code: 'INTERNAL_SERVER_ERROR',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
