import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fundId = searchParams.get("fund_id");
    const days = parseInt(searchParams.get("days") || "30");

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const startDateStr = startDate.toISOString().split("T")[0];
    const endDateStr = endDate.toISOString().split("T")[0];

    let balanceQuery;

    if (fundId) {
      // Get balance trends for specific fund
      balanceQuery = sql`
        WITH RECURSIVE date_series AS (
          SELECT ${startDateStr}::date as series_date
          UNION ALL
          SELECT (series_date + interval '1 day')::date
          FROM date_series
          WHERE series_date < ${endDateStr}::date
        ),
        fund_info AS (
          SELECT id, name, initial_balance, start_date
          FROM funds
          WHERE id = ${fundId}
        ),
        daily_changes AS (
          SELECT 
            ds.series_date as change_date,
            COALESCE(SUM(incomes.income_amount), 0) + 
            COALESCE(SUM(transfers_in.transfer_in_amount), 0) - 
            COALESCE(SUM(expenses.expense_amount), 0) as net_change
          FROM date_series ds
          LEFT JOIN (
            SELECT 
              i.date::date as income_date,
              SUM(i.amount) as income_amount
            FROM incomes i
            WHERE i.fund_id = ${fundId}
              AND i.date >= ${startDateStr}
              AND i.date <= ${endDateStr}
            GROUP BY i.date::date
          ) incomes ON ds.series_date = incomes.income_date
          LEFT JOIN (
            SELECT 
              e.date::date as transfer_date,
              SUM(e.amount) as transfer_in_amount
            FROM expenses e
            WHERE e.destination_fund_id = ${fundId}
              AND e.date >= ${startDateStr}
              AND e.date <= ${endDateStr}
            GROUP BY e.date::date
          ) transfers_in ON ds.series_date = transfers_in.transfer_date
          LEFT JOIN (
            SELECT 
              e.date::date as expense_date,
              SUM(e.amount) as expense_amount
            FROM expenses e
            WHERE e.source_fund_id = ${fundId}
              AND e.date >= ${startDateStr}
              AND e.date <= ${endDateStr}
            GROUP BY e.date::date
          ) expenses ON ds.series_date = expenses.expense_date
          GROUP BY ds.series_date
        ),
        running_balance AS (
          SELECT 
            dc.change_date,
            dc.net_change,
            fi.initial_balance + 
            SUM(dc.net_change) OVER (ORDER BY dc.change_date ROWS UNBOUNDED PRECEDING) as balance
          FROM daily_changes dc
          CROSS JOIN fund_info fi
          WHERE dc.change_date >= fi.start_date::date
        )
        SELECT 
          rb.change_date as date,
          rb.net_change,
          rb.balance,
          fi.name as fund_name
        FROM running_balance rb
        CROSS JOIN fund_info fi
        ORDER BY rb.change_date
      `;
    } else {
      // Get balance trends for all funds combined
      balanceQuery = sql`
        WITH RECURSIVE date_series AS (
          SELECT ${startDateStr}::date as series_date
          UNION ALL
          SELECT (series_date + interval '1 day')::date
          FROM date_series
          WHERE series_date < ${endDateStr}::date
        ),
        daily_changes AS (
          SELECT 
            ds.series_date as change_date,
            COALESCE(SUM(incomes.income_amount), 0) + 
            COALESCE(SUM(transfers.transfer_amount), 0) - 
            COALESCE(SUM(expenses.expense_amount), 0) as net_change
          FROM date_series ds
          LEFT JOIN (
            SELECT 
              i.date::date as income_date,
              SUM(i.amount) as income_amount
            FROM incomes i
            WHERE i.date >= ${startDateStr}
              AND i.date <= ${endDateStr}
            GROUP BY i.date::date
          ) incomes ON ds.series_date = incomes.income_date
          LEFT JOIN (
            SELECT 
              e.date::date as transfer_date,
              SUM(e.amount) as transfer_amount
            FROM expenses e
            WHERE e.destination_fund_id IS NOT NULL
              AND e.date >= ${startDateStr}
              AND e.date <= ${endDateStr}
            GROUP BY e.date::date
          ) transfers ON ds.series_date = transfers.transfer_date
          LEFT JOIN (
            SELECT 
              e.date::date as expense_date,
              SUM(e.amount) as expense_amount
            FROM expenses e
            WHERE e.source_fund_id IS NOT NULL
              AND e.date >= ${startDateStr}
              AND e.date <= ${endDateStr}
            GROUP BY e.date::date
          ) expenses ON ds.series_date = expenses.expense_date
          GROUP BY ds.series_date
        ),
        initial_total AS (
          SELECT SUM(initial_balance) as total_initial
          FROM funds
        ),
        running_balance AS (
          SELECT 
            dc.change_date,
            dc.net_change,
            it.total_initial + 
            SUM(dc.net_change) OVER (ORDER BY dc.change_date ROWS UNBOUNDED PRECEDING) as balance
          FROM daily_changes dc
          CROSS JOIN initial_total it
        )
        SELECT 
          change_date as date,
          net_change,
          balance,
          'All Funds' as fund_name
        FROM running_balance
        ORDER BY change_date
      `;
    }

    interface BalanceRow {
      date: string;
      net_change: string | number;
      balance: string | number;
      fund_name: string;
    }

    const balanceData = (await balanceQuery) as unknown as BalanceRow[];

    return NextResponse.json({
      fund_id: fundId,
      fund_name: balanceData[0]?.fund_name || "All Funds",
      period_days: days,
      start_date: startDateStr,
      end_date: endDateStr,
      balance_trends: balanceData.map((row: BalanceRow) => ({
        date: row.date,
        balance: parseFloat(row.balance?.toString() || "0"),
        net_change: parseFloat(row.net_change?.toString() || "0"),
      })),
    });
  } catch (error) {
    console.error("Error fetching fund balance trends:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
