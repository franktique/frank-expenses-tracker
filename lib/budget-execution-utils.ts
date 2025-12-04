/**
 * Utility functions for budget execution visualization
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type {
  BudgetExecutionData,
  BudgetExecutionViewMode,
  BudgetExecutionResponse,
} from "@/types/funds";

/**
 * Fetch budget execution data from the API
 *
 * @param periodId - The period ID to fetch data for
 * @param viewMode - 'daily' or 'weekly' view mode
 * @returns Promise resolving to the API response
 */
export async function fetchBudgetExecutionData(
  periodId: string,
  viewMode: BudgetExecutionViewMode = "daily"
): Promise<BudgetExecutionResponse> {
  const response = await fetch(
    `/api/budget-execution/${periodId}?viewMode=${viewMode}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.error || "Failed to fetch budget execution data"
    );
  }

  return response.json();
}

/**
 * Format budget execution data for display in charts
 * Converts API response to Recharts-compatible format
 *
 * @param data - Array of budget execution data
 * @param viewMode - 'daily' or 'weekly' view mode
 * @returns Array formatted for Recharts
 */
export function formatChartData(
  data: BudgetExecutionData[],
  viewMode: BudgetExecutionViewMode
) {
  return data.map((item) => {
    if (viewMode === "daily") {
      const date = parseISO(item.date);
      return {
        ...item,
        displayDate: format(date, "dd/MM", { locale: es }),
        fullDate: format(date, "dd 'de' MMMM 'de' yyyy", { locale: es }),
      };
    } else {
      // Weekly view
      const weekStart = item.weekStart ? parseISO(item.weekStart) : null;
      const weekEnd = item.weekEnd ? parseISO(item.weekEnd) : null;

      return {
        ...item,
        displayDate:
          weekStart && weekEnd
            ? `Sem ${item.weekNumber || ""}`
            : `Semana ${item.weekNumber || ""}`,
        fullDate:
          weekStart && weekEnd
            ? `${format(weekStart, "dd MMM", {
                locale: es,
              })} - ${format(weekEnd, "dd MMM yyyy", { locale: es })}`
            : "",
      };
    }
  });
}

/**
 * Format amount as currency (Mexican Peso)
 *
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get custom tooltip content for the chart
 *
 * @param viewMode - 'daily' or 'weekly' view mode
 * @returns Tooltip component props
 */
export function getChartTooltipFormatter(viewMode: BudgetExecutionViewMode) {
  return (value: number) => [
    formatCurrency(value),
    viewMode === "daily" ? "Presupuesto" : "Presupuesto Semanal",
  ];
}

/**
 * Get chart X-axis label for the given view mode
 *
 * @param viewMode - 'daily' or 'weekly' view mode
 * @returns X-axis label
 */
export function getXAxisLabel(viewMode: BudgetExecutionViewMode): string {
  return viewMode === "daily" ? "Fecha" : "Semana";
}

/**
 * Get formatted date range for display
 * e.g., "1 - 30 de Diciembre de 2025"
 *
 * @param periodName - The period name
 * @param month - Month number (0-indexed)
 * @param year - Year number
 * @returns Formatted date range string
 */
export function formatDateRange(
  periodName: string,
  month: number,
  year: number
): string {
  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0); // Last day of month

  return `${format(startDate, "d", { locale: es })} - ${format(
    endDate,
    "d 'de' MMMM 'de' yyyy",
    { locale: es }
  )}`;
}

/**
 * Calculate statistics for the budget data
 *
 * @param data - Array of budget execution data
 * @returns Object with statistics
 */
export function calculateBudgetStats(data: BudgetExecutionData[]) {
  if (data.length === 0) {
    return {
      total: 0,
      average: 0,
      peak: 0,
      min: 0,
    };
  }

  const amounts = data.map((d) => d.amount);
  const total = amounts.reduce((sum, amt) => sum + amt, 0);
  const average = total / data.length;
  const peak = Math.max(...amounts);
  const min = Math.min(...amounts);

  return {
    total,
    average,
    peak,
    min,
  };
}

/**
 * Check if data is empty or sparse
 *
 * @param data - Array of budget execution data
 * @param daysInPeriod - Total number of days in the period
 * @returns true if data is empty or has many gaps
 */
export function isDataSparse(
  data: BudgetExecutionData[],
  daysInPeriod: number
): boolean {
  const coverage = (data.length / daysInPeriod) * 100;
  return coverage < 10; // Less than 10% coverage considered sparse
}
