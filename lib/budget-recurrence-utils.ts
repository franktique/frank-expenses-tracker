/**
 * Budget Recurrence Utilities
 *
 * Handles expansion of recurring budgets into individual payment dates and amounts.
 * Supports weekly and bi-weekly recurrence patterns.
 */

import { getDaysInMonth, addDays, format } from "date-fns";
import type { RecurrenceFrequency, ExpandedBudgetPayment } from "@/types/funds";

export interface BudgetRecurrenceParams {
  budgetId: string;
  categoryId: string;
  periodId: string;
  totalAmount: number;
  paymentMethod: string;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceStartDay: number | null;
  periodMonth: number; // 0-indexed (0 = January, 11 = December)
  periodYear: number;
}

/**
 * Expands a budget into individual payment dates and amounts.
 *
 * For one-time budgets (recurrenceFrequency = null):
 *   - Returns single payment on recurrenceStartDay or day 1
 *
 * For recurring budgets:
 *   - Calculates payment dates based on frequency (7 or 14 days)
 *   - Splits total amount equally across all payments
 *   - Last payment absorbs rounding remainder
 *
 * Edge cases handled:
 *   - Start day > days in month (e.g., day 31 in February) → uses last day of month
 *   - Payments that would extend past month end → truncated
 *   - Bi-weekly spanning months → only includes dates within period
 *
 * @param params - Budget recurrence parameters
 * @returns Array of expanded budget payments
 */
export function expandBudgetPayments(
  params: BudgetRecurrenceParams
): ExpandedBudgetPayment[] {
  const {
    budgetId,
    categoryId,
    periodId,
    totalAmount,
    paymentMethod,
    recurrenceFrequency,
    recurrenceStartDay,
    periodMonth,
    periodYear,
  } = params;

  // Calculate period boundaries
  const daysInMonth = getDaysInMonth(new Date(periodYear, periodMonth));
  const startDay = Math.min(recurrenceStartDay || 1, daysInMonth);

  // One-time budget (no recurrence)
  if (!recurrenceFrequency) {
    const paymentDate = new Date(periodYear, periodMonth, startDay);
    return [
      {
        budgetId,
        categoryId,
        periodId,
        date: formatDate(paymentDate),
        amount: totalAmount,
        paymentMethod,
        isRecurring: false,
      },
    ];
  }

  // Recurring budget calculation
  const intervalDays = recurrenceFrequency === "weekly" ? 7 : 14;
  const paymentDates: Date[] = [];

  let currentDate = new Date(periodYear, periodMonth, startDay);
  const monthEnd = new Date(periodYear, periodMonth, daysInMonth);

  // Generate payment dates within the period
  while (currentDate <= monthEnd) {
    paymentDates.push(new Date(currentDate));
    currentDate = addDays(currentDate, intervalDays);
  }

  // If no valid dates (edge case), default to start day
  if (paymentDates.length === 0) {
    paymentDates.push(new Date(periodYear, periodMonth, startDay));
  }

  // Split amount equally, last payment gets remainder
  const totalPayments = paymentDates.length;
  const baseAmount = Math.floor((totalAmount / totalPayments) * 100) / 100; // Round to 2 decimals
  const remainder = totalAmount - baseAmount * totalPayments;

  return paymentDates.map((date, index) => ({
    budgetId,
    categoryId,
    periodId,
    date: formatDate(date),
    amount: index === totalPayments - 1 ? baseAmount + remainder : baseAmount,
    paymentMethod,
    isRecurring: true,
    occurrenceNumber: index + 1,
    totalOccurrences: totalPayments,
  }));
}

/**
 * Formats date as YYYY-MM-DD
 *
 * @param date - Date object to format
 * @returns Formatted date string
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Validates that recurrence parameters are consistent
 *
 * @param recurrenceFrequency - The recurrence frequency (weekly, bi-weekly, or null)
 * @param recurrenceStartDay - The start day (1-31 or null)
 * @returns Validation result with error message if invalid
 */
export function validateRecurrenceParams(
  recurrenceFrequency: RecurrenceFrequency,
  recurrenceStartDay: number | null
): { valid: boolean; error?: string } {
  // If recurrence is set, start day must be provided
  if (recurrenceFrequency && !recurrenceStartDay) {
    return {
      valid: false,
      error: "El día de inicio es obligatorio para presupuestos recurrentes",
    };
  }

  // If no recurrence, start day is optional
  if (!recurrenceFrequency && recurrenceStartDay) {
    // This is OK - treat as one-time budget with specific date
  }

  // Validate start day range if provided
  if (recurrenceStartDay && (recurrenceStartDay < 1 || recurrenceStartDay > 31)) {
    return {
      valid: false,
      error: "El día de inicio debe estar entre 1 y 31",
    };
  }

  // Validate frequency values
  if (
    recurrenceFrequency &&
    recurrenceFrequency !== "weekly" &&
    recurrenceFrequency !== "bi-weekly"
  ) {
    return {
      valid: false,
      error: "Frecuencia de recurrencia inválida. Debe ser 'weekly' o 'bi-weekly'",
    };
  }

  return { valid: true };
}

/**
 * Get human-readable description of recurrence pattern
 *
 * @param recurrenceFrequency - The recurrence frequency
 * @param recurrenceStartDay - The start day
 * @returns Human-readable description
 */
export function getRecurrenceDescription(
  recurrenceFrequency: RecurrenceFrequency,
  recurrenceStartDay: number | null
): string {
  if (!recurrenceFrequency) {
    return "Pago único";
  }

  const frequencyText =
    recurrenceFrequency === "weekly" ? "Semanal" : "Quincenal";
  const startDayText = recurrenceStartDay
    ? ` a partir del día ${recurrenceStartDay}`
    : "";

  return `${frequencyText}${startDayText}`;
}

/**
 * Calculate expected number of payments for a recurrence pattern
 *
 * @param recurrenceFrequency - The recurrence frequency
 * @param recurrenceStartDay - The start day (1-31)
 * @param periodMonth - 0-indexed month
 * @param periodYear - Year
 * @returns Expected number of payments
 */
export function calculateExpectedPayments(
  recurrenceFrequency: RecurrenceFrequency,
  recurrenceStartDay: number,
  periodMonth: number,
  periodYear: number
): number {
  if (!recurrenceFrequency) {
    return 1;
  }

  const daysInMonth = getDaysInMonth(new Date(periodYear, periodMonth));
  const startDay = Math.min(recurrenceStartDay, daysInMonth);
  const intervalDays = recurrenceFrequency === "weekly" ? 7 : 14;

  let count = 0;
  let currentDay = startDay;

  while (currentDay <= daysInMonth) {
    count++;
    currentDay += intervalDays;
  }

  return Math.max(count, 1); // At least 1 payment
}
