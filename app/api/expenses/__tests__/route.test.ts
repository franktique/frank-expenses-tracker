/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { sql } from '@/lib/db';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  sql: jest.fn(),
}));

const mockSql = sql as jest.MockedFunction<typeof sql>;

// The sql tagged template receives (strings: string[], ...values). Helper to
// read the SQL text of a given call.
const sqlTextOf = (call: unknown[]) => (call[0] as unknown as string[]).join('');

const CATEGORY_ID = '11111111-1111-4111-8111-111111111111';
const PERIOD_ID = '22222222-2222-4222-8222-222222222222';
const DESTINATION_FUND_ID = '33333333-3333-4333-8333-333333333333';

describe('/api/expenses', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET', () => {
    const mockExpenses = [
      {
        id: 'expense-1',
        category_id: 'cat-1',
        period_id: 'period-1',
        payment_method: 'credit',
        description: 'Test expense',
        amount: 100,
        event: null,
        date: '2024-01-15',
        source_fund_id: 'fund-1',
        destination_fund_id: 'fund-2',
        category_name: 'Test Category',
        period_name: 'January 2024',
        source_fund_name: 'Source Fund',
        destination_fund_name: 'Destination Fund',
      },
      {
        id: 'expense-2',
        category_id: 'cat-1',
        period_id: 'period-1',
        payment_method: 'debit',
        description: 'Another expense',
        amount: 50,
        event: 'Test event',
        date: '2024-01-16',
        source_fund_id: 'fund-1',
        destination_fund_id: null,
        category_name: 'Test Category',
        period_name: 'January 2024',
        source_fund_name: 'Source Fund',
        destination_fund_name: null,
      },
    ];

    it('should return all expenses with source fund information when no filter is applied', async () => {
      mockSql.mockResolvedValueOnce(mockExpenses);

      const request = new NextRequest('http://localhost:3000/api/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockExpenses);
      expect(sqlTextOf(mockSql.mock.calls[0])).toContain(
        'LEFT JOIN funds sf ON e.source_fund_id = sf.id'
      );
      expect(sqlTextOf(mockSql.mock.calls[0])).toContain(
        'LEFT JOIN funds df ON e.destination_fund_id = df.id'
      );
    });

    it('should filter expenses by source fund when fund_id parameter is provided', async () => {
      const filteredExpenses = [mockExpenses[0]];
      mockSql.mockResolvedValueOnce(filteredExpenses);

      const request = new NextRequest(
        'http://localhost:3000/api/expenses?fund_id=fund-1'
      );
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(filteredExpenses);
      const fundCall = mockSql.mock.calls[0];
      expect(sqlTextOf(fundCall)).toContain('WHERE e.source_fund_id = ');
      expect(fundCall[1]).toBe('fund-1');
    });

    it('should include category fund relationships in filter query', async () => {
      mockSql.mockResolvedValueOnce([]);

      const request = new NextRequest(
        'http://localhost:3000/api/expenses?fund_id=fund-1'
      );
      await GET(request);

      expect(sqlTextOf(mockSql.mock.calls[0])).toContain('EXISTS (');
      expect(sqlTextOf(mockSql.mock.calls[0])).toContain(
        'category_fund_relationships cfr'
      );
    });

    it('should handle database errors gracefully', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database connection failed'));

      const request = new NextRequest('http://localhost:3000/api/expenses');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database connection failed');
    });
  });

  describe('POST', () => {
    const validExpenseData = {
      category_id: CATEGORY_ID,
      period_id: PERIOD_ID,
      date: '2024-01-15',
      event: 'Test event',
      payment_method: 'credit',
      description: 'Test expense',
      amount: 100,
      source_fund_id: 'fund-1',
      destination_fund_id: DESTINATION_FUND_ID,
    };

    const mockNewExpense = {
      id: 'expense-1',
      ...validExpenseData,
    };

    const mockExpenseWithFunds = {
      ...mockNewExpense,
      category_name: 'Test Category',
      period_name: 'January 2024',
      source_fund_name: 'Source Fund',
      destination_fund_name: 'Destination Fund',
    };

    it('should create expense with source fund validation', async () => {
      mockSql
        .mockResolvedValueOnce([mockNewExpense]) // INSERT expense
        .mockResolvedValueOnce([]) // UPDATE source fund balance
        .mockResolvedValueOnce([]) // UPDATE destination fund balance
        .mockResolvedValueOnce([mockExpenseWithFunds]); // SELECT expense with funds

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toEqual(mockExpenseWithFunds);
    });

    it('defaults is_verified to true when omitted (manual expenses)', async () => {
      mockSql
        .mockResolvedValueOnce([mockNewExpense]) // INSERT expense
        .mockResolvedValueOnce([]) // UPDATE source fund balance
        .mockResolvedValueOnce([]) // UPDATE destination fund balance
        .mockResolvedValueOnce([mockExpenseWithFunds]); // SELECT expense with funds

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      expect(response.status).toBe(201);

      // The INSERT is the first sql call; the is_verified placeholder maps to `true`
      const insertCall = mockSql.mock.calls[0];
      const sqlTemplate = sqlTextOf(insertCall);
      expect(sqlTemplate).toContain('is_verified');
      expect(insertCall).toContain(true);
    });

    it('persists is_verified = false sent by the mobile scanner', async () => {
      mockSql
        .mockResolvedValueOnce([{ ...mockNewExpense, is_verified: false }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          { ...mockExpenseWithFunds, is_verified: false },
        ]);

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify({ ...validExpenseData, is_verified: false }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.is_verified).toBe(false);
      expect(mockSql.mock.calls[0]).toContain(false);
    });

    it('should update fund balances correctly for transfers', async () => {
      mockSql
        .mockResolvedValueOnce([mockNewExpense])
        .mockResolvedValueOnce([]) // UPDATE source fund balance
        .mockResolvedValueOnce([]) // UPDATE destination fund balance
        .mockResolvedValueOnce([mockExpenseWithFunds]);

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      await POST(request);

      const updateCalls = mockSql.mock.calls.filter((call: unknown[]) =>
        sqlTextOf(call).includes('UPDATE funds')
      );

      // Source fund balance decrease and destination fund balance increase
      expect(
        updateCalls.some((call: unknown[]) =>
          sqlTextOf(call).includes('current_balance = current_balance - ')
        )
      ).toBe(true);
      expect(
        updateCalls.some((call: unknown[]) =>
          sqlTextOf(call).includes('current_balance = current_balance + ')
        )
      ).toBe(true);
    });

    it('should handle expenses without destination fund (internal expenses)', async () => {
      const internalExpenseData = {
        ...validExpenseData,
        destination_fund_id: undefined,
      };

      mockSql
        .mockResolvedValueOnce([
          { ...mockNewExpense, destination_fund_id: null },
        ])
        .mockResolvedValueOnce([]) // UPDATE source fund balance only
        .mockResolvedValueOnce([
          {
            ...mockExpenseWithFunds,
            destination_fund_id: null,
            destination_fund_name: null,
          },
        ]);

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(internalExpenseData),
      });

      await POST(request);

      // Should only update source fund balance
      expect(mockSql).toHaveBeenCalledTimes(3); // INSERT, UPDATE source, SELECT
    });

    it('should reject invalid request data', async () => {
      const invalidData = {
        ...validExpenseData,
        description: '', // Vacío: falla min(1) de CreateExpenseSchema
      };

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(invalidData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should handle ISO date strings correctly', async () => {
      const dataWithISODate = {
        ...validExpenseData,
        date: '2024-01-15T10:30:00.000Z',
      };

      mockSql
        .mockResolvedValueOnce([mockNewExpense])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockExpenseWithFunds]);

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(dataWithISODate),
      });

      await POST(request);

      // Should extract only the date part (the INSERT's third interpolation)
      const insertCall = mockSql.mock.calls[0];
      expect(sqlTextOf(insertCall)).toContain('INSERT INTO expenses');
      expect(insertCall[3]).toBe('2024-01-15');
    });

    it('should handle database errors during expense creation', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database insert failed'));

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database insert failed');
    });

    it('should handle fund balance update failures', async () => {
      mockSql
        .mockResolvedValueOnce([mockNewExpense]) // INSERT succeeds
        .mockRejectedValueOnce(new Error('Fund balance update failed')); // UPDATE fails

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Fund balance update failed');
    });
  });
});
