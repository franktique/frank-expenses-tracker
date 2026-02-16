/**
 * @jest-environment jsdom
 */

import { sql } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  sql: jest.fn(),
}));

const mockSql = sql as jest.MockedFunction<typeof sql>;

describe('Fund Balance Calculations with Source Fund Support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fund Recalculation with Source Fund Logic', () => {
    const mockFund = {
      id: 'fund-1',
      name: 'Test Fund',
      initial_balance: 1000,
      start_date: '2024-01-01',
      current_balance: 1000,
    };

    it('should calculate balance using source_fund_id for outgoing expenses', async () => {
      const mockIncomeResult = [{ total: 500 }];
      const mockExpenseOutResult = [{ total: 300 }]; // Money going out (source_fund_id)
      const mockExpenseInResult = [{ total: 100 }]; // Money coming in (destination_fund_id)

      mockSql
        .mockResolvedValueOnce([mockFund]) // Fund lookup
        .mockResolvedValueOnce(mockIncomeResult) // Income calculation
        .mockResolvedValueOnce(mockExpenseOutResult) // Expenses where this fund is source
        .mockResolvedValueOnce(mockExpenseInResult) // Expenses where this fund is destination
        .mockResolvedValueOnce([{ ...mockFund, current_balance: 1300 }]); // Fund update

      // Import and test the recalculation endpoint
      const { POST } = await import('@/app/api/funds/[id]/recalculate/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'fund-1' } };

      const response = await POST(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.current_balance).toBe(1300);

      // Verify the correct SQL queries were called
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT COALESCE(SUM(amount), 0) as total FROM incomes'
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE source_fund_id'
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE destination_fund_id'
        )
      );
    });

    it('should handle fund transfers correctly in balance calculation', async () => {
      const mockIncomeResult = [{ total: 200 }];
      const mockExpenseOutResult = [{ total: 150 }]; // Outgoing transfers
      const mockExpenseInResult = [{ total: 75 }]; // Incoming transfers

      mockSql
        .mockResolvedValueOnce([mockFund])
        .mockResolvedValueOnce(mockIncomeResult)
        .mockResolvedValueOnce(mockExpenseOutResult)
        .mockResolvedValueOnce(mockExpenseInResult)
        .mockResolvedValueOnce([{ ...mockFund, current_balance: 1125 }]);

      const { POST } = await import('@/app/api/funds/[id]/recalculate/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'fund-1' } };

      const response = await POST(mockRequest, mockParams);
      const data = await response.json();

      // Expected: 1000 (initial) + 200 (income) - 150 (out) + 75 (in) = 1125
      expect(data.current_balance).toBe(1125);
    });

    it('should handle funds with no transactions', async () => {
      const mockIncomeResult = [{ total: 0 }];
      const mockExpenseOutResult = [{ total: 0 }];
      const mockExpenseInResult = [{ total: 0 }];

      mockSql
        .mockResolvedValueOnce([mockFund])
        .mockResolvedValueOnce(mockIncomeResult)
        .mockResolvedValueOnce(mockExpenseOutResult)
        .mockResolvedValueOnce(mockExpenseInResult)
        .mockResolvedValueOnce([{ ...mockFund, current_balance: 1000 }]);

      const { POST } = await import('@/app/api/funds/[id]/recalculate/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'fund-1' } };

      const response = await POST(mockRequest, mockParams);
      const data = await response.json();

      // Should remain at initial balance
      expect(data.current_balance).toBe(1000);
    });

    it('should handle negative balances correctly', async () => {
      const mockIncomeResult = [{ total: 100 }];
      const mockExpenseOutResult = [{ total: 1200 }]; // More out than available
      const mockExpenseInResult = [{ total: 50 }];

      mockSql
        .mockResolvedValueOnce([mockFund])
        .mockResolvedValueOnce(mockIncomeResult)
        .mockResolvedValueOnce(mockExpenseOutResult)
        .mockResolvedValueOnce(mockExpenseInResult)
        .mockResolvedValueOnce([{ ...mockFund, current_balance: -50 }]);

      const { POST } = await import('@/app/api/funds/[id]/recalculate/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'fund-1' } };

      const response = await POST(mockRequest, mockParams);
      const data = await response.json();

      // Expected: 1000 + 100 - 1200 + 50 = -50
      expect(data.current_balance).toBe(-50);
    });

    it('should return 404 for non-existent fund', async () => {
      mockSql.mockResolvedValueOnce([]); // Fund not found

      const { POST } = await import('@/app/api/funds/[id]/recalculate/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'nonexistent' } };

      const response = await POST(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Fund not found');
    });

    it('should handle database errors during recalculation', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const { POST } = await import('@/app/api/funds/[id]/recalculate/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'fund-1' } };

      const response = await POST(mockRequest, mockParams);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Database error');
    });
  });

  describe('Dashboard Fund Balance Calculations', () => {
    it('should calculate fund balances for dashboard with source fund logic', async () => {
      const mockFunds = [
        { id: 'fund-1', name: 'Fund 1', initial_balance: 1000 },
        { id: 'fund-2', name: 'Fund 2', initial_balance: 500 },
      ];

      const mockBalances = [
        {
          fund_id: 'fund-1',
          fund_name: 'Fund 1',
          initial_balance: 1000,
          total_income: 300,
          total_expense_out: 200, // Using source_fund_id
          total_expense_in: 100, // Using destination_fund_id
          current_balance: 1200,
        },
        {
          fund_id: 'fund-2',
          fund_name: 'Fund 2',
          initial_balance: 500,
          total_income: 150,
          total_expense_out: 100,
          total_expense_in: 50,
          current_balance: 600,
        },
      ];

      mockSql.mockResolvedValueOnce(mockBalances);

      const { GET } = await import('@/app/api/dashboard/funds/balances/route');
      const mockRequest = new Request(
        'http://localhost:3000/api/dashboard/funds/balances'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBalances);

      // Verify the query includes source fund logic
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'COALESCE(expense_out.total, 0) as total_expense_out'
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'COALESCE(expense_in.total, 0) as total_expense_in'
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN (SELECT source_fund_id')
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN (SELECT destination_fund_id')
      );
    });

    it('should handle period filtering in fund balance calculations', async () => {
      const mockBalances = [
        {
          fund_id: 'fund-1',
          fund_name: 'Fund 1',
          initial_balance: 1000,
          total_income: 200,
          total_expense_out: 150,
          total_expense_in: 75,
          current_balance: 1125,
        },
      ];

      mockSql.mockResolvedValueOnce(mockBalances);

      const { GET } = await import('@/app/api/dashboard/funds/balances/route');
      const mockRequest = new Request(
        'http://localhost:3000/api/dashboard/funds/balances?period_id=period-1'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockBalances);

      // Verify period filtering is applied
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE i.period_id = ${periodId}')
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.period_id = ${periodId}')
      );
    });

    it('should handle empty fund balance results', async () => {
      mockSql.mockResolvedValueOnce([]);

      const { GET } = await import('@/app/api/dashboard/funds/balances/route');
      const mockRequest = new Request(
        'http://localhost:3000/api/dashboard/funds/balances'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });

    it('should handle database errors in fund balance calculations', async () => {
      mockSql.mockRejectedValueOnce(new Error('Balance calculation failed'));

      const { GET } = await import('@/app/api/dashboard/funds/balances/route');
      const mockRequest = new Request(
        'http://localhost:3000/api/dashboard/funds/balances'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Balance calculation failed');
    });
  });

  describe('Fund Transfer Calculations', () => {
    it('should calculate fund transfers correctly with source fund tracking', async () => {
      const mockTransfers = [
        {
          id: 'transfer-1',
          date: '2024-01-15',
          amount: 100,
          description: 'Transfer from Fund 1 to Fund 2',
          source_fund_id: 'fund-1',
          source_fund_name: 'Fund 1',
          destination_fund_id: 'fund-2',
          destination_fund_name: 'Fund 2',
          category_name: 'Transfer',
        },
      ];

      mockSql.mockResolvedValueOnce(mockTransfers);

      const { GET } = await import('@/app/api/dashboard/funds/transfers/route');
      const mockRequest = new Request(
        'http://localhost:3000/api/dashboard/funds/transfers'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTransfers);

      // Verify transfer query includes source fund information
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('e.source_fund_id')
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('sf.name as source_fund_name')
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('df.name as destination_fund_name')
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.destination_fund_id IS NOT NULL')
      );
    });

    it('should filter transfers by period when specified', async () => {
      const mockTransfers = [
        {
          id: 'transfer-1',
          date: '2024-01-15',
          amount: 100,
          description: 'Period transfer',
          source_fund_id: 'fund-1',
          source_fund_name: 'Fund 1',
          destination_fund_id: 'fund-2',
          destination_fund_name: 'Fund 2',
          category_name: 'Transfer',
        },
      ];

      mockSql.mockResolvedValueOnce(mockTransfers);

      const { GET } = await import('@/app/api/dashboard/funds/transfers/route');
      const mockRequest = new Request(
        'http://localhost:3000/api/dashboard/funds/transfers?period_id=period-1'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockTransfers);

      // Verify period filtering
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('AND e.period_id = ${periodId}')
      );
    });

    it('should handle no transfers found', async () => {
      mockSql.mockResolvedValueOnce([]);

      const { GET } = await import('@/app/api/dashboard/funds/transfers/route');
      const mockRequest = new Request(
        'http://localhost:3000/api/dashboard/funds/transfers'
      );

      const response = await GET(mockRequest);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });
});
