import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(params.id)
    
    if (isNaN(grouperId)) {
      return NextResponse.json({ error: "Invalid grouper ID" }, { status: 400 })
    }

    // Get categories assigned to this grouper
    const assignedCategories = await sql`
      SELECT c.id, c.name
      FROM categories c
      JOIN grouper_categories gc ON c.id = gc.category_id
      WHERE gc.grouper_id = ${grouperId}
      ORDER BY c.name
    `

    return NextResponse.json(assignedCategories)
  } catch (error) {
    console.error(`Error fetching categories for grouper ${params.id}:`, error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(params.id)
    
    if (isNaN(grouperId)) {
      return NextResponse.json({ error: "Invalid grouper ID" }, { status: 400 })
    }

    const { categoryId } = await request.json()

    if (!categoryId || typeof categoryId !== "string" || categoryId.trim() === "") {
      return NextResponse.json({ error: "Valid categoryId (UUID string) is required" }, { status: 400 })
    }

    // Check if relationship already exists
    const [existingRelation] = await sql`
      SELECT * FROM grouper_categories
      WHERE grouper_id = ${grouperId} AND category_id = ${categoryId}
    `

    if (existingRelation) {
      return NextResponse.json({ error: "Category is already assigned to this grouper" }, { status: 400 })
    }

    // Add the category to the grouper
    const [newRelation] = await sql`
      INSERT INTO grouper_categories (grouper_id, category_id)
      VALUES (${grouperId}, ${categoryId})
      RETURNING *
    `

    return NextResponse.json(newRelation)
  } catch (error) {
    console.error(`Error adding category to grouper ${params.id}:`, error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(params.id)
    const url = new URL(request.url)
    const categoryId = url.searchParams.get('categoryId')
    
    if (isNaN(grouperId) || !categoryId || typeof categoryId !== 'string' || categoryId.trim() === '') {
      return NextResponse.json({ error: "Valid grouperId (number) and categoryId (UUID string) are required" }, { status: 400 })
    }

    // Remove the category from the grouper
    const result = await sql`
      DELETE FROM grouper_categories
      WHERE grouper_id = ${grouperId} AND category_id = ${categoryId}
    `

    // Check if any rows were affected by the delete operation
    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Relation not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(`Error removing category from grouper ${params.id}:`, error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
