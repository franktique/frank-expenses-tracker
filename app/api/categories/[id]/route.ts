import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [category] = await sql`SELECT * FROM categories WHERE id = ${id}`

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error fetching category:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const { name } = await request.json()

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const [updatedCategory] = await sql`
      UPDATE categories
      SET name = ${name}
      WHERE id = ${id}
      RETURNING *
    `

    if (!updatedCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error("Error updating category:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const [deletedCategory] = await sql`
      DELETE FROM categories
      WHERE id = ${id}
      RETURNING *
    `

    if (!deletedCategory) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    return NextResponse.json(deletedCategory)
  } catch (error) {
    console.error("Error deleting category:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
