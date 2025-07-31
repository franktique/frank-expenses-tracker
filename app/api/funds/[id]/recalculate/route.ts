import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { FUND_ERROR_MESSAGES } from "@/types/funds";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if fund exists and get its details
    const [fund] = await sql`
      SELECT id, name, initial_balance, start_date, current_balance
      FROM funds 
      WHERE id = ${id}
    `;

    if (!fund) {
      return NextResponse.json(
        { error: FUND_ERROR_MESSAGES.FUND_NOT_FOUND },
        { status: 404 }
      );
    }

    const oldBalance = fund.current_balance;

    // Calculate total income for this fund (only after start date)
    const incomeResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM incomes 
      WHERE fund_id = ${id} 
        AND date >= ${fund.start_date}
    `;
    const totalIncome = Number(incomeResult[0].total);

    // Calculate total expenses for categories assigned to this fund (only after start date)
    const expenseResult = await sql`
      SELECT COALESCE(SUM(e.amount), 0) as total
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE c.fund_id = ${id}
        AND e.date >= ${fund.start_date}
    `;
    const totalExpenses = Number(expenseResult[0].total);

    // Calculate total transfers INTO this fund (only after start date)
    const transferInResult = await sql`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses 
      WHERE destination_fund_id = ${id}
        AND date >= ${fund.start_date}
    `;
    const totalTransfersIn = Number(transferInResult[0].total);

    // Calculate total transfers OUT of this fund (expenses with destination_fund_id from categories of this fund)
    const transferOutResult = await sql`
      SELECT COALESCE(SUM(e.amount), 0) as total
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      WHERE c.fund_id = ${id}
        AND e.destination_fund_id IS NOT NULL
        AND e.date >= ${fund.start_date}
    `;
    const totalTransfersOut = Number(transferOutResult[0].total);

    // Calculate new balance
    // Formula: initial_balance + income + transfers_in - expenses
    // Note: transfers_out are already included in expenses, so we don't subtract them separately
    const newBalance =
      Number(fund.initial_balance) +
      totalIncome +
      totalTransfersIn -
      totalExpenses;

    // Update the fund's current balance
    const [updatedFund] = await sql`
      UPDATE funds 
      SET current_balance = ${newBalance},
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ${id}
      RETURNING *
    `;

    // Return detailed calculation result
    return NextResponse.json({
      success: true,
      fund_id: id,
      fund_name: fund.name,
      old_balance: oldBalance,
      new_balance: newBalance,
      calculation_details: {
        initial_balance: Number(fund.initial_balance),
        total_income: totalIncome,
        total_expenses: totalExpenses,
        total_transfers_in: totalTransfersIn,
        total_transfers_out: totalTransfersOut,
        start_date: fund.start_date,
      },
      updated_fund: updatedFund,
    });
  } catch (error) {
    console.error("Error recalculating fund balance:", error);
    return NextResponse.json(
      {
        success: false,
        error: FUND_ERROR_MESSAGES.FUND_BALANCE_CALCULATION_ERROR,
        details: (error as Error).message,
      },
      { status: 500 }
    );
  }
}
