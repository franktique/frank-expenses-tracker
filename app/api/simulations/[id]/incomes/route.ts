import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import {
  CreateSimulationIncomeSchema,
  SIMULATION_INCOME_ERROR_MESSAGES,
} from '@/types/funds';

// GET /api/simulations/[id]/incomes - Get simulation incomes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simulationId = parseInt(id);

    // Validate simulation ID
    if (isNaN(simulationId) || simulationId <= 0) {
      return NextResponse.json(
        {
          error: 'ID de simulación inválido',
          code: 'INVALID_SIMULATION_ID',
        },
        { status: 400 }
      );
    }

    // Check if simulation exists
    const [simulation] = await sql`
      SELECT id, name FROM simulations WHERE id = ${simulationId}
    `;

    if (!simulation) {
      return NextResponse.json(
        {
          error: SIMULATION_INCOME_ERROR_MESSAGES.SIMULATION_NOT_FOUND,
          code: 'SIMULATION_NOT_FOUND',
          simulation_id: simulationId,
        },
        { status: 404 }
      );
    }

    // Get simulation incomes
    const incomes = await sql`
      SELECT
        id,
        simulation_id,
        description,
        amount,
        created_at,
        updated_at
      FROM simulation_incomes
      WHERE simulation_id = ${simulationId}
      ORDER BY created_at ASC
    `;

    // Calculate total income
    const totalIncome = incomes.reduce(
      (sum: number, income: { amount: string | number }) =>
        sum + Number(income.amount),
      0
    );

    return NextResponse.json({
      incomes,
      total_income: totalIncome,
      simulation: {
        id: simulation.id,
        name: simulation.name,
      },
    });
  } catch (error) {
    console.error('Error fetching simulation incomes:', error);

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
        error: 'Error interno del servidor al cargar ingresos',
        code: 'INTERNAL_SERVER_ERROR',
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// POST /api/simulations/[id]/incomes - Create simulation income
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simulationId = parseInt(id);

    // Validate simulation ID
    if (isNaN(simulationId) || simulationId <= 0) {
      return NextResponse.json(
        {
          error: 'ID de simulación inválido',
          code: 'INVALID_SIMULATION_ID',
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = CreateSimulationIncomeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Datos de ingreso inválidos',
          validation_errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { description, amount } = validation.data;

    // Check if simulation exists
    const [simulation] = await sql`
      SELECT id, name FROM simulations WHERE id = ${simulationId}
    `;

    if (!simulation) {
      return NextResponse.json(
        {
          error: SIMULATION_INCOME_ERROR_MESSAGES.SIMULATION_NOT_FOUND,
          code: 'SIMULATION_NOT_FOUND',
          simulation_id: simulationId,
        },
        { status: 404 }
      );
    }

    // Create income entry
    const [newIncome] = await sql`
      INSERT INTO simulation_incomes (simulation_id, description, amount)
      VALUES (${simulationId}, ${description}, ${amount})
      RETURNING *
    `;

    // Update simulation's updated_at timestamp
    await sql`
      UPDATE simulations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${simulationId}
    `;

    console.log(
      `Simulation income created: ID ${newIncome.id} for Simulation ${simulationId}`
    );

    return NextResponse.json({
      success: true,
      message: 'Ingreso simulado creado exitosamente',
      income: newIncome,
    });
  } catch (error) {
    console.error('Error creating simulation income:', error);

    if (error instanceof Error) {
      if (
        error.message.includes('foreign key') ||
        error.message.includes('constraint')
      ) {
        return NextResponse.json(
          {
            error: 'Error de integridad de datos al crear ingreso',
            code: 'FOREIGN_KEY_CONSTRAINT',
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
    }

    return NextResponse.json(
      {
        error: 'Error interno del servidor al crear ingreso',
        code: 'INTERNAL_SERVER_ERROR',
        retryable: true,
      },
      { status: 500 }
    );
  }
}
