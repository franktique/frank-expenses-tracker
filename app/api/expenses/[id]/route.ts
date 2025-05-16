import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [expense] = await sql`
      SELECT e.*, c.name as category_name, p.name as period_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      WHERE e.id = ${id}
    `

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error("Error fetching expense:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { categoryId, date, event, paymentMethod, description, amount } = await request.json()

    if (!categoryId || !date || !paymentMethod || !description || typeof amount !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    const [updatedExpense] = await sql`
      UPDATE expenses
      SET 
        category_id = ${categoryId},
        date = ${date},
        event = ${event || null},
        payment_method = ${paymentMethod},
        description = ${description},
        amount = ${amount}
      WHERE id = ${id}
      RETURNING *
    `

    if (!updatedExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json(updatedExpense)
  } catch (error) {
    console.error("Error updating expense:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [deletedExpense] = await sql`
      DELETE FROM expenses
      WHERE id = ${id}
      RETURNING *
    `

    if (!deletedExpense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 })
    }

    return NextResponse.json(deletedExpense)
  } catch (error) {
    console.error("Error deleting expense:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
