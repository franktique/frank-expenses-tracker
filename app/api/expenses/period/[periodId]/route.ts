import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { periodId: string } }) {
  try {
    const periodId = params.periodId
    const expenses = await sql`
      SELECT e.*, c.name as category_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE e.period_id = ${periodId}
      ORDER BY e.date DESC
    `

    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching expenses by period:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
