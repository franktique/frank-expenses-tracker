import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

// GET /api/simulations/[id]/export - Get simulation data for Excel export
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
      SELECT id, name, description FROM simulations WHERE id = ${simulationId}
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

    // Get total income for this simulation
    const incomes = await sql`
      SELECT
        description,
        amount
      FROM simulation_incomes
      WHERE simulation_id = ${simulationId}
      ORDER BY created_at
    `;

    const totalIncome = incomes.reduce(
      (sum, income) => sum + Number(income.amount),
      0
    );

    // Get all categories
    const categories = await sql`
      SELECT id, name FROM categories ORDER BY name
    `;

    // Get simulation budgets with category information
    const budgets = await sql`
      SELECT
        sb.category_id,
        c.name as category_name,
        sb.efectivo_amount,
        sb.credito_amount
      FROM simulation_budgets sb
      JOIN categories c ON sb.category_id = c.id
      WHERE sb.simulation_id = ${simulationId}
      ORDER BY c.name
    `;

    // Calculate totals and balances
    let totalEfectivo = 0;
    let totalCredito = 0;
    let runningBalance = totalIncome;

    const budgetsWithBalances = budgets.map((budget) => {
      const efectivoAmount = Number(budget.efectivo_amount) || 0;
      const creditoAmount = Number(budget.credito_amount) || 0;
      const total = efectivoAmount + creditoAmount;

      totalEfectivo += efectivoAmount;
      totalCredito += creditoAmount;

      // Running balance only decreases with efectivo (cash) amounts
      runningBalance -= efectivoAmount;

      return {
        category_id: budget.category_id,
        category_name: budget.category_name,
        efectivo_amount: efectivoAmount,
        credito_amount: creditoAmount,
        total: total,
        balance: runningBalance,
      };
    });

    const totalGeneral = totalEfectivo + totalCredito;

    // Count categories with budget
    const categoryCount = budgetsWithBalances.filter((b) => b.total > 0).length;

    return NextResponse.json({
      simulation: {
        id: simulation.id,
        name: simulation.name,
        description: simulation.description,
      },
      incomes: incomes.map((income) => ({
        description: income.description,
        amount: Number(income.amount),
      })),
      totalIncome,
      budgets: budgetsWithBalances,
      totals: {
        efectivo: totalEfectivo,
        credito: totalCredito,
        general: totalGeneral,
      },
      categoryCount,
      totalCategories: categories.length,
    });
  } catch (error) {
    console.error("Error fetching simulation export data:", error);

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
        error: "Error interno del servidor al cargar datos de exportación",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
