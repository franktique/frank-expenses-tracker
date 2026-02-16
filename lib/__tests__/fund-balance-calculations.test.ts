/**
 * @jest-environment jsdom
 */

import { sql } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  sql: jest.fn(),
}));

const mockSql = sql as jest.MockedFunction<typeof sql>;

describe('Fund Balance Calculations with Source Fund', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fund Recalculation Logic', () => {
    it('should calculate balance using source_fund_id for expenses', async () => {
      // Mock fund data
      const mockFund = {
        id: 'fund-1',
        name: 'Test Fund',
        initial_balance: 1000,
        start_date: '2024-01-01',
        current_balance: 1000,
      };

      // Mock calculation results
      const mockIncomeResult = [{ total: 500 }];
      const mockExpenseResult = [{ total: 300 }];
      const mockTransferInResult = [{ total: 100 }];
      const mockTransferOutResult = [{ total: 50 }];
      const mockUpdatedFund = { ...mockFund, current_balance: 1300 };

      // Setup mock responses in order
      mockSql
        .mockResolvedValueOnce([mockFund]) // Fund lookup
        .mockResolvedValueOnce(mockIncomeResult) // Income calculation
        .mockResolvedValueOnce(mockExpenseResult) // Expense calculation (using source_fund_id)
        .mockResolvedValueOnce(mockTransferInResult) // Transfer in calculation
        .mockResolvedValueOnce(mockTransferOutResult) // Transfer out calculation
        .mockResolvedValueOnce([mockUpdatedFund]); // Fund update

      // Import and test the recalculation endpoint
      const { POST } = await import('@/app/api/funds/[id]/recalculate/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'fund-1' } };

      const response = await POST(mockRequest, mockParams);
      const result = await response.json();

      // Verify the SQL queries use source_fund_id
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('source_fund_id = ')])
      );

      // Verify balance calculation
      expect(result.success).toBe(true);
      expect(result.new_balance).toBe(1300); // 1000 + 500 + 100 - 300
    });
  });

  describe('Dashboard Fund Balance Logic', () => {
    it('should use source_fund_id for expense calculations in dashboard', async () => {
      const mockFunds = [
        {
          id: 'fund-1',
          name: 'Test Fund',
          initial_balance: 1000,
          current_balance: 800,
          total_income: 200,
          total_expenses: 400,
          total_transfers_in: 0,
          total_transfers_out: 0,
          category_count: 2,
        },
      ];

      mockSql.mockResolvedValueOnce(mockFunds);

      const { GET } = await import('@/app/api/dashboard/funds/route');
      const response = await GET();
      const result = await response.json();

      // Verify the query structure uses source_fund_id
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('source_fund_id')])
      );

      expect(result.funds).toHaveLength(1);
      expect(result.summary.total_funds).toBe(1);
    });
  });

  describe('Fund Transfer Logic', () => {
    it('should correctly identify transfers using source_fund_id', async () => {
      const mockTransfers = [
        {
          id: 'expense-1',
          date: '2024-01-15',
          description: 'Transfer to savings',
          amount: 200,
          transfer_type: 'outgoing',
          category_name: 'Transfers',
          source_fund_name: 'Checking',
          source_fund_id: 'fund-1',
          destination_fund_name: 'Savings',
          destination_fund_id: 'fund-2',
          created_at: '2024-01-15T10:00:00Z',
        },
      ];

      const mockStats = {
        incoming_count: 0,
        incoming_total: 0,
        outgoing_count: 1,
        outgoing_total: 200,
        total_transfers: 1,
        net_transfer_amount: -200,
      };

      mockSql
        .mockResolvedValueOnce(mockTransfers) // Transfer query
        .mockResolvedValueOnce([mockStats]); // Stats query

      const { GET } = await import('@/app/api/dashboard/funds/transfers/route');
      const mockRequest = {
        url: 'http://localhost:3000/api/dashboard/funds/transfers?fund_id=fund-1',
      } as any;

      const response = await GET(mockRequest);
      const result = await response.json();

      // Verify the query uses source_fund_id for outgoing transfers
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('source_fund_id')])
      );

      expect(result.transfers).toHaveLength(1);
      expect(result.transfers[0].transfer_type).toBe('outgoing');
    });
  });

  describe('Individual Fund Details', () => {
    it('should calculate fund details using source_fund_id', async () => {
      const mockFund = {
        id: 'fund-1',
        name: 'Test Fund',
        description: 'Test fund description',
        initial_balance: 1000,
        current_balance: 850,
        start_date: '2024-01-01',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockTransactions = [
        {
          type: 'expense',
          id: 'expense-1',
          amount: 150,
          date: '2024-01-15',
          description: 'Grocery shopping',
        },
      ];

      mockSql
        .mockResolvedValueOnce([mockFund]) // Fund details query
        .mockResolvedValueOnce(mockTransactions); // Recent transactions query

      const { GET } = await import('@/app/api/funds/[id]/route');
      const mockRequest = {} as any;
      const mockParams = { params: { id: 'fund-1' } };

      const response = await GET(mockRequest, mockParams);
      const result = await response.json();

      // Verify the query uses source_fund_id for expense calculations
      expect(mockSql).toHaveBeenCalledWith(
        expect.arrayContaining([expect.stringContaining('source_fund_id')])
      );

      expect(result.id).toBe('fund-1');
      expect(result.current_balance).toBe(850);
      expect(result.recent_transactions).toHaveLength(1);
    });
  });
});
