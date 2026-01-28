import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import {
  validateSimulationBudgets,
  checkSimulationDataConsistency,
  getValidationFeedback,
  checkDataLossRisks,
} from "@/lib/simulation-validation";

// GET /api/simulations/[id]/budgets - Get simulation budgets
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

    // Check if simulation exists
    const [simulation] = await sql`
      SELECT id, name FROM simulations WHERE id = ${simulationId}
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

    // Get simulation budgets with category information
    const budgets = await sql`
      SELECT
        sb.category_id,
        c.name as category_name,
        sb.efectivo_amount,
        sb.credito_amount,
        sb.ahorro_efectivo_amount,
        sb.ahorro_credito_amount,
        sb.expected_savings,
        sb.needs_adjustment,
        sb.created_at,
        sb.updated_at
      FROM simulation_budgets sb
      JOIN categories c ON sb.category_id = c.id
      WHERE sb.simulation_id = ${simulationId}
      ORDER BY c.name
    `;

    // Get all available categories for consistency check
    const allCategories = await sql`
      SELECT id, name FROM categories ORDER BY name
    `;

    // Perform data consistency check
    const consistencyCheck = checkSimulationDataConsistency(
      simulation,
      budgets,
      allCategories
    );

    return NextResponse.json({
      budgets,
      simulation: {
        id: simulation.id,
        name: simulation.name,
      },
      consistency_check: consistencyCheck,
      total_categories: allCategories.length,
      configured_categories: budgets.length,
    });
  } catch (error) {
    console.error("Error fetching simulation budgets:", error);

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
        error: "Error interno del servidor al cargar presupuestos",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}

// PUT /api/simulations/[id]/budgets - Batch update simulation budgets
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

    // Validate request body structure
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          error: "Cuerpo de solicitud inválido",
          code: "INVALID_REQUEST_BODY",
        },
        { status: 400 }
      );
    }

    const { budgets } = body;

    // Comprehensive validation using Zod schema
    const validation = validateSimulationBudgets(budgets);
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

    const validatedBudgets = validation.data;

    // Check if simulation exists
    const [simulation] = await sql`
      SELECT id, name FROM simulations WHERE id = ${simulationId}
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

    // Get current budgets for data loss risk assessment
    const currentBudgets = await sql`
      SELECT * FROM simulation_budgets WHERE simulation_id = ${simulationId}
    `;

    // Check for data loss risks
    const dataLossRisk = checkDataLossRisks(currentBudgets, validatedBudgets);

    // Validate that all categories exist
    const categoryIds = validatedBudgets.map((b) => b.category_id);

    // Handle both numeric and UUID category IDs
    const numericIds = categoryIds.filter((id) => typeof id === "number");
    const stringIds = categoryIds.filter((id) => typeof id === "string");

    let categories = [];

    if (numericIds.length > 0) {
      const numericCategories = await sql`
        SELECT id, name FROM categories WHERE id = ANY(${numericIds})
      `;
      categories.push(...numericCategories);
    }

    if (stringIds.length > 0) {
      const stringCategories = await sql`
        SELECT id, name FROM categories WHERE id = ANY(${stringIds})
      `;
      categories.push(...stringCategories);
    }

    const existingCategoryIds = new Set(categories.map((c) => String(c.id)));
    const missingCategoryIds = categoryIds.filter(
      (id) => !existingCategoryIds.has(String(id))
    );

    if (missingCategoryIds.length > 0) {
      return NextResponse.json(
        {
          error: `Las siguientes categorías no existen: ${missingCategoryIds.join(
            ", "
          )}`,
          code: "INVALID_CATEGORIES",
          missing_category_ids: missingCategoryIds,
        },
        { status: 400 }
      );
    }

    // Begin transaction for atomic updates
    const results = [];
    const errors = [];

    try {
      // Process each budget update/insert
      for (const budget of validatedBudgets) {
        const {
          category_id,
          efectivo_amount,
          credito_amount,
          ahorro_efectivo_amount = 0,
          ahorro_credito_amount = 0,
          expected_savings = 0,
          needs_adjustment = false,
        } = budget;

        try {
          // Use UPSERT (INSERT ... ON CONFLICT) to handle updates
          const [result] = await sql`
            INSERT INTO simulation_budgets (
              simulation_id,
              category_id,
              efectivo_amount,
              credito_amount,
              ahorro_efectivo_amount,
              ahorro_credito_amount,
              expected_savings,
              needs_adjustment,
              updated_at
            )
            VALUES (
              ${simulationId},
              ${category_id},
              ${efectivo_amount},
              ${credito_amount},
              ${ahorro_efectivo_amount},
              ${ahorro_credito_amount},
              ${expected_savings},
              ${needs_adjustment},
              CURRENT_TIMESTAMP
            )
            ON CONFLICT (simulation_id, category_id)
            DO UPDATE SET
              efectivo_amount = EXCLUDED.efectivo_amount,
              credito_amount = EXCLUDED.credito_amount,
              ahorro_efectivo_amount = EXCLUDED.ahorro_efectivo_amount,
              ahorro_credito_amount = EXCLUDED.ahorro_credito_amount,
              expected_savings = EXCLUDED.expected_savings,
              needs_adjustment = EXCLUDED.needs_adjustment,
              updated_at = CURRENT_TIMESTAMP
            RETURNING *
          `;

          results.push(result);
        } catch (budgetError) {
          console.error(
            `Error updating budget for category ${category_id}:`,
            budgetError
          );
          errors.push({
            category_id,
            error:
              budgetError instanceof Error
                ? budgetError.message
                : String(budgetError),
          });
        }
      }

      // If there were any errors, return them
      if (errors.length > 0) {
        return NextResponse.json(
          {
            error: "Algunos presupuestos no pudieron ser actualizados",
            code: "PARTIAL_UPDATE_FAILURE",
            budget_errors: errors,
            successful_updates: results.length,
          },
          { status: 207 } // Multi-Status
        );
      }

      // Update simulation's updated_at timestamp
      await sql`
        UPDATE simulations 
        SET updated_at = CURRENT_TIMESTAMP 
        WHERE id = ${simulationId}
      `;

      // Perform final consistency check
      const updatedBudgets = await sql`
        SELECT * FROM simulation_budgets WHERE simulation_id = ${simulationId}
      `;

      const allCategories = await sql`
        SELECT id, name FROM categories ORDER BY name
      `;

      const finalConsistencyCheck = checkSimulationDataConsistency(
        simulation,
        updatedBudgets,
        allCategories
      );

      // Log successful update
      console.log(
        `Simulation budgets updated successfully: Simulation ID ${simulationId}, Updated ${results.length} budgets`
      );

      return NextResponse.json({
        success: true,
        message: "Presupuestos de simulación actualizados exitosamente",
        updated_count: results.length,
        data_loss_risk: dataLossRisk,
        consistency_check: finalConsistencyCheck,
        simulation: {
          id: simulationId,
          name: simulation.name,
        },
      });
    } catch (transactionError) {
      console.error(
        "Transaction error during budget update:",
        transactionError
      );
      throw transactionError;
    }
  } catch (error) {
    console.error("Error updating simulation budgets:", error);

    if (error instanceof Error) {
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        return NextResponse.json(
          {
            error: "Error de integridad de datos al actualizar presupuestos",
            code: "FOREIGN_KEY_CONSTRAINT",
            details: "Algunos datos relacionados no son válidos",
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

      if (error.message.includes("duplicate key")) {
        return NextResponse.json(
          {
            error: "Error de duplicación de datos",
            code: "DUPLICATE_BUDGET",
            details: "Ya existe un presupuesto para una de las categorías",
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor al actualizar presupuestos",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
