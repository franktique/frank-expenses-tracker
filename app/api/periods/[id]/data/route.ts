import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

/**
 * GET /api/periods/[id]/data
 *
 * Fetches all data associated with a period, formatted for easy copying to simulations.
 * Returns incomes (aggregated by description) and budgets (grouped by category and payment method).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const periodId = id;

    // Validate period ID format (UUID)
    if (!periodId || typeof periodId !== "string") {
      return NextResponse.json(
        {
          error: "ID de período inválido",
          code: "INVALID_PERIOD_ID",
        },
        { status: 400 }
      );
    }

    // Check if period exists and get its metadata
    const [period] = await sql`
      SELECT id, name, month, year, is_open
      FROM periods
      WHERE id = ${periodId}
    `;

    if (!period) {
      return NextResponse.json(
        {
          error: "Período no encontrado",
          code: "PERIOD_NOT_FOUND",
          period_id: periodId,
        },
        { status: 404 }
      );
    }

    // Fetch incomes aggregated by description
    // This groups incomes with the same description and sums their amounts
    interface IncomeRow {
      description: string;
      total_amount: string | number;
      count: string | number;
    }

    // Fetch incomes aggregated by description
    // This groups incomes with the same description and sums their amounts
    const incomes = (await sql`
      SELECT
        description,
        SUM(amount) as total_amount,
        COUNT(*) as count
      FROM incomes
      WHERE period_id = ${periodId}
      GROUP BY description
      ORDER BY description
    `) as unknown as IncomeRow[];

    // Debug: First check what raw budgets exist for this period
    const rawBudgets = await sql`
      SELECT b.id, b.category_id, c.name as category_name, b.payment_method, b.expected_amount
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.period_id = ${periodId}
      LIMIT 5
    `;
    console.log(`=== DEBUG: Period ${periodId} raw budgets (first 5) ===`);
    console.log(rawBudgets);

    interface BudgetRow {
      category_id: number;
      category_name: string;
      efectivo_amount: string | number;
      credito_amount: string | number;
    }

    // Fetch budgets grouped by category and split by payment method
    // This transforms the normalized budget structure into the simulation format
    // payment_method values: 'cash' = efectivo, 'credit' = credito, 'debit' = debito
    // We combine 'cash' and 'debit' as "efectivo_amount" for the simulation
    const budgets = (await sql`
      SELECT
        b.category_id,
        c.name as category_name,
        SUM(CASE WHEN b.payment_method IN ('cash', 'debit') THEN b.expected_amount ELSE 0 END) as efectivo_amount,
        SUM(CASE WHEN b.payment_method = 'credit' THEN b.expected_amount ELSE 0 END) as credito_amount
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      WHERE b.period_id = ${periodId}
      GROUP BY b.category_id, c.name
      ORDER BY c.name
    `) as unknown as BudgetRow[];

    // Debug: Log aggregated budgets
    console.log(`=== DEBUG: Period ${periodId} aggregated budgets (${budgets.length} categories) ===`);
    if (budgets.length > 0) {
      console.log("First 3 budgets:", budgets.slice(0, 3));
    }

    // Calculate totals for preview
    const totalIncome = incomes.reduce(
      (sum: number, income: IncomeRow) => sum + Number(income.total_amount),
      0
    );

    const totalBudgetEfectivo = budgets.reduce(
      (sum: number, budget: BudgetRow) => sum + Number(budget.efectivo_amount),
      0
    );

    const totalBudgetCredito = budgets.reduce(
      (sum: number, budget: BudgetRow) => sum + Number(budget.credito_amount),
      0
    );

    const totalBudget = totalBudgetEfectivo + totalBudgetCredito;

    // Return formatted data
    return NextResponse.json({
      period: {
        id: period.id,
        name: period.name,
        month: period.month,
        year: period.year,
        is_open: period.is_open,
      },
      incomes: incomes.map((income: IncomeRow) => ({
        description: income.description,
        total_amount: Number(income.total_amount),
        count: Number(income.count),
      })),
      budgets: budgets.map((budget: BudgetRow) => ({
        category_id: budget.category_id,
        category_name: budget.category_name,
        efectivo_amount: Number(budget.efectivo_amount),
        credito_amount: Number(budget.credito_amount),
      })),
      totals: {
        total_income: totalIncome,
        total_budget_efectivo: totalBudgetEfectivo,
        total_budget_credito: totalBudgetCredito,
        total_budget: totalBudget,
      },
      counts: {
        income_entries: incomes.length,
        budget_categories: budgets.length,
      },
    });
  } catch (error) {
    console.error("Error fetching period data:", error);

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

      // SQL syntax errors
      if (error.message.includes("syntax")) {
        return NextResponse.json(
          {
            error: "Error en la consulta de datos",
            code: "SQL_ERROR",
            details: error.message,
          },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      {
        error: "Error interno del servidor al cargar datos del período",
        code: "INTERNAL_SERVER_ERROR",
        retryable: true,
      },
      { status: 500 }
    );
  }
}
