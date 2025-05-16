import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    const categories = await sql`SELECT * FROM categories ORDER BY name`
    return NextResponse.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [newCategory] = await sql`
      INSERT INTO categories (name)
      VALUES (${name})
      RETURNING *
    `

    return NextResponse.json(newCategory)
  } catch (error) {
    console.error("Error creating category:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
