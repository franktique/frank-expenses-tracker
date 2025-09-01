import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // Get all expenses with details needed for Excel export, grouped by period, including credit card information
    const expenses = await sql`
      SELECT 
        e.id,
        e.date,
        c.name as category_name,
        p.name as period_name, 
        p.id as period_id,
        e.payment_method,
        e.description,
        e.event,
        e.amount,
        cc.bank_name as credit_card_bank,
        cc.franchise as credit_card_franchise,
        cc.last_four_digits as credit_card_last_four
      FROM expenses e
      JOIN categories c ON e.category_id = c.id
      JOIN periods p ON e.period_id = p.id
      LEFT JOIN credit_cards cc ON e.credit_card_id = cc.id
      ORDER BY p.name, e.date DESC
    `;

    // Group expenses by period
    const expensesByPeriod: { [key: string]: any[] } = {};

    expenses.forEach((expense) => {
      const periodName = expense.period_name;
      if (!expensesByPeriod[periodName]) {
        expensesByPeriod[periodName] = [];
      }
      expensesByPeriod[periodName].push(expense);
    });

    return NextResponse.json(expensesByPeriod);
  } catch (error) {
    console.error("Error exporting expenses for Excel:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
