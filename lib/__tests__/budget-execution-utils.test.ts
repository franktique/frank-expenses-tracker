import {
  formatChartData,
  formatCurrency,
  getXAxisLabel,
  formatDateRange,
  calculateBudgetStats,
  isDataSparse,
} from '@/lib/budget-execution-utils';
import type { BudgetExecutionData } from '@/types/funds';

describe('budget-execution-utils', () => {
  describe('formatCurrency', () => {
    it('should format number as Mexican Peso', () => {
      const result = formatCurrency(1000);
      expect(result).toContain('1');
      expect(result).toContain('00');
    });

    it('should handle zero', () => {
      const result = formatCurrency(0);
      expect(result).toBeDefined();
    });

    it('should handle large numbers', () => {
      const result = formatCurrency(1000000);
      expect(result).toBeDefined();
    });

    it('should handle decimals', () => {
      const result = formatCurrency(1234.56);
      expect(result).toBeDefined();
    });
  });

  describe('formatChartData', () => {
    const mockDailyData: BudgetExecutionData[] = [
      {
        date: '2025-12-01',
        amount: 1000,
        dayOfWeek: 1,
      },
      {
        date: '2025-12-02',
        amount: 1500,
        dayOfWeek: 2,
      },
    ];

    const mockWeeklyData: BudgetExecutionData[] = [
      {
        date: 'week-1',
        amount: 5000,
        weekNumber: 1,
        weekStart: '2025-01-06',
        weekEnd: '2025-01-12',
      },
      {
        date: 'week-2',
        amount: 6000,
        weekNumber: 2,
        weekStart: '2025-01-13',
        weekEnd: '2025-01-19',
      },
    ];

    it('should format daily data for chart display', () => {
      const result = formatChartData(mockDailyData, 'daily');
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('displayDate');
      expect(result[0]).toHaveProperty('fullDate');
      expect(result[0].date).toBe('2025-12-01');
      expect(result[0].amount).toBe(1000);
    });

    it('should format weekly data for chart display', () => {
      const result = formatChartData(mockWeeklyData, 'weekly');
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('displayDate');
      expect(result[0]).toHaveProperty('fullDate');
      expect(result[0].displayDate).toContain('Sem');
    });

    it('should preserve amount values', () => {
      const result = formatChartData(mockDailyData, 'daily');
      expect(result[0].amount).toBe(1000);
      expect(result[1].amount).toBe(1500);
    });
  });

  describe('getXAxisLabel', () => {
    it("should return 'Fecha' for daily view", () => {
      expect(getXAxisLabel('daily')).toBe('Fecha');
    });

    it("should return 'Semana' for weekly view", () => {
      expect(getXAxisLabel('weekly')).toBe('Semana');
    });
  });

  describe('formatDateRange', () => {
    it('should format December 2025 date range', () => {
      const result = formatDateRange('Diciembre 2025', 11, 2025);
      expect(result).toContain('1');
      expect(result).toContain('31');
      expect(result).toContain('2025');
    });

    it('should format February 2025 date range', () => {
      const result = formatDateRange('Febrero 2025', 1, 2025);
      expect(result).toContain('1');
      expect(result).toContain('28');
    });

    it('should include period name context', () => {
      const result = formatDateRange('Enero', 0, 2025);
      expect(result).toBeDefined();
      expect(result.length > 0).toBe(true);
    });
  });

  describe('calculateBudgetStats', () => {
    const mockData: BudgetExecutionData[] = [
      { date: '2025-12-01', amount: 100 },
      { date: '2025-12-02', amount: 200 },
      { date: '2025-12-03', amount: 300 },
    ];

    it('should calculate total correctly', () => {
      const stats = calculateBudgetStats(mockData);
      expect(stats.total).toBe(600);
    });

    it('should calculate average correctly', () => {
      const stats = calculateBudgetStats(mockData);
      expect(stats.average).toBe(200);
    });

    it('should identify peak', () => {
      const stats = calculateBudgetStats(mockData);
      expect(stats.peak).toBe(300);
    });

    it('should identify minimum', () => {
      const stats = calculateBudgetStats(mockData);
      expect(stats.min).toBe(100);
    });

    it('should handle empty data', () => {
      const stats = calculateBudgetStats([]);
      expect(stats.total).toBe(0);
      expect(stats.average).toBe(0);
      expect(stats.peak).toBe(0);
      expect(stats.min).toBe(0);
    });

    it('should handle single item', () => {
      const singleItem: BudgetExecutionData[] = [
        { date: '2025-12-01', amount: 500 },
      ];
      const stats = calculateBudgetStats(singleItem);
      expect(stats.total).toBe(500);
      expect(stats.average).toBe(500);
      expect(stats.peak).toBe(500);
      expect(stats.min).toBe(500);
    });
  });

  describe('isDataSparse', () => {
    it('should return false for data covering more than 10% of period', () => {
      const data: BudgetExecutionData[] = Array.from({ length: 5 }, (_, i) => ({
        date: `2025-12-${String(i + 1).padStart(2, '0')}`,
        amount: 100,
      }));
      const result = isDataSparse(data, 31); // 5/31 = 16%
      expect(result).toBe(false);
    });

    it('should return true for data covering less than 10% of period', () => {
      const data: BudgetExecutionData[] = [
        { date: '2025-12-01', amount: 100 },
        { date: '2025-12-02', amount: 100 },
      ];
      const result = isDataSparse(data, 31); // 2/31 = 6.5%
      expect(result).toBe(true);
    });

    it('should return true for empty data', () => {
      const result = isDataSparse([], 31);
      expect(result).toBe(true);
    });

    it('should handle exactly 10% coverage', () => {
      const data: BudgetExecutionData[] = Array.from({ length: 3 }, (_, i) => ({
        date: `2025-12-${String(i + 1).padStart(2, '0')}`,
        amount: 100,
      }));
      const result = isDataSparse(data, 30); // 3/30 = 10%
      expect(result).toBe(false);
    });
  });
});
