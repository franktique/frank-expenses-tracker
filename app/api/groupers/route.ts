import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const groupers = await sql`
      SELECT g.id, g.name, COUNT(gc.category_id) AS category_count
      FROM groupers g
      LEFT JOIN grouper_categories gc ON g.id = gc.grouper_id
      GROUP BY g.id, g.name
      ORDER BY g.name
    `
    return NextResponse.json(groupers)
  } catch (error) {
    console.error("Error fetching groupers:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [newGrouper] = await sql`
      INSERT INTO groupers (name)
      VALUES (${name})
      RETURNING *
    `

    return NextResponse.json(newGrouper)
  } catch (error) {
    console.error("Error creating grouper:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
