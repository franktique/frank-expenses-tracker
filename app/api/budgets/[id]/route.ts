import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { DateUtils } from "@/types/funds"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [budget] = await sql`
      SELECT b.*, c.name as category_name, p.name as period_name, c.recurring_date
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
    const { expectedAmount, paymentMethod, expectedDate } = await request.json()

    if (typeof expectedAmount !== "number" || expectedAmount < 0) {
      return NextResponse.json({ error: "Expected amount must be a positive number" }, { status: 400 })
    }

    // Validate expected_date if provided
    if (expectedDate) {
      const parsedDate = new Date(expectedDate)
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json({ error: "Invalid expected date format" }, { status: 400 })
      }
    }

    // Build update query dynamically based on provided fields
    let updateFields = []
    let updateValues = []
    let paramIndex = 1

    if (expectedAmount !== undefined) {
      updateFields.push(`expected_amount = $${paramIndex}`)
      updateValues.push(expectedAmount)
      paramIndex++
    }

    if (paymentMethod !== undefined) {
      updateFields.push(`payment_method = $${paramIndex}`)
      updateValues.push(paymentMethod)
      paramIndex++
    }

    if (expectedDate !== undefined) {
      updateFields.push(`expected_date = $${paramIndex}`)
      updateValues.push(expectedDate)
      paramIndex++
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 })
    }

    updateFields.push(`updated_at = NOW()`)
    updateValues.push(id)

    const query = `
      UPDATE budgets
      SET ${updateFields.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const [updatedBudget] = await sql.unsafe(query, updateValues)

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
