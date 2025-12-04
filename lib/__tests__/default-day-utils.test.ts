/**
 * Tests for default-day-utils
 * Tests the date calculation logic for default day features
 */

import {
  calculateDefaultDate,
  getDaysInMonth,
  isValidDay,
  formatDefaultDay,
  getDefaultDayDescription,
} from "../default-day-utils";

describe("default-day-utils", () => {
  describe("calculateDefaultDate", () => {
    it("should calculate date for valid day in month", () => {
      const result = calculateDefaultDate(15, new Date("2025-01-01"), new Date("2025-03-31"));
      expect(result).toBe("2025-03-15");
    });

    it("should use last day of month when specified day > days in month", () => {
      // February 2025 only has 28 days
      const result = calculateDefaultDate(31, new Date("2025-01-01"), new Date("2025-02-28"));
      expect(result).toBe("2025-02-28");
    });

    it("should handle edge case: day 1", () => {
      const result = calculateDefaultDate(1, new Date("2025-01-01"), new Date("2025-12-31"));
      expect(result).toBe("2025-12-01");
    });

    it("should handle edge case: day 31", () => {
      const result = calculateDefaultDate(31, new Date("2025-01-01"), new Date("2025-01-31"));
      expect(result).toBe("2025-01-31");
    });

    it("should handle February in leap year (29 days)", () => {
      // 2024 is a leap year
      const result = calculateDefaultDate(29, new Date("2024-01-01"), new Date("2024-02-29"));
      expect(result).toBe("2024-02-29");
    });

    it("should handle February in non-leap year (28 days)", () => {
      // 2025 is not a leap year
      const result = calculateDefaultDate(29, new Date("2025-01-01"), new Date("2025-02-28"));
      expect(result).toBe("2025-02-28");
    });

    it("should work with string dates", () => {
      const result = calculateDefaultDate(15, "2025-01-01", "2025-03-31");
      expect(result).toBe("2025-03-15");
    });

    it("should return null when day is null", () => {
      const result = calculateDefaultDate(null, new Date("2025-01-01"), new Date("2025-03-31"));
      expect(result).toBeNull();
    });

    it("should return null when day is undefined", () => {
      const result = calculateDefaultDate(undefined, new Date("2025-01-01"), new Date("2025-03-31"));
      expect(result).toBeNull();
    });

    it("should throw error for invalid day < 1", () => {
      expect(() => {
        calculateDefaultDate(0, new Date("2025-01-01"), new Date("2025-03-31"));
      }).toThrow("Invalid day: 0");
    });

    it("should throw error for invalid day > 31", () => {
      expect(() => {
        calculateDefaultDate(32, new Date("2025-01-01"), new Date("2025-03-31"));
      }).toThrow("Invalid day: 32");
    });

    it("should throw error for non-integer day", () => {
      expect(() => {
        calculateDefaultDate(15.5, new Date("2025-01-01"), new Date("2025-03-31"));
      }).toThrow("Invalid day: 15.5");
    });

    it("should handle different month ranges", () => {
      // Jan-June (6 months)
      const result = calculateDefaultDate(15, new Date("2025-01-01"), new Date("2025-06-30"));
      expect(result).toBe("2025-06-15");

      // Just February
      const febResult = calculateDefaultDate(28, new Date("2025-02-01"), new Date("2025-02-28"));
      expect(febResult).toBe("2025-02-28");
    });

    it("should handle April (30 days) with day 31", () => {
      const result = calculateDefaultDate(31, new Date("2025-01-01"), new Date("2025-04-30"));
      expect(result).toBe("2025-04-30");
    });

    it("should handle June (30 days) with day 31", () => {
      const result = calculateDefaultDate(31, new Date("2025-01-01"), new Date("2025-06-30"));
      expect(result).toBe("2025-06-30");
    });

    it("should handle September (30 days) with day 31", () => {
      const result = calculateDefaultDate(31, new Date("2025-01-01"), new Date("2025-09-30"));
      expect(result).toBe("2025-09-30");
    });

    it("should handle November (30 days) with day 31", () => {
      const result = calculateDefaultDate(31, new Date("2025-01-01"), new Date("2025-11-30"));
      expect(result).toBe("2025-11-30");
    });
  });

  describe("getDaysInMonth", () => {
    it("should return correct days for each month in non-leap year", () => {
      expect(getDaysInMonth(2025, 1)).toBe(31);  // January
      expect(getDaysInMonth(2025, 2)).toBe(28);  // February (non-leap)
      expect(getDaysInMonth(2025, 3)).toBe(31);  // March
      expect(getDaysInMonth(2025, 4)).toBe(30);  // April
      expect(getDaysInMonth(2025, 5)).toBe(31);  // May
      expect(getDaysInMonth(2025, 6)).toBe(30);  // June
      expect(getDaysInMonth(2025, 7)).toBe(31);  // July
      expect(getDaysInMonth(2025, 8)).toBe(31);  // August
      expect(getDaysInMonth(2025, 9)).toBe(30);  // September
      expect(getDaysInMonth(2025, 10)).toBe(31); // October
      expect(getDaysInMonth(2025, 11)).toBe(30); // November
      expect(getDaysInMonth(2025, 12)).toBe(31); // December
    });

    it("should return 29 for February in leap year", () => {
      expect(getDaysInMonth(2024, 2)).toBe(29);
    });

    it("should return 28 for February in non-leap year", () => {
      expect(getDaysInMonth(2025, 2)).toBe(28);
    });

    it("should throw error for invalid month < 1", () => {
      expect(() => {
        getDaysInMonth(2025, 0);
      }).toThrow("Invalid month: 0");
    });

    it("should throw error for invalid month > 12", () => {
      expect(() => {
        getDaysInMonth(2025, 13);
      }).toThrow("Invalid month: 13");
    });
  });

  describe("isValidDay", () => {
    it("should return true for valid days 1-31", () => {
      expect(isValidDay(1)).toBe(true);
      expect(isValidDay(15)).toBe(true);
      expect(isValidDay(31)).toBe(true);
    });

    it("should return true for null", () => {
      expect(isValidDay(null)).toBe(true);
    });

    it("should return true for undefined", () => {
      expect(isValidDay(undefined)).toBe(true);
    });

    it("should return false for day < 1", () => {
      expect(isValidDay(0)).toBe(false);
      expect(isValidDay(-1)).toBe(false);
    });

    it("should return false for day > 31", () => {
      expect(isValidDay(32)).toBe(false);
      expect(isValidDay(100)).toBe(false);
    });

    it("should return false for non-integer days", () => {
      expect(isValidDay(15.5)).toBe(false);
      expect(isValidDay(1.1)).toBe(false);
    });
  });

  describe("formatDefaultDay", () => {
    it("should format day as string", () => {
      expect(formatDefaultDay(1)).toBe("1");
      expect(formatDefaultDay(15)).toBe("15");
      expect(formatDefaultDay(31)).toBe("31");
    });

    it("should return empty string for null", () => {
      expect(formatDefaultDay(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(formatDefaultDay(undefined)).toBe("");
    });
  });

  describe("getDefaultDayDescription", () => {
    it("should return ordinal suffix for days with ordinals", () => {
      expect(getDefaultDayDescription(1)).toBe("1st");
      expect(getDefaultDayDescription(2)).toBe("2nd");
      expect(getDefaultDayDescription(3)).toBe("3rd");
      expect(getDefaultDayDescription(4)).toBe("4th");
    });

    it("should handle teens correctly", () => {
      expect(getDefaultDayDescription(11)).toBe("11th");
      expect(getDefaultDayDescription(12)).toBe("12th");
      expect(getDefaultDayDescription(13)).toBe("13th");
    });

    it("should handle twenties correctly", () => {
      expect(getDefaultDayDescription(21)).toBe("21st");
      expect(getDefaultDayDescription(22)).toBe("22nd");
      expect(getDefaultDayDescription(23)).toBe("23rd");
      expect(getDefaultDayDescription(24)).toBe("24th");
    });

    it("should handle thirty-first correctly", () => {
      expect(getDefaultDayDescription(31)).toBe("31st");
    });

    it("should return Spanish text for null/undefined", () => {
      expect(getDefaultDayDescription(null)).toBe("No especificado");
      expect(getDefaultDayDescription(undefined)).toBe("No especificado");
    });

    it("should work without ordinal suffix when includeOrdinal is false", () => {
      expect(getDefaultDayDescription(1, false)).toBe("1");
      expect(getDefaultDayDescription(15, false)).toBe("15");
      expect(getDefaultDayDescription(31, false)).toBe("31");
    });

    it("should return Spanish text for null/undefined even with includeOrdinal false", () => {
      expect(getDefaultDayDescription(null, false)).toBe("No especificado");
      expect(getDefaultDayDescription(undefined, false)).toBe("No especificado");
    });
  });

  describe("edge cases and integration", () => {
    it("should handle year transitions correctly", () => {
      // December to January
      const result = calculateDefaultDate(15, new Date("2024-12-01"), new Date("2025-01-31"));
      expect(result).toBe("2025-01-15");
    });

    it("should handle multiple year range", () => {
      const result = calculateDefaultDate(15, new Date("2024-01-01"), new Date("2025-12-31"));
      expect(result).toBe("2025-12-15");
    });

    it("should work with ISO date strings", () => {
      const result = calculateDefaultDate(20, "2025-03-15", "2025-06-30");
      expect(result).toBe("2025-06-20");
    });
  });
});
