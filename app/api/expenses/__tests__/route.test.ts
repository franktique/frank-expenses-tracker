import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { sql } from '@/lib/db';
import { validateExpenseSourceFunds } from '@/lib/source-fund-validation';

// Mock dependencies
jest.mock('@/lib/db', () => ({
  sql: jest.fn(),
}));

jest.mock('@/lib/source-fund-validation', () => ({
  validateExpenseSourceFunds: jest.fn(),
}));

const mockSql = sql as jest.MockedFunction<typeof sql>;
const mockValidateExpenseSourceFunds =
  validateExpenseSourceFunds as jest.MockedFunction<
    typeof validateExpenseSourceFunds
  >;

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
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'LEFT JOIN funds sf ON e.source_fund_id = sf.id'
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          'LEFT JOIN funds df ON e.destination_fund_id = df.id'
        )
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
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('WHERE e.source_fund_id = ${fundFilter}')
      );
    });

    it('should include category fund relationships in filter query', async () => {
      mockSql.mockResolvedValueOnce([]);

      const request = new NextRequest(
        'http://localhost:3000/api/expenses?fund_id=fund-1'
      );
      await GET(request);

      expect(mockSql).toHaveBeenCalledWith(expect.stringContaining('EXISTS ('));
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('category_fund_relationships cfr')
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
      category_id: 'cat-1',
      period_id: 'period-1',
      date: '2024-01-15',
      event: 'Test event',
      payment_method: 'credit',
      description: 'Test expense',
      amount: 100,
      source_fund_id: 'fund-1',
      destination_fund_id: 'fund-2',
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

    beforeEach(() => {
      mockValidateExpenseSourceFunds.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        data: {
          sourceFundName: 'Source Fund',
          destinationFundName: 'Destination Fund',
          isTransfer: true,
        },
      });
    });

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

      expect(response.status).toBe(200);
      expect(data).toEqual(mockExpenseWithFunds);
      expect(mockValidateExpenseSourceFunds).toHaveBeenCalledWith(
        'cat-1',
        'fund-1',
        'fund-2',
        100
      );
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

      // Check source fund balance decrease
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE funds'),
        expect.stringContaining(
          'current_balance = current_balance - ${amount}'
        ),
        expect.stringContaining('WHERE id = ${source_fund_id}')
      );

      // Check destination fund balance increase
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE funds'),
        expect.stringContaining(
          'current_balance = current_balance + ${amount}'
        ),
        expect.stringContaining('WHERE id = ${destination_fund_id}')
      );
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
        source_fund_id: undefined, // Missing required field
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

    it('should reject expenses that fail source fund validation', async () => {
      mockValidateExpenseSourceFunds.mockResolvedValue({
        isValid: false,
        errors: ['El fondo origen no está asociado con esta categoría'],
        warnings: [],
        data: null,
      });

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain(
        'El fondo origen no está asociado con esta categoría'
      );
    });

    it('should log warnings but still create expense when validation has warnings', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockValidateExpenseSourceFunds.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ['El monto excede el balance disponible del fondo origen'],
        data: {
          sourceFundName: 'Source Fund',
          destinationFundName: 'Destination Fund',
          isTransfer: true,
        },
      });

      mockSql
        .mockResolvedValueOnce([mockNewExpense])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockExpenseWithFunds]);

      const request = new NextRequest('http://localhost:3000/api/expenses', {
        method: 'POST',
        body: JSON.stringify(validExpenseData),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith('Expense creation warnings:', [
        'El monto excede el balance disponible del fondo origen',
      ]);

      consoleSpy.mockRestore();
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

      // Should extract only the date part
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO expenses'),
        expect.objectContaining({
          // The date should be "2024-01-15" not the full ISO string
        })
      );
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
