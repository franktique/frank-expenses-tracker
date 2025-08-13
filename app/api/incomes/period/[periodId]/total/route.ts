import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await params;
    
    // Don't parse as integer since periods might use UUIDs
    if (!periodId || periodId.trim() === '') {
      return NextResponse.json(
        { error: "ID de período inválido" },
        { status: 400 }
      );
    }

    // Verify period exists
    const [period] = await sql`
      SELECT id, name FROM periods WHERE id = ${periodId}
    `;

    if (!period) {
      return NextResponse.json(
        { error: "Período no encontrado" },
        { status: 404 }
      );
    }

    // Get total income for the period
    const [totalResult] = await sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total_income
      FROM incomes 
      WHERE period_id = ${periodId}
    `;

    // Get income breakdown by fund for additional context
    const incomeByFund = await sql`
      SELECT 
        f.id as fund_id,
        f.name as fund_name,
        COALESCE(SUM(i.amount), 0) as amount
      FROM funds f
      LEFT JOIN incomes i ON f.id = i.fund_id AND i.period_id = ${periodId}
      GROUP BY f.id, f.name
      HAVING SUM(i.amount) > 0
      ORDER BY amount DESC
    `;

    return NextResponse.json({
      period_id: periodId,
      period_name: period.name,
      total_income: parseFloat(totalResult.total_income),
      income_by_fund: incomeByFund.map(fund => ({
        fund_id: fund.fund_id,
        fund_name: fund.fund_name,
        amount: parseFloat(fund.amount)
      }))
    });

  } catch (error) {
    const { periodId } = await params;
    console.error(`Error fetching total income for period ${periodId}:`, error);
    return NextResponse.json(
      { error: "Error interno del servidor. Intente nuevamente." },
      { status: 500 }
    );
  }
}