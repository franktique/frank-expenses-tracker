import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type {
  BudgetExecutionViewMode,
  BudgetExecutionResponse,
  BudgetExecutionData,
  BudgetDetail,
} from '@/types/funds';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  getWeek,
  getDaysInMonth,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { expandBudgetPayments } from '@/lib/budget-recurrence-utils';
import type { ExpandedBudgetPayment } from '@/types/funds';

/**
 * GET /api/budget-execution/[periodId]
 *
 * Fetches aggregated budget data by date or week for the given period.
 * Budgets without a default_date are assumed to be on day 1 of the period.
 *
 * Query parameters:
 * - viewMode: 'daily' | 'weekly' (default: 'daily')
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await context.params;
    const viewMode = (request.nextUrl.searchParams.get('viewMode') ||
      'daily') as BudgetExecutionViewMode;

    // Validate viewMode
    if (!['daily', 'weekly'].includes(viewMode)) {
      return NextResponse.json(
        { error: "Invalid viewMode. Must be 'daily' or 'weekly'." },
        { status: 400 }
      );
    }

    // Fetch period information
    const periodResult = await sql`
      SELECT id, name, month, year
      FROM periods
      WHERE id = ${periodId}
    `;

    if (!periodResult || periodResult.length === 0) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    const period = periodResult[0];

    interface BudgetRow {
      id: string;
      expected_amount: number;
      default_date: string | null;
      recurrence_frequency: string | null;
      default_day: number | null;
      category_name: string;
      category_id: string;
      payment_method: string;
      month: number;
      year: number;
    }

    // Fetch all budgets for the period with their category's recurrence parameters
    const budgets = (await sql`
      SELECT
        b.id,
        b.expected_amount,
        b.default_date,
        c.recurrence_frequency,
        c.default_day,
        c.name as category_name,
        b.category_id,
        b.payment_method,
        p.month,
        p.year
      FROM budgets b
      JOIN periods p ON b.period_id = p.id
      JOIN categories c ON b.category_id = c.id
      WHERE b.period_id = ${periodId}
      ORDER BY COALESCE(b.default_date,
        MAKE_DATE(p.year, p.month + 1, 1)) ASC
    `) as unknown as BudgetRow[];

    if (!budgets || budgets.length === 0) {
      // Return empty result set
      return NextResponse.json({
        periodId,
        periodName: period.name,
        viewMode,
        data: [],
        summary: {
          totalBudget: 0,
          averagePerDay: 0,
          peakDate: '',
          peakAmount: 0,
        },
        budgetDetails: {},
      } as BudgetExecutionResponse);
    }

    // Calculate period start and end dates
    // Database month is 0-indexed, JavaScript Date expects 0-indexed too
    const periodStartDate = new Date(period.year, period.month, 1);
    const daysInMonth = getDaysInMonth(periodStartDate);
    const periodEndDate = new Date(period.year, period.month, daysInMonth);

    // Expand all budgets into individual payments (virtual expansion)
    const allPayments: ExpandedBudgetPayment[] = [];

    for (const budget of budgets) {
      // Determine the start day for the payment(s)
      let startDay: number | null = null;

      // Priority: category.default_day > budget.default_date > day 1
      if (budget.default_day) {
        startDay = budget.default_day;
      } else if (budget.default_date) {
        const defaultDate = new Date(budget.default_date);
        startDay = defaultDate.getDate();
      } else {
        startDay = 1; // Default to day 1
      }

      const payments = expandBudgetPayments({
        budgetId: budget.id,
        categoryId: budget.category_id,
        periodId,
        totalAmount: Number(budget.expected_amount),
        paymentMethod: budget.payment_method,
        recurrenceFrequency: budget.recurrence_frequency as any, // Cast if needed, or update type
        recurrenceStartDay: startDay,
        periodMonth: budget.month,
        periodYear: budget.year,
      });

      allPayments.push(...payments);
    }

    // Group expanded payments by date or week
    const aggregated: Record<string, number> = {};
    const budgetDetails: Record<string, BudgetDetail[]> = {};
    const dateToWeekMap: Record<
      string,
      { weekNumber: number; weekStart: string; weekEnd: string }
    > = {};

    // Create a map to lookup budget info by budget ID
    const budgetInfoMap = new Map(
      budgets.map((b) => [
        b.id,
        {
          categoryName: b.category_name,
          categoryId: b.category_id,
          paymentMethod: b.payment_method,
        },
      ])
    );

    for (const payment of allPayments) {
      let dateKey: string;
      const executionDate = parseISO(payment.date);

      if (viewMode === 'daily') {
        // Use YYYY-MM-DD format
        dateKey = payment.date;
      } else {
        // Weekly view: group by ISO week
        const weekNum = getWeek(executionDate, { locale: es });
        const weekStart = startOfWeek(executionDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(executionDate, { weekStartsOn: 1 });

        dateKey = `week-${weekNum}`;
        dateToWeekMap[dateKey] = {
          weekNumber: weekNum,
          weekStart: format(weekStart, 'yyyy-MM-dd'),
          weekEnd: format(weekEnd, 'yyyy-MM-dd'),
        };
      }

      // Aggregate amounts
      aggregated[dateKey] = (aggregated[dateKey] || 0) + payment.amount;

      // Build budget details for this date/week
      const budgetInfo = budgetInfoMap.get(payment.budgetId);
      if (budgetInfo) {
        if (!budgetDetails[dateKey]) {
          budgetDetails[dateKey] = [];
        }

        budgetDetails[dateKey].push({
          budgetId: payment.budgetId,
          categoryId: budgetInfo.categoryId,
          categoryName: budgetInfo.categoryName,
          amount: payment.amount,
          date: payment.date, // Keep specific date even in weekly view
          paymentMethod: budgetInfo.paymentMethod,
        });
      }
    }

    // Convert to array and format response
    let data: BudgetExecutionData[] = Object.entries(aggregated)
      .map(([dateKey, amount]) => {
        if (viewMode === 'daily') {
          const date = parseISO(dateKey);
          return {
            date: dateKey,
            amount,
            dayOfWeek: date.getDay(),
          };
        } else {
          // Weekly view
          const weekInfo = dateToWeekMap[dateKey];
          return {
            date: `${dateKey}`,
            amount,
            weekNumber: weekInfo.weekNumber,
            weekStart: weekInfo.weekStart,
            weekEnd: weekInfo.weekEnd,
          };
        }
      })
      .sort((a, b) => {
        if (viewMode === 'daily') {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else {
          return (a.weekNumber || 0) - (b.weekNumber || 0);
        }
      });

    // Calculate summary statistics
    const totalBudget = data.reduce((sum, item) => sum + item.amount, 0);

    let peakData = { date: '', amount: 0 };
    if (data.length > 0) {
      peakData = data.reduce((max, item) =>
        item.amount > max.amount ? item : max
      );
    }

    const summary = {
      totalBudget,
      averagePerDay: data.length > 0 ? totalBudget / data.length : 0,
      peakDate: peakData.date || '',
      peakAmount: peakData.amount || 0,
    };

    return NextResponse.json({
      periodId,
      periodName: period.name,
      viewMode,
      data,
      summary,
      budgetDetails,
    } as BudgetExecutionResponse);
  } catch (error) {
    console.error('Error fetching budget execution data:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
