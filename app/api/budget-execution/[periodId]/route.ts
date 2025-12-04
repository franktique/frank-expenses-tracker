import { type NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type {
  BudgetExecutionViewMode,
  BudgetExecutionResponse,
  BudgetExecutionData,
} from "@/types/funds";
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  getWeek,
  getDaysInMonth,
} from "date-fns";
import { es } from "date-fns/locale";

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
  context: { params: { periodId: string } }
) {
  try {
    const { periodId } = context.params;
    const viewMode = (request.nextUrl.searchParams.get("viewMode") ||
      "daily") as BudgetExecutionViewMode;

    // Validate viewMode
    if (!["daily", "weekly"].includes(viewMode)) {
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
      return NextResponse.json(
        { error: "Period not found" },
        { status: 404 }
      );
    }

    const period = periodResult[0];

    // Fetch all budgets for the period with their default_date
    // If no default_date, we'll use day 1 of the period
    const budgets = await sql`
      SELECT
        b.id,
        b.expected_amount,
        b.default_date,
        p.month,
        p.year
      FROM budgets b
      JOIN periods p ON b.period_id = p.id
      WHERE b.period_id = ${periodId}
      ORDER BY COALESCE(b.default_date,
        MAKE_DATE(p.year, p.month + 1, 1)) ASC
    `;

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
          peakDate: "",
          peakAmount: 0,
        },
      } as BudgetExecutionResponse);
    }

    // Calculate period start and end dates
    // Database month is 0-indexed, JavaScript Date expects 0-indexed too
    const periodStartDate = new Date(period.year, period.month, 1);
    const daysInMonth = getDaysInMonth(periodStartDate);
    const periodEndDate = new Date(period.year, period.month, daysInMonth);

    // Group budgets by date or week
    const aggregated: Record<string, number> = {};
    const dateToWeekMap: Record<string, { weekNumber: number; weekStart: string; weekEnd: string }> =
      {};

    for (const budget of budgets) {
      let dateKey: string;

      // Determine the budget execution date
      let executionDate: Date;
      if (budget.default_date) {
        executionDate = new Date(budget.default_date);
      } else {
        // Default to day 1 of the period
        executionDate = new Date(period.year, period.month, 1);
      }

      if (viewMode === "daily") {
        // Use YYYY-MM-DD format
        dateKey = format(executionDate, "yyyy-MM-dd");
      } else {
        // Weekly view: group by ISO week
        const weekNum = getWeek(executionDate, { locale: es });
        const weekStart = startOfWeek(executionDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(executionDate, { weekStartsOn: 1 });

        dateKey = `week-${weekNum}`;
        dateToWeekMap[dateKey] = {
          weekNumber: weekNum,
          weekStart: format(weekStart, "yyyy-MM-dd"),
          weekEnd: format(weekEnd, "yyyy-MM-dd"),
        };
      }

      // Aggregate amounts
      aggregated[dateKey] =
        (aggregated[dateKey] || 0) + Number(budget.expected_amount);
    }

    // Convert to array and format response
    let data: BudgetExecutionData[] = Object.entries(aggregated)
      .map(([dateKey, amount]) => {
        if (viewMode === "daily") {
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
        if (viewMode === "daily") {
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        } else {
          return (a.weekNumber || 0) - (b.weekNumber || 0);
        }
      });

    // Calculate summary statistics
    const totalBudget = data.reduce((sum, item) => sum + item.amount, 0);
    const peakData = data.reduce((max, item) =>
      item.amount > max.amount ? item : max
    );

    const summary = {
      totalBudget,
      averagePerDay: data.length > 0 ? totalBudget / data.length : 0,
      peakDate: peakData.date || "",
      peakAmount: peakData.amount || 0,
    };

    return NextResponse.json({
      periodId,
      periodName: period.name,
      viewMode,
      data,
      summary,
    } as BudgetExecutionResponse);
  } catch (error) {
    console.error("Error fetching budget execution data:", error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
