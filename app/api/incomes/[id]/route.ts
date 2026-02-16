import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { UpdateIncomeSchema, DEFAULT_FUND_NAME } from '@/types/funds';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const [income] = await sql`
      SELECT 
        i.*, 
        p.name as period_name,
        f.name as fund_name
      FROM incomes i
      LEFT JOIN periods p ON i.period_id = p.id
      LEFT JOIN funds f ON i.fund_id = f.id
      WHERE i.id = ${id}
    `;

    if (!income) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    return NextResponse.json(income);
  } catch (error) {
    console.error('Error fetching income:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    const body = await request.json();

    // Validate request body
    const validationResult = UpdateIncomeSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.errors },
        { status: 400 }
      );
    }

    // Get existing income to calculate balance changes
    const [existingIncome] = await sql`SELECT * FROM incomes WHERE id = ${id}`;
    if (!existingIncome) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    let { period_id, date, description, amount, event, fund_id } =
      validationResult.data;

    // Use existing values if not provided
    period_id = period_id || existingIncome.period_id;
    date = date || existingIncome.date;
    description = description || existingIncome.description;
    amount = amount !== undefined ? amount : existingIncome.amount;
    event = event !== undefined ? event : existingIncome.event;
    fund_id = fund_id !== undefined ? fund_id : existingIncome.fund_id;

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

    // Update fund balances if fund assignment or amount changed
    const oldFundId = existingIncome.fund_id;
    const oldAmount = existingIncome.amount;

    // Revert old fund balance if there was a fund assigned
    if (oldFundId) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance - ${oldAmount}
        WHERE id = ${oldFundId}
      `;
    }

    // Update the income
    const [updatedIncome] = await sql`
      UPDATE incomes
      SET period_id = ${period_id}, date = ${date}, description = ${description}, amount = ${amount}, event = ${
        event || null
      }, fund_id = ${fund_id}
      WHERE id = ${id}
      RETURNING *
    `;

    if (!updatedIncome) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    // Update new fund balance
    if (fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance + ${amount}
        WHERE id = ${fund_id}
      `;
    }

    // Fetch the updated income with fund information
    const [incomeWithFund] = await sql`
      SELECT 
        i.*,
        p.name as period_name,
        f.name as fund_name
      FROM incomes i
      LEFT JOIN periods p ON i.period_id = p.id
      LEFT JOIN funds f ON i.fund_id = f.id
      WHERE i.id = ${id}
    `;

    return NextResponse.json(incomeWithFund);
  } catch (error) {
    console.error('Error updating income:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;

    // Get the income before deleting to update fund balance
    const [incomeToDelete] = await sql`SELECT * FROM incomes WHERE id = ${id}`;
    if (!incomeToDelete) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    const [deletedIncome] = await sql`
      DELETE FROM incomes
      WHERE id = ${id}
      RETURNING *
    `;

    if (!deletedIncome) {
      return NextResponse.json({ error: 'Income not found' }, { status: 404 });
    }

    // Update fund balance if income was assigned to a fund
    if (incomeToDelete.fund_id) {
      await sql`
        UPDATE funds 
        SET current_balance = current_balance - ${incomeToDelete.amount}
        WHERE id = ${incomeToDelete.fund_id}
      `;
    }

    return NextResponse.json(deletedIncome);
  } catch (error) {
    console.error('Error deleting income:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
