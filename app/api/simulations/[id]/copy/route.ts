/**
 * Copy Simulation API Route
 * POST: Create a complete copy of an existing simulation including all related data
 */

import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';

interface CopySimulationRequest {
  name?: string;
}

interface CopySimulationResponse {
  success: boolean;
  simulation?: {
    id: number;
    name: string;
    description: string | null;
    created_at: string;
  };
  copied?: {
    budgets_count: number;
    incomes_count: number;
    subgroups_count: number;
  };
  error?: string;
  code?: string;
}

/**
 * POST /api/simulations/[id]/copy
 * Creates a complete copy of a simulation including:
 * - Simulation metadata (name, description)
 * - All simulation_budgets (efectivo_amount, credito_amount, ahorro_efectivo_amount, ahorro_credito_amount, expected_savings)
 * - All simulation_incomes (description, amount)
 * - All simulation_subgroups and their category associations
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CopySimulationResponse>> {
  try {
    const { id } = await params;
    const sourceSimulationId = parseInt(id, 10);

    // Validate simulation ID
    if (isNaN(sourceSimulationId) || sourceSimulationId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'ID de simulación inválido',
          code: 'INVALID_SIMULATION_ID',
        },
        { status: 400 }
      );
    }

    // Parse optional request body for custom name
    let requestBody: CopySimulationRequest = {};
    try {
      const text = await request.text();
      if (text) {
        requestBody = JSON.parse(text);
      }
    } catch {
      // Empty body is fine, use defaults
    }

    // Fetch source simulation
    const [sourceSimulation] = await sql`
      SELECT id, name, description, user_id
      FROM simulations
      WHERE id = ${sourceSimulationId}
    `;

    if (!sourceSimulation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Simulación no encontrada',
          code: 'SIMULATION_NOT_FOUND',
        },
        { status: 404 }
      );
    }

    // Determine new simulation name
    const newName = requestBody.name || `${sourceSimulation.name} (Copia)`;

    // Start copying data
    // 1. Create new simulation
    const [newSimulation] = await sql`
      INSERT INTO simulations (name, description, user_id, created_at, updated_at)
      VALUES (${newName}, ${sourceSimulation.description}, ${sourceSimulation.user_id}, NOW(), NOW())
      RETURNING id, name, description, created_at
    `;

    const newSimulationId = newSimulation.id;

    // 2. Copy simulation_budgets
    const sourceBudgets = await sql`
      SELECT category_id, efectivo_amount, credito_amount, ahorro_efectivo_amount, ahorro_credito_amount, expected_savings
      FROM simulation_budgets
      WHERE simulation_id = ${sourceSimulationId}
    `;

    let budgetsCopied = 0;
    if (sourceBudgets.length > 0) {
      // Build values for batch insert
      for (const budget of sourceBudgets) {
        await sql`
          INSERT INTO simulation_budgets
            (simulation_id, category_id, efectivo_amount, credito_amount, ahorro_efectivo_amount, ahorro_credito_amount, expected_savings, created_at, updated_at)
          VALUES
            (${newSimulationId}, ${budget.category_id}, ${budget.efectivo_amount}, ${budget.credito_amount}, ${budget.ahorro_efectivo_amount || 0}, ${budget.ahorro_credito_amount || 0}, ${budget.expected_savings || 0}, NOW(), NOW())
        `;
        budgetsCopied++;
      }
    }

    // 3. Copy simulation_incomes
    const sourceIncomes = await sql`
      SELECT description, amount
      FROM simulation_incomes
      WHERE simulation_id = ${sourceSimulationId}
    `;

    let incomesCopied = 0;
    if (sourceIncomes.length > 0) {
      for (const income of sourceIncomes) {
        await sql`
          INSERT INTO simulation_incomes
            (simulation_id, description, amount, created_at, updated_at)
          VALUES
            (${newSimulationId}, ${income.description}, ${income.amount}, NOW(), NOW())
        `;
        incomesCopied++;
      }
    }

    // 4. Copy simulation_subgroups and subgroup_categories
    // First, check if subgroup tables exist
    let subgroupsCopied = 0;
    try {
      const sourceSubgroups = await sql`
        SELECT id, name, display_order, template_subgroup_id, custom_order, custom_visibility
        FROM simulation_subgroups
        WHERE simulation_id = ${sourceSimulationId}
        ORDER BY display_order ASC
      `;

      if (sourceSubgroups.length > 0) {
        for (const subgroup of sourceSubgroups) {
          // Insert new subgroup with gen_random_uuid() and return the new ID
          const [newSubgroup] = await sql`
            INSERT INTO simulation_subgroups
              (id, simulation_id, name, display_order, template_subgroup_id, custom_order, custom_visibility, created_at, updated_at)
            VALUES
              (gen_random_uuid(), ${newSimulationId}, ${subgroup.name}, ${subgroup.display_order}, ${subgroup.template_subgroup_id}, ${subgroup.custom_order}, ${subgroup.custom_visibility}, NOW(), NOW())
            RETURNING id
          `;

          const newSubgroupId = newSubgroup.id;

          // Fetch and copy subgroup_categories for this subgroup
          const sourceCategories = await sql`
            SELECT category_id, order_within_subgroup
            FROM subgroup_categories
            WHERE subgroup_id = ${subgroup.id}::uuid
            ORDER BY order_within_subgroup ASC
          `;

          for (const category of sourceCategories) {
            await sql`
              INSERT INTO subgroup_categories
                (id, subgroup_id, category_id, order_within_subgroup)
              VALUES
                (gen_random_uuid(), ${newSubgroupId}::uuid, ${category.category_id}, ${category.order_within_subgroup})
            `;
          }

          subgroupsCopied++;
        }
      }
    } catch (subgroupError) {
      // Subgroup tables might not exist, which is fine
      // Log but don't fail the copy
      console.warn(
        'Note: Could not copy subgroups (tables may not exist):',
        subgroupError
      );
    }

    return NextResponse.json(
      {
        success: true,
        simulation: {
          id: newSimulation.id,
          name: newSimulation.name,
          description: newSimulation.description,
          created_at: newSimulation.created_at,
        },
        copied: {
          budgets_count: budgetsCopied,
          incomes_count: incomesCopied,
          subgroups_count: subgroupsCopied,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error copying simulation:', error);

    if (error instanceof Error) {
      if (error.message.includes('connection')) {
        return NextResponse.json(
          {
            success: false,
            error: 'Error de conexión con la base de datos',
            code: 'DATABASE_CONNECTION_ERROR',
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Error interno al copiar la simulación',
        code: 'INTERNAL_SERVER_ERROR',
      },
      { status: 500 }
    );
  }
}
