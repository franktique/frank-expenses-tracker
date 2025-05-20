import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"

export async function GET() {
  try {
    // Using PostgreSQL's AT TIME ZONE to handle dates consistently
    const incomes = await sql`
      SELECT 
        i.id,
        i.period_id,
        i.description,
        i.amount,
        -- Convert date to Colombia time zone and format as YYYY-MM-DD
        TO_CHAR(i.date AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD') as date,
        p.name as period_name
      FROM incomes i
      LEFT JOIN periods p ON i.period_id = p.id
      ORDER BY i.date DESC
    `
    return NextResponse.json(incomes)
  } catch (error) {
    console.error("Error fetching incomes:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { periodId, date, description, amount } = await request.json()

    if (!date || !description || typeof amount !== "number") {
      return NextResponse.json({ error: "Date, description, and amount are required" }, { status: 400 })
    }

    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be a positive number" }, { status: 400 })
    }

    // Usar un valor predeterminado para periodId si no se proporciona
    let actualPeriodId = periodId

    if (!actualPeriodId) {
      // Intentar obtener el periodo activo
      const [activePeriod] = await sql`SELECT id FROM periods WHERE is_open = true LIMIT 1`

      if (activePeriod) {
        actualPeriodId = activePeriod.id
      } else {
        // Si no hay periodo activo, usar el periodo más reciente
        const [latestPeriod] = await sql`SELECT id FROM periods ORDER BY year DESC, month DESC LIMIT 1`

        if (latestPeriod) {
          actualPeriodId = latestPeriod.id
        } else {
          return NextResponse.json({ error: "No hay periodos disponibles. Crea un periodo primero." }, { status: 400 })
        }
      }
    }

    // Estandarizar la fecha para asegurar que sea consistente con horario de Colombia
    let dateToSave = date;
    
    // Si es un string ISO, asegurarse de que use solo la parte de fecha
    if (typeof date === 'string' && date.includes('T')) {
      // Extraer solo la parte de la fecha (YYYY-MM-DD)
      dateToSave = date.split('T')[0];
    }
    
    // Insertar el ingreso con el periodo
    const [newIncome] = await sql`
      INSERT INTO incomes (period_id, date, description, amount)
      VALUES (${actualPeriodId}, ${dateToSave}, ${description}, ${amount})
      RETURNING *
    `

    return NextResponse.json(newIncome)
  } catch (error) {
    console.error("Error creating income:", error)
    return NextResponse.json({ error: (error as Error).message }, { status: 500 })
  }
}
