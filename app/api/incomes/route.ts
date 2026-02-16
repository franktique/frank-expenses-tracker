import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { CreateIncomeSchema, DEFAULT_FUND_NAME } from '@/types/funds';

export async function GET() {
  try {
    // Include fund information in the response
    const incomes = await sql`
      SELECT 
        i.id,
        i.period_id,
        i.description,
        i.amount,
        i.event,
        i.date,
        i.fund_id,
        p.name as period_name,
        f.name as fund_name
      FROM incomes i
      LEFT JOIN periods p ON i.period_id = p.id
      LEFT JOIN funds f ON i.fund_id = f.id
      ORDER BY i.date DESC
    `;
    return NextResponse.json(incomes);
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validationResult = CreateIncomeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    let { period_id, date, description, amount, event, fund_id } =
      validationResult.data;

    // Use default period if not provided
    if (!period_id) {
      // Try to get active period
      const [activePeriod] =
        await sql`SELECT id FROM periods WHERE is_open = true LIMIT 1`;

      if (activePeriod) {
        period_id = activePeriod.id;
      } else {
        // If no active period, use the most recent one
        const [latestPeriod] =
          await sql`SELECT id FROM periods ORDER BY year DESC, month DESC LIMIT 1`;

        if (latestPeriod) {
          period_id = latestPeriod.id;
        } else {
          return NextResponse.json(
            { error: 'No hay periodos disponibles. Crea un periodo primero.' },
            { status: 400 }
          );
        }
      }
    }

    // If fund_id is provided, validate that the fund exists
    if (fund_id) {
      const [fund] = await sql`SELECT id FROM funds WHERE id = ${fund_id}`;
      if (!fund) {
        return NextResponse.json(
          { error: 'El fondo especificado no existe' },
          { status: 400 }
        );
      }
    }

    // If no fund_id provided, assign to default fund
    if (!fund_id) {
      const [defaultFund] = await sql`
        SELECT id FROM funds WHERE name = ${DEFAULT_FUND_NAME}
      `;
      if (defaultFund) {
        fund_id = defaultFund.id;
      }
    }

    // Standardize date to ensure consistency with Colombia timezone
    let dateToSave = date;

    // If it's an ISO string, ensure we use only the date part
    if (typeof date === 'string' && date.includes('T')) {
      // Extract only the date part (YYYY-MM-DD)
      dateToSave = date.split('T')[0];
    }

    // Insert the income with fund assignment
    const [newIncome] = await sql`
      INSERT INTO incomes (period_id, date, description, amount, event, fund_id)
      VALUES (${period_id}, ${dateToSave}, ${description}, ${amount}, ${
        event || null
      }, ${fund_id})
      RETURNING *
    `;

    // Fetch the income with fund information
    const [incomeWithFund] = await sql`
      SELECT 
        i.*,
        p.name as period_name,
        f.name as fund_name
      FROM incomes i
      LEFT JOIN periods p ON i.period_id = p.id
      LEFT JOIN funds f ON i.fund_id = f.id
      WHERE i.id = ${newIncome.id}
    `;

    // Update fund balance if fund is assigned
    if (fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${amount}
        WHERE id = ${fund_id}
      `;
    }

    return NextResponse.json(incomeWithFund);
  } catch (error) {
    console.error('Error creating income:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
