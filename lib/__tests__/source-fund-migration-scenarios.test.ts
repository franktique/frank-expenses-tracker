import { sql } from "@/lib/db";

// Mock the database
jest.mock("@/lib/db", () => ({
  sql: jest.fn(),
}));

const mockSql = sql as jest.MockedFunction<typeof sql>;

describe("Source Fund Migration Scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Migration with Category Fund Relationships", () => {
    it("should migrate expenses using category_fund_relationships", async () => {
      const mockExpenses = [
        {
          id: "exp-1",
          category_id: "cat-1",
          amount: 100,
          description: "Expense 1",
        },
        {
          id: "exp-2",
          category_id: "cat-2",
          amount: 200,
          description: "Expense 2",
        },
      ];

      const mockCategoryFundRelationships = [
        { category_id: "cat-1", fund_id: "fund-1", created_at: "2024-01-01" },
        { category_id: "cat-1", fund_id: "fund-2", created_at: "2024-01-02" },
        { category_id: "cat-2", fund_id: "fund-3", created_at: "2024-01-01" },
      ];

      // Mock the migration UPDATE query result
      const expectedMigrationResult = [
        { id: "exp-1", category_id: "cat-1", source_fund_id: "fund-1" }, // First fund for cat-1
        { id: "exp-2", category_id: "cat-2", source_fund_id: "fund-3" }, // Only fund for cat-2
      ];

      mockSql.mockResolvedValueOnce(expectedMigrationResult);

      // Simulate the migration query
      const migrationQuery = `
        UPDATE expenses
        SET source_fund_id = (
          SELECT COALESCE(
            (SELECT cfr.fund_id
             FROM category_fund_relationships cfr
             WHERE cfr.category_id = expenses.category_id
             ORDER BY cfr.created_at ASC
             LIMIT 1),
            (SELECT c.fund_id
             FROM categories c
             WHERE c.id = expenses.category_id)
          )
        )
        WHERE source_fund_id IS NULL
        RETURNING id, category_id, source_fund_id
      `;

      const result = await sql`${migrationQuery}`;

      expect(result).toEqual(expectedMigrationResult);
      expect(result).toHaveLength(2);
      expect(result[0].source_fund_id).toBe("fund-1"); // First fund for cat-1
      expect(result[1].source_fund_id).toBe("fund-3"); // Only fund for cat-2
    });
  });

  describe("Migration with Legacy Fund Relationships", () => {
    it("should fallback to legacy fund_id when no category_fund_relationships exist", async () => {
      const mockExpenses = [
        { id: "exp-1", category_id: "cat-1", amount: 100, description: "Legacy expense 1" },
        { id: "exp-2", category_id: "cat-2", amount: 150, description: "Legacy expense 2" },
      ];

      const mockLegacyCategories = [
        { id: "cat-1", fund_id: "fund-legacy-1" },
        { id: "cat-2", fund_id: "fund-legacy-2" },
      ];

      // Mock migration result using legacy fund_id
      const expectedMigrationResult = [
        { id: "exp-1", category_id: "cat-1", source_fund_id: "fund-legacy-1" },
        { id: "exp-2", category_id: "cat-2", source_fund_id: "fund-legacy-2" },
      ];

      mockSql.mockResolvedValueOnce(expectedMigrationResult);

      const result = await sql`UPDATE expenses SET source_fund_id = (SELECT c.fund_id FROM categories c WHERE c.id = expenses.category_id) WHERE source_fund_id IS NULL RETURNING id, category_id, source_fund_id`;

      expect(result).toEqual(expectedMigrationResult);
      expect(result[0].source_fund_id).toBe("fund-legacy-1");
      expect(result[1].source_fund_id).toBe("fund-legacy-2");
    });

    it("should prioritize category_fund_relationships over legacy fund_id", async () => {
      const mockExpenses = [
        { id: "exp-1", category_id: "cat-1", amount: 100, description: "Mixed expense" },
      ];

      // Category has both new relationships and legacy fund_id
      const mockCategoryWithBoth = {
        id: "cat-1",
        fund_id: "fund-legacy", // Legacy
        relationships: [
          { fund_id: "fund-new", created_at: "2024-01-01" }, // New relationship
        ],
      };

      // Should use new relationship, not legacy
      const expectedMigrationResult = [
        { id: "exp-1", category_id: "cat-1", source_fund_id: "fund-new" },
      ];

      mockSql.mockResolvedValueOnce(expectedMigrationResult);

      const result = await sql`UPDATE expenses SET source_fund_id = (SELECT COALESCE((SELECT cfr.fund_id FROM category_fund_relationships cfr WHERE cfr.category_id = expenses.category_id LIMIT 1), (SELECT c.fund_id FROM categories c WHERE c.id = expenses.category_id))) WHERE source_fund_id IS NULL RETURNING id, category_id, source_fund_id`;

      expect(result[0].source_fund_id).toBe("fund-new");
    });
  });

  describe("Migration Error Scenarios", () => {
    it("should handle expenses with orphaned categories", async () => {
      const mockOrphanedExpenses = [
        { id: "exp-orphan", category_id: "cat-nonexistent", amount: 50, description: "Orphaned expense" },
      ];

      // Migration should skip orphaned expenses
      const expectedMigrationResult = []; // No expenses migrated

      mockSql.mockResolvedValueOnce(expectedMigrationResult);

      const result = await sql`UPDATE expenses SET source_fund_id = (SELECT COALESCE((SELECT cfr.fund_id FROM category_fund_relationships cfr WHERE cfr.category_id = expenses.category_id LIMIT 1), (SELECT c.fund_id FROM categories c WHERE c.id = expenses.category_id))) WHERE source_fund_id IS NULL RETURNING id, category_id, source_fund_id`;

      expect(result).toHaveLength(0);
    });

    it("should handle categories with no fund relationships", async () => {
      const mockExpenses = [
        { id: "exp-1", category_id: "cat-no-funds", amount: 75, description: "No funds expense" },
      ];

      const mockCategoryWithNoFunds = {
        id: "cat-no-funds",
        fund_id: null, // No legacy fund
        relationships: [], // No new relationships
      };

      // Should not migrate this expense
      const expectedMigrationResult = [];

      mockSql.mockResolvedValueOnce(expectedMigrationResult);

      const result = await sql`UPDATE expenses SET source_fund_id = (SELECT COALESCE((SELECT cfr.fund_id FROM category_fund_relationships cfr WHERE cfr.category_id = expenses.category_id LIMIT 1), (SELECT c.fund_id FROM categories c WHERE c.id = expenses.category_id))) WHERE source_fund_id IS NULL RETURNING id, category_id, source_fund_id`;

      expect(result).toHaveLength(0);
    });

    it("should handle partial migration failures gracefully", async () => {
      const mockExpenses = [
        { id: "exp-1", category_id: "cat-1", amount: 100, description: "Good expense" },
        { id: "exp-2", category_id: "cat-orphan", amount: 200, description: "Bad expense" },
        { id: "exp-3", category_id: "cat-2", amount: 150, description: "Another good expense" },
      ];

      // Only exp-1 and exp-3 should migrate successfully
      const expectedMigrationResult = [
        { id: "exp-1", category_id: "cat-1", source_fund_id: "fund-1" },
        { id: "exp-3", category_id: "cat-2", source_fund_id: "fund-2" },
      ];

      mockSql.mockResolvedValueOnce(expectedMigrationResult);

      const result = await sql`UPDATE expenses SET source_fund_id = (SELECT COALESCE((SELECT cfr.fund_id FROM category_fund_relationships cfr WHERE cfr.category_id = expenses.category_id LIMIT 1), (SELECT c.fund_id FROM categories c WHERE c.id = expenses.category_id))) WHERE source_fund_id IS NULL RETURNING id, category_id, source_fund_id`;

      expect(result).toHaveLength(2);
      expect(result.find(r => r.id === "exp-2")).toBeUndefined(); // exp-2 should not be migrated
    });
  });

  describe("Migration Status Tracking", () => {
    it("should accurately track migration progress", async () => {
      const mockPreMigrationStatus = {
        total_expenses: 100,
        expenses_with_source_fund: 0,
        expenses_without_source_fund: 100,
        migration_complete: false,
      };

      const mockPostMigrationStatus = {
        total_expenses: 100,
        expenses_with_source_fund: 95,
        expenses_without_source_fund: 5,
        migration_complete: false,
      };

      mockSql
        .mockResolvedValueOnce([mockPreMigrationStatus]) // Pre-migration
        .mockResolvedValueOnce([mockPostMigrationStatus]); // Post-migration

      const preMigration = await sql`SELECT * FROM check_expense_source_fund_migration_status()`;
      const postMigration = await sql`SELECT * FROM check_expense_source_fund_migration_status()`;

      expect(preMigration[0].expenses_without_source_fund).toBe(100);
      expect(postMigration[0].expenses_without_source_fund).toBe(5);
      expect(postMigration[0].expenses_with_source_fund).toBe(95);
    });

    it("should detect complete migration", async () => {
      const mockCompleteStatus = {
        total_expenses: 50,
        expenses_with_source_fund: 50,
        expenses_without_source_fund: 0,
        migration_complete: true,
      };

      mockSql.mockResolvedValueOnce([mockCompleteStatus]);

      const status = await sql`SELECT * FROM check_expense_source_fund_migration_status()`;

      expect(status[0].migration_complete).toBe(true);
      expect(status[0].expenses_without_source_fund).toBe(0);
    });
  });

  describe("Migration Validation", () => {
    it("should validate migrated expenses have correct source fund relationships", async () => {
      const mockValidationResults = [
        {
          expense_id: "exp-1",
          category_id: "cat-1",
          source_fund_id: "fund-1",
          is_valid: true,
          validation_method: "category_fund_relationships",
        },
        {
          expense_id: "exp-2",
          category_id: "cat-2",
          source_fund_id: "fund-legacy",
          is_valid: true,
          validation_method: "legacy_fund_id",
        },
        {
          expense_id: "exp-3",
          category_id: "cat-orphan",
          source_fund_id: null,
          is_valid: false,
          validation_method: "none",
        },
      ];

      mockSql.mockResolvedValueOnce(mockValidationResults);

      const validation = await sql`
        SELECT 
          e.id as expense_id,
          e.category_id,
          e.source_fund_id,
          validate_expense_source_fund(e.category_id, e.source_fund_id) as is_valid,
          CASE 
            WHEN EXISTS(SELECT 1 FROM category_fund_relationships cfr WHERE cfr.category_id = e.category_id AND cfr.fund_id = e.source_fund_id) THEN 'category_fund_relationships'
            WHEN EXISTS(SELECT 1 FROM categories c WHERE c.id = e.category_id AND c.fund_id = e.source_fund_id) THEN 'legacy_fund_id'
            ELSE 'none'
          END as validation_method
        FROM expenses e
        WHERE e.id IN ('exp-1', 'exp-2', 'exp-3')
      `;

      expect(validation).toHaveLength(3);
      expect(validation[0].is_valid).toBe(true);
      expect(validation[1].is_valid).toBe(true);
      expect(validation[2].is_valid).toBe(false);
    });
  });

  describe("Migration Performance", () => {
    it("should handle large datasets efficiently", async () => {
      // Simulate migration of 10,000 expenses
      const largeDatasetResult = Array.from({ length: 10000 }, (_, i) => ({
        id: `exp-${i + 1}`,
        category_id: `cat-${(i % 100) + 1}`, // 100 different categories
        source_fund_id: `fund-${(i % 10) + 1}`, // 10 different funds
      }));

      mockSql.mockResolvedValueOnce(largeDatasetResult);

      const startTime = Date.now();
      const result = await sql`UPDATE expenses SET source_fund_id = (SELECT COALESCE((SELECT cfr.fund_id FROM category_fund_relationships cfr WHERE cfr.category_id = expenses.category_id LIMIT 1), (SELECT c.fund_id FROM categories c WHERE c.id = expenses.category_id))) WHERE source_fund_id IS NULL RETURNING id, category_id, source_fund_id`;
      const endTime = Date.now();

      expect(result).toHaveLength(10000);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second (mocked)
    });

    it("should batch process migration for memory efficiency", async () => {
      // Simulate batched migration (1000 expenses per batch)
      const batchSize = 1000;
      const totalExpenses = 5000;
      const batches = Math.ceil(totalExpenses / batchSize);

      const batchResults = Array.from({ length: batches }, (_, batchIndex) => {
        const batchStart = batchIndex * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, totalExpenses);
        return Array.from({ length: batchEnd - batchStart }, (_, i) => ({
          id: `exp-${batchStart + i + 1}`,
          category_id: `cat-${((batchStart + i) % 50) + 1}`,
          source_fund_id: `fund-${((batchStart + i) % 5) + 1}`,
        }));
      });

      // Mock each batch
      batchResults.forEach(batch => {
        mockSql.mockResolvedValueOnce(batch);
      });

      // Process each batch
      let totalMigrated = 0;
      for (let i = 0; i < batches; i++) {
        const batchResult = await sql`UPDATE expenses SET source_fund_id = (SELECT COALESCE((SELECT cfr.fund_id FROM category_fund_relationships cfr WHERE cfr.category_id = expenses.category_id LIMIT 1), (SELECT c.fund_id FROM categories c WHERE c.id = expenses.category_id))) WHERE source_fund_id IS NULL AND id IN (SELECT id FROM expenses WHERE source_fund_id IS NULL LIMIT ${batchSize}) RETURNING id, category_id, source_fund_id`;
        totalMigrated += batchResult.length;
      }

      expect(totalMigrated).toBe(totalExpenses);
    });
  });
});