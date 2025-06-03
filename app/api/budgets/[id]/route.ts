import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [budget] = await sql`
      SELECT b.*, c.name as category_name, p.name as period_name
      FROM budgets b
      JOIN categories c ON b.category_id = c.id
      JOIN periods p ON b.period_id = p.id
      WHERE b.id = ${id}
    `

    if (!budget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 })
    }

    return NextResponse.json(budget)
  } catch (error) {
    console.error("Error fetching budget:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { expectedAmount, paymentMethod } = await request.json()

    if (typeof expectedAmount !== "number" || expectedAmount < 0) {
      return NextResponse.json({ error: "Expected amount must be a positive number" }, { status: 400 })
    }

    // Use different SQL queries based on whether payment method is provided
    let updatedBudget;
    
    if (paymentMethod) {
      // Update both expected amount and payment method
      [updatedBudget] = await sql`
        UPDATE budgets
        SET 
          expected_amount = ${expectedAmount},
          payment_method = ${paymentMethod}
        WHERE id = ${id}
        RETURNING *
      `;
    } else {
      // Only update expected amount
      [updatedBudget] = await sql`
        UPDATE budgets
        SET expected_amount = ${expectedAmount}
        WHERE id = ${id}
        RETURNING *
      `;
    }

    if (!updatedBudget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 })
    }

    return NextResponse.json(updatedBudget)
  } catch (error) {
    console.error("Error updating budget:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [deletedBudget] = await sql`
      DELETE FROM budgets
      WHERE id = ${id}
      RETURNING *
    `

    if (!deletedBudget) {
      return NextResponse.json({ error: "Budget not found" }, { status: 404 })
    }

    return NextResponse.json(deletedBudget)
  } catch (error) {
    console.error("Error deleting budget:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
