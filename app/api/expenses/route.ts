import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Simplificando para usar directamente las fechas almacenadas
    const expenses = await sql`
      SELECT 
        e.id,
        e.category_id,
        e.period_id,
        e.payment_method,
        e.description,
        e.amount,
        e.event,
        -- Usar directamente el valor de fecha sin conversiones
        e.date,
        c.name as category_name, 
        p.name as period_name
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      ORDER BY e.date DESC
    `
    return NextResponse.json(expenses)
  } catch (error) {
    console.error("Error fetching expenses:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { categoryId, periodId, date, event, paymentMethod, description, amount } = await request.json()

    if (!categoryId || !periodId || !date || !paymentMethod || !description || typeof amount !== "number") {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }
    
    // Estandarizar la fecha para asegurar que sea consistente con horario de Colombia
    let dateToSave = date;
    
    // Si es un string ISO, asegurarse de que use solo la parte de fecha
    if (typeof date === 'string' && date.includes('T')) {
      // Extraer solo la parte de la fecha (YYYY-MM-DD)
      dateToSave = date.split('T')[0];
    }

    const [newExpense] = await sql`
      INSERT INTO expenses (category_id, period_id, date, event, payment_method, description, amount)
      VALUES (${categoryId}, ${periodId}, ${dateToSave}, ${event || null}, ${paymentMethod}, ${description}, ${amount})
      RETURNING *
    `

    return NextResponse.json(newExpense)
  } catch (error) {
    console.error("Error creating expense:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
