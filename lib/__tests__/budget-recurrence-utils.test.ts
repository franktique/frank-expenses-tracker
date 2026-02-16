import {
  expandBudgetPayments,
  validateRecurrenceParams,
  getRecurrenceDescription,
  calculateExpectedPayments,
} from '../budget-recurrence-utils';
import type { BudgetRecurrenceParams } from '../budget-recurrence-utils';

describe('budget-recurrence-utils', () => {
  describe('expandBudgetPayments', () => {
    const baseParams: BudgetRecurrenceParams = {
      budgetId: 'test-budget-id',
      categoryId: 'test-category-id',
      periodId: 'test-period-id',
      totalAmount: 400,
      paymentMethod: 'cash',
      recurrenceFrequency: null,
      recurrenceStartDay: 5,
      periodMonth: 1, // February (0-indexed)
      periodYear: 2025,
    };

    it('should return single payment for non-recurring budget', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: null,
        recurrenceStartDay: 5,
        periodMonth: 0, // January
      });

      expect(result).toHaveLength(1);
      expect(result[0].amount).toBe(400);
      expect(result[0].date).toBe('2025-01-05');
      expect(result[0].isRecurring).toBe(false);
    });

    it('should split weekly budget into 4 payments in February 2025', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: 'weekly',
        recurrenceStartDay: 5,
        periodMonth: 1, // February 2025 (28 days)
        periodYear: 2025,
      });

      expect(result).toHaveLength(4);
      expect(result[0].date).toBe('2025-02-05');
      expect(result[1].date).toBe('2025-02-12');
      expect(result[2].date).toBe('2025-02-19');
      expect(result[3].date).toBe('2025-02-26');

      // Verify amounts sum to total
      const sum = result.reduce((acc, p) => acc + p.amount, 0);
      expect(sum).toBe(400);

      // Verify metadata
      expect(result[0].isRecurring).toBe(true);
      expect(result[0].occurrenceNumber).toBe(1);
      expect(result[0].totalOccurrences).toBe(4);
    });

    it('should split bi-weekly budget correctly in January', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: 'bi-weekly',
        recurrenceStartDay: 1,
        periodMonth: 0, // January (31 days)
        periodYear: 2025,
      });

      expect(result).toHaveLength(3); // Jan 1, 15, 29
      expect(result[0].date).toBe('2025-01-01');
      expect(result[1].date).toBe('2025-01-15');
      expect(result[2].date).toBe('2025-01-29');

      // Verify sum
      const sum = result.reduce((acc, p) => acc + p.amount, 0);
      expect(sum).toBe(400);
    });

    it('should handle rounding with last payment absorbing remainder', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        totalAmount: 101,
        recurrenceFrequency: 'weekly',
        recurrenceStartDay: 1,
        periodMonth: 3, // April 2025 (30 days)
        periodYear: 2025,
      });

      expect(result).toHaveLength(5); // Apr 1, 8, 15, 22, 29

      // $101 / 5 = $20.20 base
      // Base calculation: Math.floor((101 / 5) * 100) / 100 = Math.floor(20.2 * 100) / 100 = 2020 / 100 = 20.20
      // Remainder: 101 - (20.20 * 5) = 101 - 101 = 0.00
      expect(result[0].amount).toBe(20.2);
      expect(result[1].amount).toBe(20.2);
      expect(result[2].amount).toBe(20.2);
      expect(result[3].amount).toBe(20.2);
      expect(result[4].amount).toBe(20.2); // Last payment: 20.20 + 0.00

      // Verify exact sum
      const sum = result.reduce((acc, p) => acc + p.amount, 0);
      expect(sum).toBeCloseTo(101, 10); // Use toBeCloseTo for floating point
    });

    it('should handle start day exceeding month length (day 31 in February)', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: 'weekly',
        recurrenceStartDay: 31,
        periodMonth: 1, // February 2025 (28 days)
        periodYear: 2025,
      });

      // Should start on Feb 28 (last valid day)
      expect(result[0].date).toBe('2025-02-28');
      expect(result).toHaveLength(1); // Only 1 payment fits
    });

    it('should handle start day 31 in April (30 days)', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: 'weekly',
        recurrenceStartDay: 31,
        periodMonth: 3, // April (30 days)
        periodYear: 2025,
      });

      // Should start on Apr 30
      expect(result[0].date).toBe('2025-04-30');
      expect(result).toHaveLength(1);
    });

    it("should return single payment if bi-weekly doesn't fit twice", () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: 'bi-weekly',
        recurrenceStartDay: 28,
        periodMonth: 1, // February (28 days)
        periodYear: 2025,
      });

      expect(result).toHaveLength(1); // Only Feb 28, next would be Mar 14
      expect(result[0].date).toBe('2025-02-28');
      expect(result[0].amount).toBe(400); // Full amount
    });

    it('should handle weekly in 30-day month starting day 1', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: 'weekly',
        recurrenceStartDay: 1,
        periodMonth: 3, // April (30 days)
        periodYear: 2025,
      });

      expect(result).toHaveLength(5); // Apr 1, 8, 15, 22, 29
      expect(result[0].date).toBe('2025-04-01');
      expect(result[4].date).toBe('2025-04-29');
    });

    it('should default to day 1 if recurrenceStartDay is null for non-recurring', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: null,
        recurrenceStartDay: null,
        periodMonth: 0, // January
      });

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe('2025-01-01'); // Defaults to day 1
    });

    it('should handle leap year February (29 days)', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        recurrenceFrequency: 'weekly',
        recurrenceStartDay: 1,
        periodMonth: 1, // February
        periodYear: 2024, // Leap year
      });

      expect(result).toHaveLength(5); // Feb 1, 8, 15, 22, 29
      expect(result[4].date).toBe('2024-02-29');
    });

    it('should handle bi-weekly starting mid-month', () => {
      const result = expandBudgetPayments({
        ...baseParams,
        totalAmount: 300,
        recurrenceFrequency: 'bi-weekly',
        recurrenceStartDay: 15,
        periodMonth: 0, // January (31 days)
        periodYear: 2025,
      });

      expect(result).toHaveLength(2); // Jan 15, 29
      expect(result[0].date).toBe('2025-01-15');
      expect(result[1].date).toBe('2025-01-29');

      // Verify amounts
      const sum = result.reduce((acc, p) => acc + p.amount, 0);
      expect(sum).toBe(300);
    });
  });

  describe('validateRecurrenceParams', () => {
    it('should validate weekly recurrence with start day', () => {
      const result = validateRecurrenceParams('weekly', 5);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate bi-weekly recurrence with start day', () => {
      const result = validateRecurrenceParams('bi-weekly', 15);
      expect(result.valid).toBe(true);
    });

    it('should validate null recurrence (one-time payment)', () => {
      const result = validateRecurrenceParams(null, 1);
      expect(result.valid).toBe(true);
    });

    it('should fail if recurrence is set but no start day', () => {
      const result = validateRecurrenceParams('weekly', null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('día de inicio es obligatorio');
    });

    it('should fail if start day is less than 1', () => {
      const result = validateRecurrenceParams('weekly', 0);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('entre 1 y 31');
    });

    it('should fail if start day is greater than 31', () => {
      const result = validateRecurrenceParams('weekly', 32);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('entre 1 y 31');
    });
  });

  describe('getRecurrenceDescription', () => {
    it('should return description for weekly recurrence', () => {
      const desc = getRecurrenceDescription('weekly', 5);
      expect(desc).toBe('Semanal a partir del día 5');
    });

    it('should return description for bi-weekly recurrence', () => {
      const desc = getRecurrenceDescription('bi-weekly', 15);
      expect(desc).toBe('Quincenal a partir del día 15');
    });

    it('should return description for one-time payment', () => {
      const desc = getRecurrenceDescription(null, 1);
      expect(desc).toBe('Pago único');
    });

    it('should handle recurrence without start day', () => {
      const desc = getRecurrenceDescription('weekly', null);
      expect(desc).toBe('Semanal');
    });
  });

  describe('calculateExpectedPayments', () => {
    it('should calculate 4 payments for weekly in February', () => {
      const count = calculateExpectedPayments('weekly', 5, 1, 2025);
      expect(count).toBe(4); // Feb 5, 12, 19, 26
    });

    it('should calculate 5 payments for weekly starting day 1 in April', () => {
      const count = calculateExpectedPayments('weekly', 1, 3, 2025);
      expect(count).toBe(5); // Apr 1, 8, 15, 22, 29
    });

    it('should calculate 3 payments for bi-weekly starting day 1 in January', () => {
      const count = calculateExpectedPayments('bi-weekly', 1, 0, 2025);
      expect(count).toBe(3); // Jan 1, 15, 29
    });

    it('should return 1 for one-time payment', () => {
      const count = calculateExpectedPayments(null, 5, 1, 2025);
      expect(count).toBe(1);
    });

    it('should return 1 if start day exceeds month length', () => {
      const count = calculateExpectedPayments('weekly', 31, 1, 2025);
      expect(count).toBe(1); // Only Feb 28
    });

    it('should handle leap year', () => {
      const count = calculateExpectedPayments('weekly', 1, 1, 2024);
      expect(count).toBe(5); // Feb 1, 8, 15, 22, 29 in leap year
    });
  });
});
