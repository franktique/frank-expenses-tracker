import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  UpdateSimulationIncomeSchema,
  SIMULATION_INCOME_ERROR_MESSAGES,
} from "@/types/funds";

// PUT /api/simulations/[id]/incomes/[incomeId] - Update simulation income
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    const { id, incomeId } = await params;
    const simulationId = parseInt(id);
    const incomeIdNum = parseInt(incomeId);

    // Validate IDs
    if (isNaN(simulationId) || simulationId <= 0) {
      return NextResponse.json(
        {
          error: "ID de simulación inválido",
          code: "INVALID_SIMULATION_ID",
        },
        { status: 400 }
      );
    }

    if (isNaN(incomeIdNum) || incomeIdNum <= 0) {
      return NextResponse.json(
        {
          error: "ID de ingreso inválido",
          code: "INVALID_INCOME_ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateSimulationIncomeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos de ingreso inválidos",
          validation_errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { description, amount } = validation.data;

    // Check if income exists and belongs to the simulation
    const [existingIncome] = await sql`
      SELECT * FROM simulation_incomes
      WHERE id = ${incomeIdNum} AND simulation_id = ${simulationId}
    `;

    if (!existingIncome) {
      return NextResponse.json(
        {
          error: SIMULATION_INCOME_ERROR_MESSAGES.INCOME_NOT_FOUND,
          code: "INCOME_NOT_FOUND",
          income_id: incomeIdNum,
        },
        { status: 404 }
      );
    }

    // Build update query dynamically based on provided fields
    const updates: string[] = [];
    const values: any[] = [];

    if (description !== undefined) {
      updates.push("description = $" + (values.length + 1));
      values.push(description);
    }

    if (amount !== undefined) {
      updates.push("amount = $" + (values.length + 1));
      values.push(amount);
    }

    // Always update the updated_at timestamp
    updates.push("updated_at = CURRENT_TIMESTAMP");

    if (updates.length === 1) {
      // Only updated_at, nothing to update
      return NextResponse.json({
        success: true,
        message: "No hay cambios para actualizar",
        income: existingIncome,
      });
    }

    // Update income entry
    const updateQuery = `
      UPDATE simulation_incomes
      SET ${updates.join(", ")}
      WHERE id = $${values.length + 1} AND simulation_id = $${values.length + 2}
      RETURNING *
    `;

    values.push(incomeIdNum, simulationId);

    const [updatedIncome] = await sql.unsafe(updateQuery, values);

    // Update simulation's updated_at timestamp
    await sql`
      UPDATE simulations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${simulationId}
    `;

    console.log(
      `Simulation income updated: ID ${incomeIdNum} for Simulation ${simulationId}`
    );

    return NextResponse.json({
      success: true,
      message: "Ingreso simulado actualizado exitosamente",
      income: updatedIncome,
    });
  } catch (error) {
    console.error("Error updating simulation income:", error);

    if (error instanceof Error) {
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
        error: "Error interno del servidor al actualizar ingreso",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// DELETE /api/simulations/[id]/incomes/[incomeId] - Delete simulation income
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; incomeId: string }> }
) {
  try {
    const { id, incomeId } = await params;
    const simulationId = parseInt(id);
    const incomeIdNum = parseInt(incomeId);

    // Validate IDs
    if (isNaN(simulationId) || simulationId <= 0) {
      return NextResponse.json(
        {
          error: "ID de simulación inválido",
          code: "INVALID_SIMULATION_ID",
        },
        { status: 400 }
      );
    }

    if (isNaN(incomeIdNum) || incomeIdNum <= 0) {
      return NextResponse.json(
        {
          error: "ID de ingreso inválido",
          code: "INVALID_INCOME_ID",
        },
        { status: 400 }
      );
    }

    // Check if income exists and belongs to the simulation
    const [existingIncome] = await sql`
      SELECT * FROM simulation_incomes
      WHERE id = ${incomeIdNum} AND simulation_id = ${simulationId}
    `;

    if (!existingIncome) {
      return NextResponse.json(
        {
          error: SIMULATION_INCOME_ERROR_MESSAGES.INCOME_NOT_FOUND,
          code: "INCOME_NOT_FOUND",
          income_id: incomeIdNum,
        },
        { status: 404 }
      );
    }

    // Delete income entry
    await sql`
      DELETE FROM simulation_incomes
      WHERE id = ${incomeIdNum} AND simulation_id = ${simulationId}
    `;

    // Update simulation's updated_at timestamp
    await sql`
      UPDATE simulations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${simulationId}
    `;

    console.log(
      `Simulation income deleted: ID ${incomeIdNum} for Simulation ${simulationId}`
    );

    return NextResponse.json({
      success: true,
      message: "Ingreso simulado eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error deleting simulation income:", error);

    if (error instanceof Error) {
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
        error: SIMULATION_INCOME_ERROR_MESSAGES.DELETE_FAILED,
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
