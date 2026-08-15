/**
 * Utility functions for credit card payment projection
 * Used to compute the statement cycle window (corte to corte) per card and
 * the month in which the payment is due, from the card's cutoff day.
 *
 * All dates are built from local date components (never toISOString(), which
 * shifts date-only values under TZ America/Bogota). Month arguments follow the
 * app's period convention: 0-indexed (0 = January, 11 = December).
 */

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const pad2 = (n: number): string => String(n).padStart(2, '0');

const toDateString = (year: number, month: number, day: number): string =>
  `${year}-${pad2(month + 1)}-${pad2(day)}`;

/**
 * Get the actual corte date for a given month, clamping the day to the last
 * valid day of that month (e.g. 31 in February becomes 28 or 29).
 *
 * @param year - The year
 * @param month - The month, 0-indexed (0 = January)
 * @param cutoffDay - The preferred day of month (1-31)
 * @returns The date as YYYY-MM-DD
 * @throws Error if cutoffDay is invalid (< 1 or > 31, or not an integer)
 *
 * @example
 * getCutoffDate(2026, 5, 15) // "2026-06-15"
 * getCutoffDate(2026, 1, 31) // "2026-02-28"
 */
export function getCutoffDate(
  year: number,
  month: number,
  cutoffDay: number
): string {
  if (!Number.isInteger(cutoffDay) || cutoffDay < 1 || cutoffDay > 31) {
    throw new Error(
      `Invalid cutoff day: ${cutoffDay}. Day must be an integer between 1 and 31.`
    );
  }

  // Get the number of days in the target month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(cutoffDay, daysInMonth);

  return toDateString(year, month, actualDay);
}

/**
 * Compute the statement cycle window for a period: from the corte of month M-1
 * (exclusive) to the corte of month M (inclusive), where M is the period's
 * month. The payment for that statement is due in month M+1.
 *
 * @param periodYear - Year of the period
 * @param periodMonth - Month of the period, 0-indexed (0 = January)
 * @param cutoffDay - The card's cutoff day (1-31)
 * @returns The window bounds (YYYY-MM-DD) and the payment month/year
 * @throws Error if cutoffDay is invalid
 *
 * @example
 * getProjectionWindow(2026, 5, 15)
 * // { windowStart: '2026-05-15', windowEnd: '2026-06-15', nextPaymentYear: 2026, nextPaymentMonth: 6 }
 */
export function getProjectionWindow(
  periodYear: number,
  periodMonth: number,
  cutoffDay: number
): {
  windowStart: string;
  windowEnd: string;
  nextPaymentYear: number;
  nextPaymentMonth: number;
} {
  if (!Number.isInteger(periodMonth) || periodMonth < 0 || periodMonth > 11) {
    throw new Error(
      `Invalid month: ${periodMonth}. Month must be an integer between 0 and 11.`
    );
  }

  // Previous month (rollover December -> January of previous year)
  let prevYear = periodYear;
  let prevMonth = periodMonth - 1;
  if (periodMonth === 0) {
    prevYear = periodYear - 1;
    prevMonth = 11;
  }

  // Next month (rollover December -> January of next year)
  let nextYear = periodYear;
  let nextMonth = periodMonth + 1;
  if (periodMonth === 11) {
    nextYear = periodYear + 1;
    nextMonth = 0;
  }

  return {
    windowStart: getCutoffDate(prevYear, prevMonth, cutoffDay),
    windowEnd: getCutoffDate(periodYear, periodMonth, cutoffDay),
    nextPaymentYear: nextYear,
    nextPaymentMonth: nextMonth,
  };
}

/**
 * Get the Spanish name of a month.
 * @param month - The month, 0-indexed (0 = January)
 * @returns The month name in Spanish
 * @throws Error if month is out of range (0-11)
 */
export function getSpanishMonthName(month: number): string {
  if (!Number.isInteger(month) || month < 0 || month > 11) {
    throw new Error(
      `Invalid month: ${month}. Month must be an integer between 0 and 11.`
    );
  }
  return MONTH_NAMES[month];
}

/**
 * Parse a YYYY-MM-DD date string into its components, with a 0-indexed month.
 * Used to format window dates for display without timezone hazards.
 *
 * @param dateString - The date string (YYYY-MM-DD)
 * @returns The date components
 * @throws Error if the date string is malformed
 *
 * @example
 * parseDateString('2026-08-15') // { year: 2026, month: 7, day: 15 }
 */
export function parseDateString(dateString: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
  if (!match) {
    throw new Error(`Invalid date string: ${dateString}. Expected YYYY-MM-DD.`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]) - 1; // 0-indexed
  const day = Number(match[3]);

  if (month < 0 || month > 11 || day < 1 || day > 31) {
    throw new Error(`Invalid date string: ${dateString}. Expected YYYY-MM-DD.`);
  }

  return { year, month, day };
}
