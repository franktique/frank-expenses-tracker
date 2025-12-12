import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { DashboardData, BudgetSummaryItem } from "@/types/dashboard";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get("fund_id");

    // Get active period
    const [activePeriod] = await sql`
      SELECT * FROM periods WHERE is_open = true
    `;

    if (!activePeriod) {
      return NextResponse.json({
        activePeriod: null,
        totalIncome: 0,
        totalExpenses: 0,
        budgetSummary: [],
        fundFilter: fundId,
      });
    }

    // Get total income for active period (with optional fund filtering)
    let incomeQuery;
    if (fundId) {
      incomeQuery = sql`
        SELECT COALESCE(SUM(amount), 0) as total_income
        FROM incomes
        WHERE period_id = ${activePeriod.id}
          AND fund_id = ${fundId}
      `;
    } else {
      incomeQuery = sql`
        SELECT COALESCE(SUM(amount), 0) as total_income
        FROM incomes
        WHERE period_id = ${activePeriod.id}
      `;
    }
    const [incomeSummary] = await incomeQuery;

    // Get total expenses for active period (excluding pending, with optional fund filtering)
    let expenseQuery;
    if (fundId) {
      expenseQuery = sql`
        SELECT COALESCE(SUM(e.amount), 0) as total_expenses
        FROM expenses e
        JOIN categories c ON e.category_id = c.id
        WHERE e.period_id = ${activePeriod.id}
          AND c.fund_id = ${fundId}
          AND (e.pending IS NULL OR e.pending = false)
      `;
    } else {
      expenseQuery = sql`
        SELECT COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE period_id = ${activePeriod.id}
          AND (pending IS NULL OR pending = false)
      `;
    }
    const [expenseSummary] = await expenseQuery;

    // Get budget summary (with optional fund filtering)
    let budgetQuery;
    if (fundId) {
      budgetQuery = sql`
        WITH category_expenses AS (
          SELECT
            c.id as category_id,
            c.name as category_name,
            COALESCE(SUM(e.amount), 0) as total_amount,
            SUM(CASE WHEN e.payment_method = 'credit' THEN e.amount ELSE 0 END) as credit_amount,
            SUM(CASE WHEN e.payment_method = 'debit' THEN e.amount ELSE 0 END) as debit_amount,
            SUM(CASE WHEN e.payment_method = 'cash' THEN e.amount ELSE 0 END) as cash_amount,
            COALESCE(SUM(CASE WHEN e.pending = true THEN e.amount ELSE 0 END), 0) as pending_amount
          FROM categories c
          LEFT JOIN expenses e ON c.id = e.category_id AND e.period_id = ${activePeriod.id}
          WHERE c.fund_id = ${fundId}
          GROUP BY c.id, c.name
        ),
        category_budgets AS (
          SELECT 
            c.id as category_id,
            COALESCE(SUM(CASE WHEN b.payment_method = 'credit' THEN b.expected_amount ELSE 0 END), 0) as credit_budget,
            COALESCE(SUM(CASE WHEN b.payment_method IN ('cash', 'debit') THEN b.expected_amount ELSE 0 END), 0) as cash_debit_budget,
            COALESCE(SUM(b.expected_amount), 0) as expected_amount
          FROM categories c
          LEFT JOIN budgets b ON c.id = b.category_id AND b.period_id = ${activePeriod.id}
          WHERE c.fund_id = ${fundId}
          GROUP BY c.id
        )
        SELECT
          ce.category_id,
          ce.category_name,
          c.default_day,
          cb.credit_budget,
          cb.cash_debit_budget,
          cb.expected_amount,
          ce.total_amount - ce.pending_amount as confirmed_amount,
          ce.pending_amount,
          ce.total_amount,
          ce.credit_amount,
          ce.debit_amount,
          ce.cash_amount,
          (cb.expected_amount - ce.total_amount + ce.pending_amount) as remaining
        FROM category_expenses ce
        JOIN category_budgets cb ON ce.category_id = cb.category_id
        JOIN categories c ON ce.category_id = c.id
        WHERE cb.expected_amount > 0 OR ce.total_amount > 0
        ORDER BY ce.category_name
      `;
    } else {
      budgetQuery = sql`
        WITH category_expenses AS (
          SELECT
            c.id as category_id,
            c.name as category_name,
            COALESCE(SUM(e.amount), 0) as total_amount,
            SUM(CASE WHEN e.payment_method = 'credit' THEN e.amount ELSE 0 END) as credit_amount,
            SUM(CASE WHEN e.payment_method = 'debit' THEN e.amount ELSE 0 END) as debit_amount,
            SUM(CASE WHEN e.payment_method = 'cash' THEN e.amount ELSE 0 END) as cash_amount,
            COALESCE(SUM(CASE WHEN e.pending = true THEN e.amount ELSE 0 END), 0) as pending_amount
          FROM categories c
          LEFT JOIN expenses e ON c.id = e.category_id AND e.period_id = ${activePeriod.id}
          GROUP BY c.id, c.name
        ),
        category_budgets AS (
          SELECT 
            c.id as category_id,
            COALESCE(SUM(CASE WHEN b.payment_method = 'credit' THEN b.expected_amount ELSE 0 END), 0) as credit_budget,
            COALESCE(SUM(CASE WHEN b.payment_method IN ('cash', 'debit') THEN b.expected_amount ELSE 0 END), 0) as cash_debit_budget,
            COALESCE(SUM(b.expected_amount), 0) as expected_amount
          FROM categories c
          LEFT JOIN budgets b ON c.id = b.category_id AND b.period_id = ${activePeriod.id}
          GROUP BY c.id
        )
        SELECT
          ce.category_id,
          ce.category_name,
          c.default_day,
          cb.credit_budget,
          cb.cash_debit_budget,
          cb.expected_amount,
          ce.total_amount - ce.pending_amount as confirmed_amount,
          ce.pending_amount,
          ce.total_amount,
          ce.credit_amount,
          ce.debit_amount,
          ce.cash_amount,
          (cb.expected_amount - ce.total_amount + ce.pending_amount) as remaining
        FROM category_expenses ce
        JOIN category_budgets cb ON ce.category_id = cb.category_id
        JOIN categories c ON ce.category_id = c.id
        WHERE cb.expected_amount > 0 OR ce.total_amount > 0
        ORDER BY ce.category_name
      `;
    }
    const budgetSummary = await budgetQuery;

    // Log values for debugging
    console.log("API Dashboard Data:", {
      activePeriodId: activePeriod.id,
      activePeriodName: activePeriod.name,
      fundFilter: fundId,
      totalIncome: incomeSummary.total_income,
      totalIncome_type: typeof incomeSummary.total_income,
      totalExpenses: expenseSummary.total_expenses,
      totalExpenses_type: typeof expenseSummary.total_expenses,
      budgetSummaryCount: budgetSummary.length,
    });

    // Ensure values are numbers before returning
    const totalIncome = parseFloat(incomeSummary.total_income) || 0;
    const totalExpenses = parseFloat(expenseSummary.total_expenses) || 0;

    // Type-safe response construction
    const response: DashboardData & { fundFilter?: string | null } = {
      activePeriod,
      totalIncome,
      totalExpenses,
      budgetSummary: budgetSummary.map(
        (item: any): BudgetSummaryItem => ({
          category_id: item.category_id,
          category_name: item.category_name,
          default_day: item.default_day ?? null,
          credit_budget: parseFloat(item.credit_budget) || 0,
          cash_debit_budget: parseFloat(item.cash_debit_budget) || 0,
          expected_amount: parseFloat(item.expected_amount) || 0,
          total_amount: parseFloat(item.total_amount) || 0,
          confirmed_amount: parseFloat(item.confirmed_amount) || 0,
          pending_amount: parseFloat(item.pending_amount) || 0,
          credit_amount: parseFloat(item.credit_amount) || 0,
          debit_amount: parseFloat(item.debit_amount) || 0,
          cash_amount: parseFloat(item.cash_amount) || 0,
          remaining: parseFloat(item.remaining) || 0,
        })
      ),
      fundFilter: fundId,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
