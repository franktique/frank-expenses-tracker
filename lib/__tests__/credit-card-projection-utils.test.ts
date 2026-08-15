/**
 * Tests for credit-card-projection-utils
 * Tests the statement cycle window and corte date calculation logic
 */

import {
  getCutoffDate,
  getProjectionWindow,
  getSpanishMonthName,
  parseDateString,
} from '../credit-card-projection-utils';

describe('credit-card-projection-utils', () => {
  describe('getCutoffDate', () => {
    it('should return the exact date for a valid day', () => {
      expect(getCutoffDate(2026, 5, 15)).toBe('2026-06-15');
    });

    it('should return day 1', () => {
      expect(getCutoffDate(2026, 0, 1)).toBe('2026-01-01');
    });

    it('should clamp day 31 in February (28 days)', () => {
      // February 2025 only has 28 days
      expect(getCutoffDate(2025, 1, 31)).toBe('2025-02-28');
    });

    it('should clamp day 31 in a 30-day month', () => {
      expect(getCutoffDate(2025, 3, 31)).toBe('2025-04-30');
    });

    it('should keep day 29 in a leap-year February', () => {
      expect(getCutoffDate(2024, 1, 29)).toBe('2024-02-29');
    });

    it('should clamp day 29 in a non-leap February', () => {
      expect(getCutoffDate(2025, 1, 29)).toBe('2025-02-28');
    });

    it('should throw on day 0', () => {
      expect(() => getCutoffDate(2026, 5, 0)).toThrow('Invalid cutoff day: 0');
    });

    it('should throw on day 32', () => {
      expect(() => getCutoffDate(2026, 5, 32)).toThrow(
        'Invalid cutoff day: 32'
      );
    });

    it('should throw on non-integer day', () => {
      expect(() => getCutoffDate(2026, 5, 15.5)).toThrow(
        'Invalid cutoff day: 15.5'
      );
    });
  });

  describe('getProjectionWindow', () => {
    it('should compute a regular month window', () => {
      const window = getProjectionWindow(2026, 5, 15); // June 2026
      expect(window).toEqual({
        windowStart: '2026-05-15',
        windowEnd: '2026-06-15',
        nextPaymentYear: 2026,
        nextPaymentMonth: 6,
      });
    });

    it('should roll over January to December of the previous year', () => {
      const window = getProjectionWindow(2026, 0, 15); // January 2026
      expect(window.windowStart).toBe('2025-12-15');
      expect(window.windowEnd).toBe('2026-01-15');
      expect(window.nextPaymentMonth).toBe(1);
      expect(window.nextPaymentYear).toBe(2026);
    });

    it('should roll over December to January of the next year', () => {
      const window = getProjectionWindow(2026, 11, 15); // December 2026
      expect(window.windowStart).toBe('2026-11-15');
      expect(window.windowEnd).toBe('2026-12-15');
      expect(window.nextPaymentMonth).toBe(0);
      expect(window.nextPaymentYear).toBe(2027);
    });

    it('should clamp both bounds when cutoff day exceeds the month', () => {
      const window = getProjectionWindow(2026, 1, 31); // February 2026
      expect(window.windowStart).toBe('2026-01-31');
      expect(window.windowEnd).toBe('2026-02-28');
    });

    it('should clamp the start bound but keep the end bound', () => {
      const window = getProjectionWindow(2026, 2, 31); // March 2026
      expect(window.windowStart).toBe('2026-02-28');
      expect(window.windowEnd).toBe('2026-03-31');
    });

    it('should keep leap-year February in both bounds', () => {
      const window = getProjectionWindow(2024, 1, 29); // February 2024
      expect(window.windowStart).toBe('2024-01-29');
      expect(window.windowEnd).toBe('2024-02-29');
    });

    it('should handle December with a clamped previous bound', () => {
      const window = getProjectionWindow(2026, 11, 31); // December 2026
      expect(window.windowStart).toBe('2026-11-30');
      expect(window.windowEnd).toBe('2026-12-31');
      expect(window.nextPaymentMonth).toBe(0);
      expect(window.nextPaymentYear).toBe(2027);
    });

    it('should throw on an invalid month', () => {
      expect(() => getProjectionWindow(2026, 12, 15)).toThrow(
        'Invalid month: 12'
      );
      expect(() => getProjectionWindow(2026, -1, 15)).toThrow(
        'Invalid month: -1'
      );
    });

    it('should throw on an invalid cutoff day', () => {
      expect(() => getProjectionWindow(2026, 5, 32)).toThrow(
        'Invalid cutoff day: 32'
      );
    });
  });

  describe('getSpanishMonthName', () => {
    it('should return January for month 0', () => {
      expect(getSpanishMonthName(0)).toBe('Enero');
    });

    it('should return December for month 11', () => {
      expect(getSpanishMonthName(11)).toBe('Diciembre');
    });

    it('should return August for month 7', () => {
      expect(getSpanishMonthName(7)).toBe('Agosto');
    });

    it('should throw on month 12', () => {
      expect(() => getSpanishMonthName(12)).toThrow('Invalid month: 12');
    });

    it('should throw on month -1', () => {
      expect(() => getSpanishMonthName(-1)).toThrow('Invalid month: -1');
    });
  });

  describe('parseDateString', () => {
    it('should parse a valid date string with 0-indexed month', () => {
      expect(parseDateString('2026-08-15')).toEqual({
        year: 2026,
        month: 7,
        day: 15,
      });
    });

    it('should parse December as month 11', () => {
      expect(parseDateString('2025-12-01')).toEqual({
        year: 2025,
        month: 11,
        day: 1,
      });
    });

    it('should throw on malformed input', () => {
      expect(() => parseDateString('15-08-2026')).toThrow(
        'Invalid date string'
      );
      expect(() => parseDateString('2026-13-01')).toThrow(
        'Invalid date string'
      );
      expect(() => parseDateString('2026-08-32')).toThrow(
        'Invalid date string'
      );
    });
  });
});
