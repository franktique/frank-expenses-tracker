import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET(
  request: NextRequest,
  { params: routeParams }: { params: { id: string } }
) {
  try {
    const grouperId = parseInt(routeParams.id)
    const url = new URL(request.url)
    const periodId = url.searchParams.get('periodId')
    const paymentMethod = url.searchParams.get('paymentMethod')
    
    if (isNaN(grouperId) || !periodId) {
      return NextResponse.json({ error: "Valid grouperId and periodId are required" }, { status: 400 })
    }

    // Build SQL query using template literals
    const periodIdNum = parseInt(periodId)
    let categoryStats;
    
    if (paymentMethod && paymentMethod !== 'all') {
      // Query with payment method filter
      categoryStats = await sql`
        SELECT 
          c.id as category_id, 
          c.name as category_name,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM 
          categories c
        JOIN grouper_categories gc ON c.id = gc.category_id
        LEFT JOIN expenses e ON c.id = e.category_id
        WHERE 
          gc.grouper_id = ${grouperId}
          AND e.period_id = ${periodIdNum}
          AND e.payment_method = ${paymentMethod}
        GROUP BY 
          c.id, 
          c.name
        ORDER BY 
          total_amount DESC
      `
    } else {
      // Query without payment method filter
      categoryStats = await sql`
        SELECT 
          c.id as category_id, 
          c.name as category_name,
          COALESCE(SUM(e.amount), 0) as total_amount
        FROM 
          categories c
        JOIN grouper_categories gc ON c.id = gc.category_id
        LEFT JOIN expenses e ON c.id = e.category_id
        WHERE 
          gc.grouper_id = ${grouperId}
          AND e.period_id = ${periodIdNum}
        GROUP BY 
          c.id, 
          c.name
        ORDER BY 
          total_amount DESC
      `
    }

    return NextResponse.json(categoryStats)
  } catch (error) {
    console.error(`Error fetching category statistics for grouper ${routeParams.id}:`, error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
