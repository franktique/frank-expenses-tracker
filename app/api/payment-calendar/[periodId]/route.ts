import { type NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type {
  PaymentCalendarResponse,
  PaymentCalendarDay,
  PaymentCalendarBudgetEntry,
} from '@/types/funds';
import { getDaysInMonth } from 'date-fns';
import { expandBudgetPayments } from '@/lib/budget-recurrence-utils';
import type { ExpandedBudgetPayment } from '@/types/funds';

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

/**
 * GET /api/payment-calendar/[periodId]
 *
 * Returns daily payment calendar data for the given period.
 * Each day contains cash totals (cash + debit) and credit totals,
 * plus the list of individual budget entries for that day.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ periodId: string }> }
) {
  try {
    const { periodId } = await context.params;

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

    // Fetch all budgets for the period with their category's recurrence params
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
      ORDER BY c.name ASC
    `) as unknown as BudgetRow[];

    // Build a full set of dates for the period month
    const periodMonth = period.month; // 0-indexed
    const periodYear = period.year;
    const daysInMonth = getDaysInMonth(new Date(periodYear, periodMonth));

    // Initialize a map for each day in the month
    const dayMap = new Map<string, PaymentCalendarDay>();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${periodYear}-${String(periodMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      dayMap.set(dateStr, {
        date: dateStr,
        cashTotal: 0,
        creditTotal: 0,
        budgets: [],
      });
    }

    if (budgets && budgets.length > 0) {
      // Expand all budgets into individual payments
      const allPayments: ExpandedBudgetPayment[] = [];

      for (const budget of budgets) {
        // Priority: category.default_day > budget.default_date > day 1
        let startDay: number;
        if (budget.default_day) {
          startDay = budget.default_day;
        } else if (budget.default_date) {
          startDay = new Date(budget.default_date).getUTCDate();
        } else {
          startDay = 1;
        }

        const payments = expandBudgetPayments({
          budgetId: budget.id,
          categoryId: budget.category_id,
          periodId,
          totalAmount: Number(budget.expected_amount),
          paymentMethod: budget.payment_method,
          recurrenceFrequency: budget.recurrence_frequency as
            | 'weekly'
            | 'bi-weekly'
            | null,
          recurrenceStartDay: startDay,
          periodMonth: budget.month,
          periodYear: budget.year,
        });

        allPayments.push(...payments);
      }

      // Build category name lookup
      const categoryNameMap = new Map(
        budgets.map((b) => [b.id, { categoryName: b.category_name, categoryId: b.category_id }])
      );

      // Aggregate payments into day map
      for (const payment of allPayments) {
        const day = dayMap.get(payment.date);
        if (!day) continue; // Skip payments outside the month (shouldn't happen)

        const isCredit = payment.paymentMethod === 'credit';
        if (isCredit) {
          day.creditTotal += payment.amount;
        } else {
          day.cashTotal += payment.amount;
        }

        const info = categoryNameMap.get(payment.budgetId);
        day.budgets.push({
          budgetId: payment.budgetId,
          categoryId: info?.categoryId ?? payment.categoryId,
          categoryName: info?.categoryName ?? '',
          amount: payment.amount,
          paymentMethod: payment.paymentMethod as 'cash' | 'credit' | 'debit',
        } satisfies PaymentCalendarBudgetEntry);
      }
    }

    // Sort budgets within each day by category name
    for (const day of dayMap.values()) {
      day.budgets.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    }

    const response: PaymentCalendarResponse = {
      periodId,
      periodName: period.name,
      month: periodMonth + 1, // Return 1-indexed for display
      year: periodYear,
      days: Array.from(dayMap.values()),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching payment calendar data:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
