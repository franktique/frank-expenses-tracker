import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  UpdateLoanScenarioSchema,
  LOAN_ERROR_MESSAGES,
} from "@/types/loan-simulator";

/**
 * GET /api/loan-scenarios/[id]
 *
 * Get a single loan scenario by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: "ID de préstamo inválido",
          code: "INVALID_ID",
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
          code: "SCENARIO_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Fetch extra payments for this scenario
    const extraPayments = await sql`
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

    return NextResponse.json({
      ...scenario,
      extraPayments,
    });
  } catch (error) {
    console.error("Error fetching loan scenario:", error);

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
        error: "Error interno del servidor al cargar el escenario de préstamo",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/loan-scenarios/[id]
 *
 * Update a loan scenario
 *
 * Request Body (partial):
 * {
 *   "name"?: string,
 *   "principal"?: number,
 *   "interestRate"?: number,
 *   "termMonths"?: number,
 *   "startDate"?: string
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: "ID de préstamo inválido",
          code: "INVALID_ID",
        },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body
    const validation = UpdateLoanScenarioSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos inválidos",
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    // Check if scenario exists
    const [existing] = await sql`
      SELECT id, name FROM loan_scenarios WHERE id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: "SCENARIO_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    const { name, principal, interestRate, termMonths, startDate } =
      validation.data;

    // Check for duplicate names (excluding current scenario)
    if (name !== undefined && name.trim() !== existing.name) {
      const [duplicate] = await sql`
        SELECT id, name FROM loan_scenarios
        WHERE LOWER(TRIM(name)) = LOWER(TRIM(${name}))
        AND id != ${id}
        LIMIT 1
      `;

      if (duplicate) {
        return NextResponse.json(
          {
            error: LOAN_ERROR_MESSAGES.DUPLICATE_NAME,
            code: "DUPLICATE_NAME",
            existing: { id: duplicate.id, name: duplicate.name },
          },
          { status: 409 }
        );
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (name !== undefined) {
      updateFields.push(`name = $${updateValues.length + 1}`);
      updateValues.push(name.trim());
    }
    if (principal !== undefined) {
      updateFields.push(`principal = $${updateValues.length + 1}`);
      updateValues.push(principal);
    }
    if (interestRate !== undefined) {
      updateFields.push(`interest_rate = $${updateValues.length + 1}`);
      updateValues.push(interestRate);
    }
    if (termMonths !== undefined) {
      updateFields.push(`term_months = $${updateValues.length + 1}`);
      updateValues.push(termMonths);
    }
    if (startDate !== undefined) {
      updateFields.push(`start_date = $${updateValues.length + 1}`);
      updateValues.push(startDate);
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    const query = `
      UPDATE loan_scenarios
      SET ${updateFields.join(", ")}
      WHERE id = $${updateValues.length}
      RETURNING *
    `;

    // Use sql.query for dynamic SQL with placeholders
    const { sql: sqlClient } = await import("@/lib/db");
    const [updated] = await sqlClient.query(query, updateValues);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating loan scenario:", error);

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
        error: "Error interno del servidor al actualizar el escenario de préstamo",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/loan-scenarios/[id]
 *
 * Delete a loan scenario (cascade deletes extra payments)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate UUID
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return NextResponse.json(
        {
          error: "ID de préstamo inválido",
          code: "INVALID_ID",
        },
        { status: 400 }
      );
    }

    // Check if scenario exists and get details
    const [existing] = await sql`
      SELECT id, name FROM loan_scenarios WHERE id = ${id}
    `;

    if (!existing) {
      return NextResponse.json(
        {
          error: LOAN_ERROR_MESSAGES.SCENARIO_NOT_FOUND,
          code: "SCENARIO_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Get extra payments count before deletion
    const [extraCount] = await sql`
      SELECT COUNT(*) as count
      FROM loan_extra_payments
      WHERE loan_scenario_id = ${id}
    `;

    // Delete the scenario (cascade will delete extra payments)
    await sql`
      DELETE FROM loan_scenarios WHERE id = ${id}
    `;

    return NextResponse.json({
      success: true,
      message: "Escenario de préstamo eliminado exitosamente",
      deleted: {
        id,
        name: existing.name,
        extraPaymentsDeleted: parseInt(extraCount.count),
      },
    });
  } catch (error) {
    console.error("Error deleting loan scenario:", error);

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
        error: "Error interno del servidor al eliminar el escenario de préstamo",
        code: "INTERNAL_SERVER_ERROR",
      },
      { status: 500 }
    );
  }
}
