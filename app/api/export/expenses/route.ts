import { NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Get all expenses with details needed for export
    const expenses = await sql`
      SELECT 
        e.id,
        e.date,
        c.name as category_name,
        p.name as period_name, 
        e.payment_method,
        e.description,
        e.event,
        e.amount
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      ORDER BY e.date DESC
    `
    
    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error exporting expenses:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
