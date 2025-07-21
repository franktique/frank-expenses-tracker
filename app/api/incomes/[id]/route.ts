import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [income] = await sql`
      SELECT i.*, p.name as period_name, i.event
      FROM incomes i
      LEFT JOIN periods p ON i.period_id = p.id
      WHERE i.id = ${id}
    `

    if (!income) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 })
    }

    return NextResponse.json(income)
  } catch (error) {
    console.error("Error fetching income:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { periodId, date, description, amount, event } = await request.json()

    if (!date || !description || typeof amount !== "number") {
      return NextResponse.json({ error: "Date, description, and amount are required" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    // Usar un valor predeterminado para periodId si no se proporciona
    let actualPeriodId = periodId

    if (!actualPeriodId) {
      // Intentar obtener el periodo activo
      const [activePeriod] = await sql`SELECT id FROM periods WHERE is_open = true LIMIT 1`

      if (activePeriod) {
        actualPeriodId = activePeriod.id
      } else {
        // Si no hay periodo activo, usar el periodo más reciente
        const [latestPeriod] = await sql`SELECT id FROM periods ORDER BY year DESC, month DESC LIMIT 1`

        if (latestPeriod) {
          actualPeriodId = latestPeriod.id
        } else {
          return NextResponse.json({ error: "No hay periodos disponibles. Crea un periodo primero." }, { status: 400 })
        }
      }
    }

    const [updatedIncome] = await sql`
      UPDATE incomes
      SET period_id = ${actualPeriodId}, date = ${date}, description = ${description}, amount = ${amount}, event = ${event || null}
      WHERE id = ${id}
      RETURNING *
    `

    if (!updatedIncome) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 })
    }

    return NextResponse.json(updatedIncome)
  } catch (error) {
    console.error("Error updating income:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [deletedIncome] = await sql`
      DELETE FROM incomes
      WHERE id = ${id}
      RETURNING *
    `

    if (!deletedIncome) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 })
    }

    return NextResponse.json(deletedIncome)
  } catch (error) {
    console.error("Error deleting income:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
