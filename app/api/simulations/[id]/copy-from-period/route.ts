import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { z } from "zod";

/**
 * Copy Period Data to Simulation Request Schema
 */
const CopyFromPeriodSchema = z.object({
  period_id: z.string().uuid("ID de período inválido"),
  mode: z
    .enum(["merge", "replace"])
    .default("merge")
    .describe("Modo de copia: merge agrega a los datos existentes, replace los reemplaza"),
});

/**
 * POST /api/simulations/[id]/copy-from-period
 *
 * Copies income and budget data from a period to a simulation.
 * Supports two modes:
 * - merge: Adds period data to existing simulation data
 * - replace: Replaces existing simulation data with period data
 */
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
          error: "ID de simulación inválido",
          code: "INVALID_SIMULATION_ID",
        },
        { status: 400 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = CopyFromPeriodSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Datos de solicitud inválidos",
          code: "INVALID_REQUEST_DATA",
          validation_errors: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { period_id, mode } = validation.data;

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

    // Check if period exists and get its data
    const [period] = await sql`
      SELECT id, name, month, year FROM periods WHERE id = ${period_id}
    `;

    if (!period) {
      return NextResponse.json(
        {
          error: "Período no encontrado",
          code: "PERIOD_NOT_FOUND",
          period_id,
        },
        { status: 404 }
      );
    }

    // Get period incomes (aggregated by description)
    const periodIncomes = await sql`
      SELECT
        description,
        SUM(amount) as total_amount
      FROM incomes
      WHERE period_id = ${period_id}
      GROUP BY description
    `;

    // Get period budgets (grouped by category and payment method)
    // payment_method values: 'cash' = efectivo, 'credit' = credito, 'debit' = debito
    // We combine 'cash' and 'debit' as "efectivo_amount" for the simulation
    const periodBudgets = await sql`
      SELECT
        b.category_id,
        SUM(CASE WHEN b.payment_method IN ('cash', 'debit') THEN b.expected_amount ELSE 0 END) as efectivo_amount,
        SUM(CASE WHEN b.payment_method = 'credit' THEN b.expected_amount ELSE 0 END) as credito_amount
      FROM budgets b
      WHERE b.period_id = ${period_id}
      GROUP BY b.category_id
    `;

    // Debug logging
    console.log(`=== COPY: Period ${period_id} budgets query returned ${periodBudgets.length} categories ===`);
    if (periodBudgets.length > 0) {
      console.log("Sample budgets:", periodBudgets.slice(0, 3));
    }

    // Check if period has any data
    if (periodIncomes.length === 0 && periodBudgets.length === 0) {
      return NextResponse.json(
        {
          error: "El período seleccionado no contiene datos para copiar",
          code: "EMPTY_PERIOD",
          period: {
            id: period.id,
            name: period.name,
          },
        },
        { status: 400 }
      );
    }

    // If mode is "replace", delete existing simulation data
    if (mode === "replace") {
      await sql`DELETE FROM simulation_incomes WHERE simulation_id = ${simulationId}`;
      await sql`DELETE FROM simulation_budgets WHERE simulation_id = ${simulationId}`;
    }

    // Copy incomes to simulation
    let copiedIncomesCount = 0;
    for (const income of periodIncomes) {
      try {
        await sql`
          INSERT INTO simulation_incomes (simulation_id, description, amount)
          VALUES (${simulationId}, ${income.description}, ${income.total_amount})
        `;
        copiedIncomesCount++;
      } catch (incomeError) {
        console.error(
          `Error copying income "${income.description}":`,
          incomeError
        );
        // Continue with other incomes even if one fails
      }
    }

    // Copy budgets to simulation
    let copiedBudgetsCount = 0;
    const budgetErrors: Array<{ category_id: string; error: string }> = [];

    for (const budget of periodBudgets) {
      try {
        // Verify category exists
        const [category] = await sql`
          SELECT id, name FROM categories WHERE id = ${budget.category_id}
        `;

        if (!category) {
          budgetErrors.push({
            category_id: budget.category_id,
            error: "Categoría no encontrada",
          });
          continue;
        }

        const efectivoAmount = Number(budget.efectivo_amount) || 0;
        const creditoAmount = Number(budget.credito_amount) || 0;

        // Skip budgets with zero amounts
        if (efectivoAmount === 0 && creditoAmount === 0) {
          console.log(`Skipping budget for category ${budget.category_id} - both amounts are 0`);
          continue;
        }

        if (mode === "merge") {
          // Merge mode: Use UPSERT to add to existing or create new
          await sql`
            INSERT INTO simulation_budgets (simulation_id, category_id, efectivo_amount, credito_amount)
            VALUES (${simulationId}, ${budget.category_id}, ${efectivoAmount}, ${creditoAmount})
            ON CONFLICT (simulation_id, category_id)
            DO UPDATE SET
              efectivo_amount = simulation_budgets.efectivo_amount + EXCLUDED.efectivo_amount,
              credito_amount = simulation_budgets.credito_amount + EXCLUDED.credito_amount,
              updated_at = CURRENT_TIMESTAMP
          `;
        } else {
          // Replace mode: Direct insert (existing data was already deleted)
          await sql`
            INSERT INTO simulation_budgets (simulation_id, category_id, efectivo_amount, credito_amount)
            VALUES (${simulationId}, ${budget.category_id}, ${efectivoAmount}, ${creditoAmount})
            ON CONFLICT (simulation_id, category_id)
            DO UPDATE SET
              efectivo_amount = EXCLUDED.efectivo_amount,
              credito_amount = EXCLUDED.credito_amount,
              updated_at = CURRENT_TIMESTAMP
          `;
        }

        copiedBudgetsCount++;
      } catch (budgetError) {
        console.error(
          `Error copying budget for category ${budget.category_id}:`,
          budgetError
        );
        budgetErrors.push({
          category_id: budget.category_id,
          error:
            budgetError instanceof Error
              ? budgetError.message
              : "Error desconocido",
        });
      }
    }

    // Update simulation's updated_at timestamp
    await sql`
      UPDATE simulations
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = ${simulationId}
    `;

    // Calculate totals for response
    const totalIncome = periodIncomes.reduce(
      (sum, income) => sum + Number(income.total_amount),
      0
    );

    const totalBudgetEfectivo = periodBudgets.reduce(
      (sum, budget) => sum + Number(budget.efectivo_amount),
      0
    );

    const totalBudgetCredito = periodBudgets.reduce(
      (sum, budget) => sum + Number(budget.credito_amount),
      0
    );

    // Log successful copy
    console.log(
      `Period data copied to simulation: Simulation ID ${simulationId}, Period ID ${period_id}, ` +
        `Mode: ${mode}, Incomes: ${copiedIncomesCount}, Budgets: ${copiedBudgetsCount}`
    );

    // Build response
    const response: any = {
      success: true,
      message:
        mode === "replace"
          ? "Datos del período copiados exitosamente (reemplazando datos existentes)"
          : "Datos del período copiados exitosamente (agregados a datos existentes)",
      mode,
      copied: {
        incomes_count: copiedIncomesCount,
        budgets_count: copiedBudgetsCount,
      },
      summary: {
        total_income: totalIncome,
        total_budget_efectivo: totalBudgetEfectivo,
        total_budget_credito: totalBudgetCredito,
        total_budget: totalBudgetEfectivo + totalBudgetCredito,
      },
      source: {
        period_id: period.id,
        period_name: period.name,
        period_month: period.month,
        period_year: period.year,
      },
      destination: {
        simulation_id: simulation.id,
        simulation_name: simulation.name,
      },
    };

    // Include errors if any occurred
    if (budgetErrors.length > 0) {
      response.partial_success = true;
      response.errors = budgetErrors;
      response.message +=
        ". Algunos presupuestos no pudieron ser copiados.";
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Error copying period data to simulation:", error);

    if (error instanceof Error) {
      // Database connection errors
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

      // Foreign key constraint errors
      if (
        error.message.includes("foreign key") ||
        error.message.includes("constraint")
      ) {
        return NextResponse.json(
          {
            error: "Error de integridad de datos al copiar",
            code: "FOREIGN_KEY_CONSTRAINT",
            details: error.message,
          },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor al copiar datos del período",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
