/**
 * Utility functions for handling default day calculations
 * Used to calculate actual dates based on a preferred day of month (1-31)
 */

/**
 * Calculate the actual date for a given day within a period
 *
 * Given a preferred day of month (1-31), this function calculates the actual date
 * within the specified period. If the day doesn't exist in the target month
 * (e.g., 31st in February), it returns the last day of that month.
 *
 * @param day - The preferred day of month (1-31)
 * @param periodStartDate - The start date of the period
 * @param periodEndDate - The end date of the period
 * @returns The calculated date (as string in ISO format YYYY-MM-DD)
 * @throws Error if day is invalid (< 1 or > 31)
 *
 * @example
 * // For a period Jan-Mar 2025 with default_day = 15
 * // Returns "2025-03-15" (15th of the last month, March)
 * calculateDefaultDate(15, new Date("2025-01-01"), new Date("2025-03-31"))
 *
 * @example
 * // For a period Jan-Feb 2025 with default_day = 31
 * // Returns "2025-02-28" (Feb only has 28 days in 2025)
 * calculateDefaultDate(31, new Date("2025-01-01"), new Date("2025-02-28"))
 */
export function calculateDefaultDate(
  day: number | null | undefined,
  periodStartDate: Date | string,
  periodEndDate: Date | string
): string | null {
  // Return null if day is not provided
  if (day === null || day === undefined) {
    return null;
  }

  // Validate day is within valid range
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Day must be an integer between 1 and 31.`);
  }

  // Convert strings to Date objects if needed
  const start = typeof periodStartDate === "string" ? new Date(periodStartDate) : periodStartDate;
  const end = typeof periodEndDate === "string" ? new Date(periodEndDate) : periodEndDate;

  // Get the year and month of the period's end date (last month in the period)
  const year = end.getFullYear();
  const month = end.getMonth(); // 0-11

  // Get the number of days in the target month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Use the day if it exists in the month, otherwise use the last day of the month
  const actualDay = Math.min(day, daysInMonth);

  // Create the date (month is 0-indexed, so we add 1 when creating date)
  const targetDate = new Date(year, month, actualDay);

  // Return in ISO format YYYY-MM-DD
  return targetDate.toISOString().split("T")[0];
}

/**
 * Get the number of days in a specific month
 * @param year - The year
 * @param month - The month (1-12)
 * @returns The number of days in the month
 */
export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Month must be between 1 and 12.`);
  }

  // JavaScript Date uses 0-11 for months, so convert
  const jsMonth = month - 1;
  return new Date(year, jsMonth + 1, 0).getDate();
}

/**
 * Validate that a day is within the valid range (1-31)
 * @param day - The day to validate
 * @returns true if valid, false otherwise
 */
export function isValidDay(day: number | null | undefined): boolean {
  if (day === null || day === undefined) {
    return true; // null/undefined is valid (means no default day)
  }
  return Number.isInteger(day) && day >= 1 && day <= 31;
}

/**
 * Format a default day for display
 * @param day - The day to format
 * @returns Formatted string or empty string if null
 *
 * @example
 * formatDefaultDay(15) // "15"
 * formatDefaultDay(null) // ""
 */
export function formatDefaultDay(day: number | null | undefined): string {
  if (day === null || day === undefined) {
    return "";
  }
  return day.toString();
}

/**
 * Get a human-readable description of a default day
 * @param day - The day number
 * @param includeOrdinal - If true, includes ordinal suffix (1st, 2nd, 3rd, etc.)
 * @returns Description string
 *
 * @example
 * getDefaultDayDescription(1) // "1st"
 * getDefaultDayDescription(15) // "15th"
 * getDefaultDayDescription(31, false) // "31"
 */
export function getDefaultDayDescription(day: number | null | undefined, includeOrdinal = true): string {
  if (day === null || day === undefined) {
    return "No especificado";
  }

  if (!includeOrdinal) {
    return day.toString();
  }

  // Get ordinal suffix
  let suffix = "th";
  if (day === 1 || day === 21 || day === 31) suffix = "st";
  else if (day === 2 || day === 22) suffix = "nd";
  else if (day === 3 || day === 23) suffix = "rd";

  return `${day}${suffix}`;
}
