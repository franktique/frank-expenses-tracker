import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    interface FundRow {
      id: number;
      name: string;
      description: string | null;
      initial_balance: number;
      start_date: string;
      created_at: string;
      updated_at: string;
      current_balance: string | number;
      total_income: string | number;
      total_expenses: string | number;
      total_transfers_in: string | number;
      total_transfers_out: string | number;
      category_count: string | number;
    }

    // Get all funds with current balances and basic stats
    const funds = (await sql`
      SELECT 
        f.id,
        f.name,
        f.description,
        f.initial_balance,
        f.start_date,
        f.created_at,
        f.updated_at,
        COALESCE(
          f.initial_balance + 
          COALESCE(income_totals.total, 0) + 
          COALESCE(transfer_in_totals.total, 0) - 
          COALESCE(expense_totals.total, 0),
          f.initial_balance
        ) as current_balance,
        COALESCE(income_totals.total, 0) as total_income,
        COALESCE(expense_totals.total, 0) as total_expenses,
        COALESCE(transfer_in_totals.total, 0) as total_transfers_in,
        COALESCE(transfer_out_totals.total, 0) as total_transfers_out,
        COALESCE(category_count.count, 0) as category_count
      FROM funds f
      LEFT JOIN (
        SELECT 
          fund_id,
          SUM(amount) as total
        FROM incomes i
        WHERE fund_id IS NOT NULL
        GROUP BY fund_id
      ) income_totals ON f.id = income_totals.fund_id
      LEFT JOIN (
        SELECT 
          destination_fund_id as fund_id,
          SUM(amount) as total
        FROM expenses e
        WHERE destination_fund_id IS NOT NULL
        GROUP BY destination_fund_id
      ) transfer_in_totals ON f.id = transfer_in_totals.fund_id
      LEFT JOIN (
        SELECT 
          source_fund_id as fund_id,
          SUM(amount) as total
        FROM expenses e
        WHERE source_fund_id IS NOT NULL
        GROUP BY source_fund_id
      ) expense_totals ON f.id = expense_totals.fund_id
      LEFT JOIN (
        SELECT 
          source_fund_id as fund_id,
          SUM(amount) as total
        FROM expenses e
        WHERE source_fund_id IS NOT NULL
          AND destination_fund_id IS NOT NULL
          AND destination_fund_id != source_fund_id
        GROUP BY source_fund_id
      ) transfer_out_totals ON f.id = transfer_out_totals.fund_id
      LEFT JOIN (
        SELECT 
          fund_id,
          COUNT(*) as count
        FROM categories
        WHERE fund_id IS NOT NULL
        GROUP BY fund_id
      ) category_count ON f.id = category_count.fund_id
      ORDER BY f.name
    `) as unknown as FundRow[];

    // Calculate total balances for allocation percentages
    const totalBalance = funds.reduce(
      (sum: number, fund: FundRow) => sum + parseFloat(fund.current_balance?.toString() || "0"),
      0
    );

    // Add allocation percentage to each fund
    const fundsWithAllocation = funds.map((fund: FundRow) => ({
      ...fund,
      current_balance: parseFloat(fund.current_balance?.toString() || "0"),
      total_income: parseFloat(fund.total_income?.toString() || "0"),
      total_expenses: parseFloat(fund.total_expenses?.toString() || "0"),
      total_transfers_in: parseFloat(fund.total_transfers_in?.toString() || "0"),
      total_transfers_out: parseFloat(fund.total_transfers_out?.toString() || "0"),
      allocation_percentage:
        totalBalance > 0
          ? (parseFloat(fund.current_balance?.toString() || "0") / totalBalance) * 100
          : 0,
    }));

    // Calculate summary statistics
    const summary = {
      total_funds: funds.length,
      total_balance: totalBalance,
      total_income: funds.reduce(
        (sum: number, fund: FundRow) => sum + parseFloat(fund.total_income?.toString() || "0"),
        0
      ),
      total_expenses: funds.reduce(
        (sum: number, fund: FundRow) => sum + parseFloat(fund.total_expenses?.toString() || "0"),
        0
      ),
      total_transfers: funds.reduce(
        (sum: number, fund: FundRow) => sum + parseFloat(fund.total_transfers_in?.toString() || "0"),
        0
      ),
      total_categories: funds.reduce(
        (sum: number, fund: FundRow) => sum + parseInt(fund.category_count?.toString() || "0"),
        0
      ),
    };

    return NextResponse.json({
      funds: fundsWithAllocation,
      summary,
    });
  } catch (error) {
    console.error("Error fetching fund dashboard data:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
