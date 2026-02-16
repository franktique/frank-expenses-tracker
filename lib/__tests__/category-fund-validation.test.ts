import {
  validateCategoryFundDeletion,
  validateCategoryFundUpdate,
  validateExpenseFundCategory,
  getAvailableFundsForCategory,
  CATEGORY_FUND_ERROR_MESSAGES,
} from '../category-fund-validation';

// Mock the database
jest.mock('@/lib/db', () => ({
  sql: jest.fn(),
}));

import { sql } from '@/lib/db';

const mockSql = sql as jest.MockedFunction<typeof sql>;

describe('Category Fund Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateCategoryFundDeletion', () => {
    it('should return error when category does not exist', async () => {
      mockSql.mockResolvedValueOnce([]); // No category found

      const result = await validateCategoryFundDeletion('nonexistent', 'fund1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La categoría especificada no existe');
    });

    it('should return error when fund does not exist', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([]); // No fund found

      const result = await validateCategoryFundDeletion('cat1', 'nonexistent');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El fondo especificado no existe');
    });

    it('should return error when relationship does not exist', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund1', name: 'Fund 1' }]) // Fund exists
        .mockResolvedValueOnce([]); // No relationship found

      const result = await validateCategoryFundDeletion('cat1', 'fund1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        'La relación entre la categoría y el fondo no existe'
      );
    });

    it('should return warning when deleting last fund relationship with expenses', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund1', name: 'Fund 1' }]) // Fund exists
        .mockResolvedValueOnce([{ id: 'rel1' }]) // Relationship exists
        .mockResolvedValueOnce([{ count: '5' }]) // 5 expenses
        .mockResolvedValueOnce([{ count: '0' }]) // 0 remaining relationships
        .mockResolvedValueOnce([{ name: 'Fund 1' }]); // Associated funds

      const result = await validateCategoryFundDeletion('cat1', 'fund1');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('5 gastos registrados');
      expect(result.data?.expenseCount).toBe(5);
      expect(result.data?.remainingFundRelationships).toBe(0);
    });

    it('should return valid result when safe to delete', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund1', name: 'Fund 1' }]) // Fund exists
        .mockResolvedValueOnce([{ id: 'rel1' }]) // Relationship exists
        .mockResolvedValueOnce([{ count: '0' }]) // 0 expenses
        .mockResolvedValueOnce([{ count: '1' }]) // 1 remaining relationship
        .mockResolvedValueOnce([{ name: 'Fund 1' }, { name: 'Fund 2' }]); // Associated funds

      const result = await validateCategoryFundDeletion('cat1', 'fund1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.data?.expenseCount).toBe(0);
      expect(result.data?.remainingFundRelationships).toBe(1);
    });
  });

  describe('validateCategoryFundUpdate', () => {
    it('should return error when category does not exist', async () => {
      mockSql.mockResolvedValueOnce([]); // No category found

      const result = await validateCategoryFundUpdate('nonexistent', ['fund1']);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La categoría especificada no existe');
    });

    it('should return error when some funds do not exist', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund1', name: 'Fund 1' }]); // Only fund1 exists

      const result = await validateCategoryFundUpdate('cat1', [
        'fund1',
        'fund2',
      ]);

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Los siguientes fondos no existen');
    });

    it('should return warnings when removing funds with expenses', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund1', name: 'Fund 1' }]) // fund1 exists (fund2 is being removed, so not in new list)
        .mockResolvedValueOnce([
          { fund_id: 'fund1', fund_name: 'Fund 1' },
          { fund_id: 'fund2', fund_name: 'Fund 2' },
        ]) // Current relationships
        .mockResolvedValueOnce([{ count: '3' }]); // 3 expenses

      const result = await validateCategoryFundUpdate('cat1', ['fund1']); // Removing fund2

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('3 gastos registrados');
      expect(result.warnings[0]).toContain('Fund 2');
    });
  });

  describe('validateExpenseFundCategory', () => {
    it('should return error when category does not exist', async () => {
      mockSql.mockResolvedValueOnce([]); // No category found

      const result = await validateExpenseFundCategory('nonexistent', 'fund1');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('La categoría especificada no existe');
    });

    it('should return error when fund does not exist', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([]); // No fund found

      const result = await validateExpenseFundCategory('cat1', 'nonexistent');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('El fondo especificado no existe');
    });

    it('should return error when fund is not associated with category', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund2', name: 'Fund 2' }]) // Fund exists
        .mockResolvedValueOnce([{ fund_id: 'fund1', fund_name: 'Fund 1' }]); // Only fund1 is associated

      const result = await validateExpenseFundCategory('cat1', 'fund2');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('no está asociado con la categoría');
    });

    it('should return valid when fund is associated with category', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund1', name: 'Fund 1' }]) // Fund exists
        .mockResolvedValueOnce([{ fund_id: 'fund1', fund_name: 'Fund 1' }]); // Fund is associated

      const result = await validateExpenseFundCategory('cat1', 'fund1');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data?.hasSpecificFundRestrictions).toBe(true);
    });

    it('should return valid with warning when category has no fund restrictions', async () => {
      mockSql
        .mockResolvedValueOnce([{ id: 'cat1', name: 'Category 1' }]) // Category exists
        .mockResolvedValueOnce([{ id: 'fund1', name: 'Fund 1' }]) // Fund exists
        .mockResolvedValueOnce([]); // No specific fund relationships

      const result = await validateExpenseFundCategory('cat1', 'fund1');

      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain(
        'no tiene fondos específicos asociados'
      );
      expect(result.data?.hasSpecificFundRestrictions).toBe(false);
    });
  });

  describe('getAvailableFundsForCategory', () => {
    it('should return category-specific funds when restrictions exist', async () => {
      mockSql.mockResolvedValueOnce([
        {
          id: 'fund1',
          name: 'Fund 1',
          description: 'Desc 1',
          current_balance: 1000,
        },
        {
          id: 'fund2',
          name: 'Fund 2',
          description: 'Desc 2',
          current_balance: 2000,
        },
      ]);

      const result = await getAvailableFundsForCategory('cat1');

      expect(result.hasRestrictions).toBe(true);
      expect(result.funds).toHaveLength(2);
      expect(result.funds[0].name).toBe('Fund 1');
    });

    it('should return all funds when no restrictions exist', async () => {
      mockSql
        .mockResolvedValueOnce([]) // No category-specific funds
        .mockResolvedValueOnce([
          {
            id: 'fund1',
            name: 'Fund 1',
            description: 'Desc 1',
            current_balance: 1000,
          },
          {
            id: 'fund2',
            name: 'Fund 2',
            description: 'Desc 2',
            current_balance: 2000,
          },
          {
            id: 'fund3',
            name: 'Fund 3',
            description: 'Desc 3',
            current_balance: 3000,
          },
        ]);

      const result = await getAvailableFundsForCategory('cat1');

      expect(result.hasRestrictions).toBe(false);
      expect(result.funds).toHaveLength(3);
    });

    it('should handle database errors gracefully', async () => {
      mockSql.mockRejectedValueOnce(new Error('Database error'));

      const result = await getAvailableFundsForCategory('cat1');

      expect(result.funds).toHaveLength(0);
      expect(result.hasRestrictions).toBe(false);
    });
  });
});
