import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const expenses = await sql`
      SELECT e.*, c.name as category_name, p.name as period_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      ORDER BY e.date DESC
    `
    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, periodId, date, event, paymentMethod, description, amount } = await request.json()

    if (!categoryId || !periodId || !date || !paymentMethod || !description || typeof amount !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    const [newExpense] = await sql`
      INSERT INTO expenses (category_id, period_id, date, event, payment_method, description, amount)
      VALUES (${categoryId}, ${periodId}, ${date}, ${event || null}, ${paymentMethod}, ${description}, ${amount})
      RETURNING *
    `

    return NextResponse.json(newExpense)
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
