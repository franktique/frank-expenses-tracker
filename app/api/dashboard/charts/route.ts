import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const periodId = searchParams.get('periodId')
    
    if (!periodId) {
      return NextResponse.json({ error: "Period ID is required" }, { status: 400 })
    }

    // Get expenses by date and category for the selected period
    const expensesByDate = await sql`
      SELECT 
        e.date, 
        SUM(e.amount) as total_amount,
        e.payment_method,
        c.id as category_id,
        c.name as category_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.period_id = ${periodId}
      GROUP BY e.date, e.payment_method, c.id, c.name
      ORDER BY e.date ASC
    `

    // Get expenses by category for the selected period
    const expensesByCategory = await sql`
      SELECT 
        c.id as category_id,
        c.name as category_name,
        SUM(e.amount) as total_amount
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.period_id = ${periodId}
      GROUP BY c.id, c.name
      ORDER BY total_amount DESC
    `

    return NextResponse.json({
      expensesByDate,
      expensesByCategory
    })
  } catch (error) {
    console.error("Error fetching chart data:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
