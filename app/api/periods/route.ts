import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const periods = await sql`
      SELECT * FROM periods 
      ORDER BY year DESC, month DESC
    `
    return NextResponse.json(periods)
  } catch (error) {
    console.error("Error fetching periods:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, month, year } = await request.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    if (typeof month !== "number" || month < 0 || month > 11) {
      return NextResponse.json({ error: "Month must be a number between 0 and 11" }, { status: 400 })
    }

    if (typeof year !== "number" || year < 2000) {
      return NextResponse.json({ error: "Year must be a valid number" }, { status: 400 })
    }

    const [newPeriod] = await sql`
      INSERT INTO periods (name, month, year, is_open)
      VALUES (${name}, ${month}, ${year}, false)
      RETURNING *
    `

    return NextResponse.json(newPeriod)
  } catch (error) {
    console.error("Error creating period:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
