import { NextResponse } from "next/server"
import { sql } from "@neondatabase/serverless"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const periodId = searchParams.get("periodId")
    const paymentMethod = searchParams.get("paymentMethod")

    if (!periodId) {
      return NextResponse.json(
        { error: "Period ID is required" },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        g.id as grouper_id,
        g.name as grouper_name,
        COALESCE(SUM(t.amount), 0) as total_amount
      FROM groupers g
      LEFT JOIN categories c ON c.grouper_id = g.id
      LEFT JOIN transactions t ON t.category_id = c.id 
        AND t.period_id = $1
        ${paymentMethod !== 'all' ? 'AND t.payment_method = $2' : ''}
      GROUP BY g.id, g.name 
      ORDER BY g.name
    `

    const queryParams = paymentMethod !== 'all' 
      ? [periodId, paymentMethod]
      : [periodId]

    const result = await sql(query, queryParams)

    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Error in groupers API:', error)
    return NextResponse.json(
      { error: "Failed to fetch grouper data" },
      { status: 500 }
    )
  }
}
