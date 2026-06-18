import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import { HistoricalData, HistoricalCategoryRow, HistoricalPeriodInfo } from '@/types/dashboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryIdsParam = searchParams.get('categoryIds');
    const categoryFilter = categoryIdsParam
      ? new Set(categoryIdsParam.split(',').filter(Boolean))
      : null;

    const rows = await sql`
      WITH recent_periods AS (
        SELECT id, name, month, year, is_open
        FROM periods
        ORDER BY year DESC, month DESC
        LIMIT 13
      ),
      expense_data AS (
        SELECT
          category_id,
          period_id,
          SUM(CASE WHEN payment_method = 'credit' THEN amount ELSE 0 END) as credit_amount,
          SUM(CASE WHEN payment_method IN ('cash', 'debit') THEN amount ELSE 0 END) as cash_debit_amount
        FROM expenses
        WHERE period_id IN (SELECT id FROM recent_periods)
          AND (pending IS NULL OR pending = false)
        GROUP BY category_id, period_id
      )
      SELECT
        c.id as category_id,
        c.name as category_name,
        rp.id as period_id,
        rp.name as period_name,
        rp.month,
        rp.year,
        rp.is_open,
        COALESCE(ed.credit_amount, 0) as credit_amount,
        COALESCE(ed.cash_debit_amount, 0) as cash_debit_amount
      FROM categories c
      CROSS JOIN recent_periods rp
      LEFT JOIN expense_data ed ON ed.category_id = c.id AND ed.period_id = rp.id
      ORDER BY c.name, rp.year DESC, rp.month DESC
    `;

    // JS-side category filtering (avoids SQL conditional complexity for small datasets)
    const filteredRows = categoryFilter
      ? rows.filter((row: any) => categoryFilter.has(row.category_id))
      : rows;

    // Build ordered period list: open period first, then newest-to-oldest
    const periodMap = new Map<string, HistoricalPeriodInfo>();
    for (const row of filteredRows) {
      if (!periodMap.has(row.period_id)) {
        periodMap.set(row.period_id, {
          period_id: row.period_id,
          period_name: row.period_name,
          month: row.month,
          year: row.year,
          is_open: row.is_open,
        });
      }
    }

    const periodsOrdered: HistoricalPeriodInfo[] = [];
    let openPeriod: HistoricalPeriodInfo | undefined;
    for (const p of periodMap.values()) {
      if (p.is_open) {
        openPeriod = p;
      } else {
        periodsOrdered.push(p);
      }
    }
    if (openPeriod) {
      periodsOrdered.unshift(openPeriod);
    }

    // Group rows by category and accumulate totals
    const categoryMap = new Map<string, HistoricalCategoryRow>();
    const totals: HistoricalData['totals'] = {};

    for (const row of filteredRows) {
      const credit = parseFloat(row.credit_amount) || 0;
      const cash = parseFloat(row.cash_debit_amount) || 0;

      if (!categoryMap.has(row.category_id)) {
        categoryMap.set(row.category_id, {
          category_id: row.category_id,
          category_name: row.category_name,
          byPeriod: {},
        });
      }
      categoryMap.get(row.category_id)!.byPeriod[row.period_id] = {
        credit_amount: credit,
        cash_debit_amount: cash,
      };

      if (!totals[row.period_id]) {
        totals[row.period_id] = { credit_amount: 0, cash_debit_amount: 0 };
      }
      totals[row.period_id].credit_amount += credit;
      totals[row.period_id].cash_debit_amount += cash;
    }

    const categories = Array.from(categoryMap.values()).sort((a, b) =>
      a.category_name.localeCompare(b.category_name)
    );

    const response: HistoricalData = {
      periods: periodsOrdered,
      categories,
      totals,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
