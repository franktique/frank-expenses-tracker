import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  validateUpdateSimulation,
  checkSimulationDataConsistency,
  getValidationFeedback,
} from "@/lib/simulation-validation";

// GET /api/simulations/[id] - Get individual simulation details
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
          error: "ID de simulación inválido",
          code: "INVALID_SIMULATION_ID",
        },
        { status: 400 }
      );
    }

    const [simulation] = await sql`
      SELECT 
        s.*,
        COUNT(sb.id) as budget_count
      FROM simulations s
      LEFT JOIN simulation_budgets sb ON s.id = sb.simulation_id
      WHERE s.id = ${simulationId}
      GROUP BY s.id
    `;

    if (!simulation) {
      return NextResponse.json(
        {
          error: "Simulación no encontrada",
          code: "SIMULATION_NOT_FOUND",
          simulation_id: simulationId,
        },
        { status: 404 }
      );
    }

    // Perform data consistency check
    const budgets = await sql`
      SELECT * FROM simulation_budgets 
      WHERE simulation_id = ${simulationId}
    `;

    const categories = await sql`
      SELECT id, name FROM categories ORDER BY name
    `;

    const consistencyCheck = checkSimulationDataConsistency(
      simulation,
      budgets,
      categories
    );

    // Add consistency information to response
    const response = {
      ...simulation,
      consistency_check: consistencyCheck,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching simulation:", error);

    if (error instanceof Error) {
      if (error.message.includes("connection")) {
        return NextResponse.json(
          {
            error: "Error de conexión con la base de datos",
            code: "DATABASE_CONNECTION_ERROR",
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor al cargar la simulación",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// PUT /api/simulations/[id] - Update simulation metadata
export async function PUT(
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
          error: "ID de simulación inválido",
          code: "INVALID_SIMULATION_ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Comprehensive validation using Zod schema
    const validation = validateUpdateSimulation(body);
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

    const { name, description } = validation.data;

    // Check if simulation exists
    const [existingSimulation] = await sql`
      SELECT id, name FROM simulations WHERE id = ${simulationId}
    `;

    if (!existingSimulation) {
      return NextResponse.json(
        {
          error: "Simulación no encontrada",
          code: "SIMULATION_NOT_FOUND",
          simulation_id: simulationId,
        },
        { status: 404 }
      );
    }

    // Check for duplicate names (excluding current simulation)
    if (name) {
      const duplicateSimulation = await sql`
        SELECT id, name FROM simulations 
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
        AND id != ${simulationId}
        LIMIT 1
      `;

      if (duplicateSimulation.length > 0) {
        return NextResponse.json(
          {
            error: "Ya existe otra simulación con este nombre",
            code: "DUPLICATE_NAME",
            existing_simulation: {
              id: duplicateSimulation[0].id,
              name: duplicateSimulation[0].name,
            },
          },
          { status: 409 }
        );
      }
    }

    // Update the simulation
    const updateFields: any = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) {
      updateFields.name = name.trim();
    }
    if (description !== undefined) {
      updateFields.description = description;
    }

    const [updatedSimulation] = await sql`
      UPDATE simulations 
      SET 
        name = COALESCE(${updateFields.name}, name),
        description = ${updateFields.description},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ${simulationId}
      RETURNING *
    `;

    if (!updatedSimulation) {
      throw new Error("Failed to update simulation - no data returned");
    }

    // Log successful update
    console.log(
      `Simulation updated successfully: ID ${simulationId}, Name: "${updatedSimulation.name}"`
    );

    return NextResponse.json(updatedSimulation);
  } catch (error) {
    console.error("Error updating simulation:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("duplicate key") ||
        error.message.includes("unique constraint")
      ) {
        return NextResponse.json(
          {
            error: "Ya existe otra simulación con este nombre",
            code: "DUPLICATE_NAME",
          },
          { status: 409 }
        );
      }

      if (
        error.message.includes("connection") ||
        error.message.includes("timeout")
      ) {
        return NextResponse.json(
          {
            error: "Error de conexión con la base de datos",
            code: "DATABASE_CONNECTION_ERROR",
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor al actualizar la simulación",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/simulations/[id] - Delete simulation
export async function DELETE(
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
          error: "ID de simulación inválido",
          code: "INVALID_SIMULATION_ID",
        },
        { status: 400 }
      );
    }

    // Check if simulation exists and get its details
    const [existingSimulation] = await sql`
      SELECT id, name FROM simulations WHERE id = ${simulationId}
    `;

    if (!existingSimulation) {
      return NextResponse.json(
        {
          error: "Simulación no encontrada",
          code: "SIMULATION_NOT_FOUND",
          simulation_id: simulationId,
        },
        { status: 404 }
      );
    }

    // Check for related data that will be deleted
    const [budgetCount] = await sql`
      SELECT COUNT(*) as count FROM simulation_budgets 
      WHERE simulation_id = ${simulationId}
    `;

    // Delete the simulation (CASCADE will handle simulation_budgets)
    const deletedRows = await sql`
      DELETE FROM simulations WHERE id = ${simulationId}
    `;

    if (deletedRows.length === 0) {
      throw new Error("Failed to delete simulation - no rows affected");
    }

    // Log successful deletion
    console.log(
      `Simulation deleted successfully: ID ${simulationId}, Name: "${existingSimulation.name}", Budgets deleted: ${budgetCount.count}`
    );

    return NextResponse.json({
      success: true,
      message: "Simulación eliminada exitosamente",
      deleted_simulation: {
        id: simulationId,
        name: existingSimulation.name,
        budgets_deleted: parseInt(budgetCount.count),
      },
    });
  } catch (error) {
    console.error("Error deleting simulation:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        return NextResponse.json(
          {
            error: "No se puede eliminar la simulación debido a dependencias",
            code: "FOREIGN_KEY_CONSTRAINT",
            details:
              "La simulación tiene datos relacionados que impiden su eliminación",
          },
          { status: 409 }
        );
      }

      if (
        error.message.includes("connection") ||
        error.message.includes("timeout")
      ) {
        return NextResponse.json(
          {
            error: "Error de conexión con la base de datos",
            code: "DATABASE_CONNECTION_ERROR",
            retryable: true,
          },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor al eliminar la simulación",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
