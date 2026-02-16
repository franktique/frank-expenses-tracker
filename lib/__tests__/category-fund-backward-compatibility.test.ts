import { CategoryFundFallback } from '../category-fund-fallback';
import { Fund, Category } from '@/types/funds';

// Mock data for testing
const mockFunds: Fund[] = [
  {
    id: 'fund-1',
    name: 'Disponible',
    description: 'Default fund',
    initial_balance: 1000,
    current_balance: 1000,
    start_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fund-2',
    name: 'Savings',
    description: 'Savings fund',
    initial_balance: 2000,
    current_balance: 2000,
    start_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'fund-3',
    name: 'Emergency',
    description: 'Emergency fund',
    initial_balance: 3000,
    current_balance: 3000,
    start_date: '2024-01-01',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

const mockCategories: Category[] = [
  {
    id: 'cat-1',
    name: 'Food',
    fund_id: 'fund-1', // Legacy single fund
    associated_funds: [], // No new relationships
  },
  {
    id: 'cat-2',
    name: 'Transport',
    fund_id: 'fund-1', // Legacy single fund
    associated_funds: [mockFunds[0], mockFunds[1]], // New multi-fund relationships
  },
  {
    id: 'cat-3',
    name: 'Entertainment',
    // No fund_id (legacy)
    associated_funds: [mockFunds[1], mockFunds[2]], // Only new relationships
  },
  {
    id: 'cat-4',
    name: 'Utilities',
    // No fund_id and no associated_funds (should accept all funds)
  },
];

describe('CategoryFundFallback', () => {
  describe('getAvailableFundsForCategory', () => {
    it('should return associated_funds when available (new system)', () => {
      const result = CategoryFundFallback.getAvailableFundsForCategory(
        'cat-3',
        mockCategories,
        mockFunds
      );

      expect(result).toHaveLength(2);
      expect(result.map((f) => f.id)).toEqual(['fund-2', 'fund-3']);
    });

    it('should return single fund from fund_id when no associated_funds (legacy)', () => {
      const result = CategoryFundFallback.getAvailableFundsForCategory(
        'cat-1',
        mockCategories,
        mockFunds
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('fund-1');
    });

    it('should prefer associated_funds over fund_id when both exist', () => {
      const result = CategoryFundFallback.getAvailableFundsForCategory(
        'cat-2',
        mockCategories,
        mockFunds
      );

      expect(result).toHaveLength(2);
      expect(result.map((f) => f.id)).toEqual(['fund-1', 'fund-2']);
    });

    it('should return all funds when no restrictions exist', () => {
      const result = CategoryFundFallback.getAvailableFundsForCategory(
        'cat-4',
        mockCategories,
        mockFunds
      );

      expect(result).toHaveLength(3);
      expect(result).toEqual(mockFunds);
    });

    it('should return all funds when category not found', () => {
      const result = CategoryFundFallback.getAvailableFundsForCategory(
        'non-existent',
        mockCategories,
        mockFunds
      );

      expect(result).toEqual(mockFunds);
    });

    it('should handle empty inputs gracefully', () => {
      const result = CategoryFundFallback.getAvailableFundsForCategory(
        '',
        [],
        []
      );

      expect(result).toEqual([]);
    });
  });

  describe('getDefaultFundForCategory', () => {
    it('should return current filter fund if available for category', () => {
      const currentFilterFund = mockFunds[1]; // Savings fund
      const result = CategoryFundFallback.getDefaultFundForCategory(
        'cat-3', // Has Savings and Emergency funds
        mockCategories,
        mockFunds,
        currentFilterFund
      );

      expect(result?.id).toBe('fund-2');
    });

    it('should return fund filter if current filter fund not available', () => {
      const currentFilterFund = mockFunds[0]; // Disponible fund (not available for cat-3)
      const result = CategoryFundFallback.getDefaultFundForCategory(
        'cat-3', // Has Savings and Emergency funds
        mockCategories,
        mockFunds,
        currentFilterFund,
        'fund-2' // Fund filter set to Savings
      );

      expect(result?.id).toBe('fund-2');
    });

    it('should return default fund if available for category', () => {
      const result = CategoryFundFallback.getDefaultFundForCategory(
        'cat-1', // Has only Disponible fund
        mockCategories,
        mockFunds
      );

      expect(result?.id).toBe('fund-1'); // Disponible is the default
    });

    it('should return first available fund as last resort', () => {
      const result = CategoryFundFallback.getDefaultFundForCategory(
        'cat-3', // Has Savings and Emergency funds
        mockCategories,
        mockFunds
      );

      expect(result?.id).toBe('fund-2'); // First available fund
    });

    it('should return null when no funds available', () => {
      const result = CategoryFundFallback.getDefaultFundForCategory(
        'cat-1',
        mockCategories,
        []
      );

      expect(result).toBeNull();
    });
  });

  describe('getDefaultFund', () => {
    it('should return Disponible fund when available', () => {
      const result = CategoryFundFallback.getDefaultFund(mockFunds);
      expect(result?.name).toBe('Disponible');
    });

    it('should return fund with disponible in name', () => {
      const fundsWithoutExactMatch = [
        {
          ...mockFunds[0],
          name: 'Fondo Disponible',
        },
        ...mockFunds.slice(1),
      ];

      const result = CategoryFundFallback.getDefaultFund(
        fundsWithoutExactMatch
      );
      expect(result?.name).toBe('Fondo Disponible');
    });

    it('should return first fund when no default found', () => {
      const fundsWithoutDefault = mockFunds.slice(1); // Remove Disponible
      const result = CategoryFundFallback.getDefaultFund(fundsWithoutDefault);
      expect(result?.id).toBe('fund-2');
    });

    it('should return null for empty funds array', () => {
      const result = CategoryFundFallback.getDefaultFund([]);
      expect(result).toBeNull();
    });
  });

  describe('isFundValidForCategory', () => {
    it('should return true when fund is in associated_funds', () => {
      const result = CategoryFundFallback.isFundValidForCategory(
        'fund-2',
        'cat-3',
        mockCategories,
        mockFunds
      );

      expect(result).toBe(true);
    });

    it('should return false when fund is not in associated_funds', () => {
      const result = CategoryFundFallback.isFundValidForCategory(
        'fund-1',
        'cat-3',
        mockCategories,
        mockFunds
      );

      expect(result).toBe(false);
    });

    it('should return true for legacy fund_id', () => {
      const result = CategoryFundFallback.isFundValidForCategory(
        'fund-1',
        'cat-1',
        mockCategories,
        mockFunds
      );

      expect(result).toBe(true);
    });

    it('should return true for unrestricted category', () => {
      const result = CategoryFundFallback.isFundValidForCategory(
        'fund-2',
        'cat-4',
        mockCategories,
        mockFunds
      );

      expect(result).toBe(true);
    });
  });

  describe('getFilteredCategories', () => {
    it('should return all categories when no fund filter', () => {
      const result = CategoryFundFallback.getFilteredCategories(
        mockCategories,
        null
      );

      expect(result).toHaveLength(4);
    });

    it('should filter categories by associated_funds', () => {
      const result = CategoryFundFallback.getFilteredCategories(
        mockCategories,
        mockFunds[1] // Savings fund
      );

      expect(result).toHaveLength(3); // cat-2, cat-3 have Savings fund, cat-4 accepts all funds
      expect(result.map((c) => c.id)).toEqual(['cat-2', 'cat-3', 'cat-4']);
    });

    it('should filter categories by legacy fund_id', () => {
      const result = CategoryFundFallback.getFilteredCategories(
        mockCategories,
        mockFunds[0] // Disponible fund
      );

      expect(result).toHaveLength(3); // cat-1, cat-2 (legacy), and cat-4 (unrestricted)
      expect(result.map((c) => c.id)).toEqual(['cat-1', 'cat-2', 'cat-4']);
    });

    it('should include unrestricted categories in all filters', () => {
      const result = CategoryFundFallback.getFilteredCategories(
        mockCategories,
        mockFunds[2] // Emergency fund
      );

      expect(result).toHaveLength(2); // cat-3 (has Emergency) and cat-4 (unrestricted)
      expect(result.map((c) => c.id)).toEqual(['cat-3', 'cat-4']);
    });
  });

  describe('categoryHasFundRestrictions', () => {
    it('should return true for category with associated_funds', () => {
      const result = CategoryFundFallback.categoryHasFundRestrictions(
        'cat-3',
        mockCategories
      );

      expect(result).toBe(true);
    });

    it('should return true for category with legacy fund_id', () => {
      const result = CategoryFundFallback.categoryHasFundRestrictions(
        'cat-1',
        mockCategories
      );

      expect(result).toBe(true);
    });

    it('should return false for unrestricted category', () => {
      const result = CategoryFundFallback.categoryHasFundRestrictions(
        'cat-4',
        mockCategories
      );

      expect(result).toBe(false);
    });

    it('should return false for non-existent category', () => {
      const result = CategoryFundFallback.categoryHasFundRestrictions(
        'non-existent',
        mockCategories
      );

      expect(result).toBe(false);
    });
  });

  describe('getFundSelectionExplanation', () => {
    it('should provide explanation for restricted category', () => {
      const result = CategoryFundFallback.getFundSelectionExplanation(
        'cat-3',
        mockCategories,
        mockFunds,
        mockFunds[1]
      );

      expect(result.hasRestrictions).toBe(true);
      expect(result.availableFunds).toHaveLength(2);
      expect(result.selectedFundReason).toBe(
        'Fund is allowed for this category'
      );
      expect(result.message).toContain('Entertainment');
      expect(result.message).toContain('Savings, Emergency');
    });

    it('should provide explanation for unrestricted category', () => {
      const result = CategoryFundFallback.getFundSelectionExplanation(
        'cat-4',
        mockCategories,
        mockFunds,
        mockFunds[0]
      );

      expect(result.hasRestrictions).toBe(false);
      expect(result.selectedFundReason).toBe('Category accepts all funds');
      expect(result.message).toContain('no tiene fondos específicos');
    });

    it('should handle invalid fund selection', () => {
      const result = CategoryFundFallback.getFundSelectionExplanation(
        'cat-3',
        mockCategories,
        mockFunds,
        mockFunds[0] // Disponible not allowed for cat-3
      );

      expect(result.selectedFundReason).toBe(
        'Fund is not allowed for this category'
      );
    });
  });

  describe('prepareCategoryForMultiFund', () => {
    it('should identify category needing migration', () => {
      const category = mockCategories[0]; // Has fund_id but no associated_funds
      const result = CategoryFundFallback.prepareCategoryForMultiFund(category);

      expect(result.needsMigration).toBe(true);
      expect(result.suggestedFundIds).toEqual(['fund-1']);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('legacy fund_id');
    });

    it('should not flag category with proper multi-fund setup', () => {
      const category = mockCategories[2]; // Has associated_funds, no fund_id
      const result = CategoryFundFallback.prepareCategoryForMultiFund(category);

      expect(result.needsMigration).toBe(false);
      expect(result.suggestedFundIds).toEqual([]);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect conflicting fund relationships', () => {
      const conflictingCategory: Category = {
        id: 'conflict',
        name: 'Conflicting',
        fund_id: 'fund-1',
        associated_funds: [mockFunds[1]], // Different from fund_id
      };

      const result =
        CategoryFundFallback.prepareCategoryForMultiFund(conflictingCategory);

      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0]).toContain('conflicting fund relationships');
    });
  });
});
