import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Get active period
    const [activePeriod] = await sql`
      SELECT * FROM periods WHERE is_open = true
    `

    if (!activePeriod) {
      return NextResponse.json({
        activePeriod: null,
        totalIncome: 0,
        totalExpenses: 0,
        budgetSummary: [],
      })
    }

    // Get total income
    const [incomeSummary] = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_income
      FROM incomes
    `

    // Get total expenses for active period
    const [expenseSummary] = await sql`
      SELECT COALESCE(SUM(amount), 0) as total_expenses
      FROM expenses
      WHERE period_id = ${activePeriod.id}
    `

    // Get budget summary
    const budgetSummary = await sql`
      WITH category_expenses AS (
        SELECT 
          c.id as category_id,
          c.name as category_name,
          COALESCE(SUM(e.amount), 0) as total_amount,
          SUM(CASE WHEN e.payment_method = 'credit' THEN e.amount ELSE 0 END) as credit_amount,
          SUM(CASE WHEN e.payment_method = 'debit' THEN e.amount ELSE 0 END) as debit_amount,
          SUM(CASE WHEN e.payment_method = 'cash' THEN e.amount ELSE 0 END) as cash_amount
        FROM categories c
        LEFT JOIN expenses e ON c.id = e.category_id AND e.period_id = ${activePeriod.id}
        GROUP BY c.id, c.name
      ),
      category_budgets AS (
        SELECT 
          c.id as category_id,
          COALESCE(b.expected_amount, 0) as expected_amount
        FROM categories c
        LEFT JOIN budgets b ON c.id = b.category_id AND b.period_id = ${activePeriod.id}
      )
      SELECT 
        ce.category_id,
        ce.category_name,
        cb.expected_amount,
        ce.total_amount,
        ce.credit_amount,
        ce.debit_amount,
        ce.cash_amount,
        (cb.expected_amount - ce.total_amount) as remaining
      FROM category_expenses ce
      JOIN category_budgets cb ON ce.category_id = cb.category_id
      WHERE cb.expected_amount > 0 OR ce.total_amount > 0
      ORDER BY ce.category_name
    `

    return NextResponse.json({
      activePeriod,
      totalIncome: incomeSummary.total_income,
      totalExpenses: expenseSummary.total_expenses,
      budgetSummary,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
