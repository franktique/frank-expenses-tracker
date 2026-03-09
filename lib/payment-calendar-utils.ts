import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import type { PaymentCalendarDay } from '@/types/funds';

export type PaymentMethodFilter = 'all' | 'cash' | 'credit';

/**
 * A week row in the calendar grid.
 * Null entries represent days from adjacent months (padding).
 */
export type CalendarWeek = (PaymentCalendarDay | null)[];

/**
 * Builds a 2D array of weeks for the calendar grid.
 * Each week starts on Monday (weekStartsOn = 1).
 * Null values represent padding days before/after the month.
 *
 * @param month - 1-indexed month
 * @param year - Full year
 * @param days - Array of PaymentCalendarDay from the API
 */
export function buildCalendarGrid(
  month: number,
  year: number,
  days: PaymentCalendarDay[]
): CalendarWeek[] {
  // Build a date → day lookup
  const dayMap = new Map<string, PaymentCalendarDay>(
    days.map((d) => [d.date, d])
  );

  const firstDay = startOfMonth(new Date(year, month - 1));
  const lastDay = endOfMonth(new Date(year, month - 1));

  const allDays = eachDayOfInterval({ start: firstDay, end: lastDay });

  const weeks: CalendarWeek[] = [];
  let currentWeek: CalendarWeek = [];

  // Monday = 1 in getDay (Sunday = 0), so we offset to make Monday the first column
  const firstDayOfWeek = getDay(firstDay); // 0=Sun, 1=Mon, ...6=Sat
  const paddingBefore = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // Add null padding for days before the month starts
  for (let i = 0; i < paddingBefore; i++) {
    currentWeek.push(null);
  }

  for (const day of allDays) {
    const dateStr = format(day, 'yyyy-MM-dd');
    currentWeek.push(dayMap.get(dateStr) ?? { date: dateStr, cashTotal: 0, creditTotal: 0, budgets: [] });

    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill remaining cells in last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  return weeks;
}

/**
 * Formats a currency amount for display using es-MX locale.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Returns the display totals for a calendar day based on the active filter.
 */
export function getDayTotals(
  day: PaymentCalendarDay,
  filter: PaymentMethodFilter
): { cashTotal: number; creditTotal: number } {
  if (filter === 'cash') {
    return { cashTotal: day.cashTotal, creditTotal: 0 };
  }
  if (filter === 'credit') {
    return { cashTotal: 0, creditTotal: day.creditTotal };
  }
  return { cashTotal: day.cashTotal, creditTotal: day.creditTotal };
}

/**
 * Returns true if the day has any amounts for the given filter.
 */
export function dayHasAmounts(
  day: PaymentCalendarDay,
  filter: PaymentMethodFilter
): boolean {
  const { cashTotal, creditTotal } = getDayTotals(day, filter);
  return cashTotal > 0 || creditTotal > 0;
}

/**
 * Returns the short day header labels (Mon-Sun).
 */
export function getWeekdayHeaders(): string[] {
  return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
}

/**
 * Formats a YYYY-MM-DD date string for display (e.g. "Miércoles 5 de Marzo").
 */
export function formatCalendarDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return format(date, "EEEE d 'de' MMMM", { locale: es });
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
