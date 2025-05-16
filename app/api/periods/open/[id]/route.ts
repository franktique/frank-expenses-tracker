import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    // First, close all periods
    await sql`UPDATE periods SET is_open = false`

    // Then, open the selected period
    const [openedPeriod] = await sql`
      UPDATE periods
      SET is_open = true
      WHERE id = ${id}
      RETURNING *
    `

    if (!openedPeriod) {
      return NextResponse.json({ error: "Period not found" }, { status: 404 })
    }

    return NextResponse.json(openedPeriod)
  } catch (error) {
    console.error("Error opening period:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
