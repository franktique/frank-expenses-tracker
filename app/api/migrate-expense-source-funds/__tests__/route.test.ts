import { NextRequest } from "next/server";
import { GET, POST } from "../route";
import { sql } from "@/lib/db";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  sql: jest.fn(),
}));

const mockSql = sql as jest.MockedFunction<typeof sql>;

describe("/api/migrate-expense-source-funds", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET - Migration Status", () => {
    it("should return migration status when functions exist", async () => {
      const mockStatus = {
        total_expenses: 100,
        expenses_with_source_fund: 80,
        expenses_without_source_fund: 20,
        migration_complete: false,
      };

      const mockColumnExists = { column_exists: true };
      const mockFunctions = [
        { routine_name: "validate_expense_source_fund" },
        { routine_name: "get_category_source_funds" },
        { routine_name: "check_expense_source_fund_migration_status" },
      ];

      mockSql
        .mockResolvedValueOnce([mockStatus]) // Migration status
        .mockResolvedValueOnce([mockColumnExists]) // Column exists check
        .mockResolvedValueOnce(mockFunctions); // Functions check

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds"
      );
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.migration_status).toEqual(mockStatus);
      expect(data.column_exists).toBe(true);
      expect(data.functions_created).toBe(3);
      expect(data.functions).toEqual([
        "validate_expense_source_fund",
        "get_category_source_funds",
        "check_expense_source_fund_migration_status",
      ]);
      expect(data.ready_for_migration).toBe(false); // Column exists, so not ready
    });

    it("should indicate ready for migration when column doesn't exist", async () => {
      const mockStatus = {
        total_expenses: 0,
        expenses_with_source_fund: 0,
        expenses_without_source_fund: 0,
        migration_complete: true,
      };

      const mockColumnExists = { column_exists: false };
      const mockFunctions = [];

      mockSql
        .mockResolvedValueOnce([mockStatus])
        .mockResolvedValueOnce([mockColumnExists])
        .mockResolvedValueOnce(mockFunctions);

      const response = await GET();
      const data = await response.json();

      expect(data.ready_for_migration).toBe(true); // Column doesn't exist, ready for migration
      expect(data.functions_created).toBe(0);
    });

    it("should handle database errors gracefully", async () => {
      mockSql.mockRejectedValueOnce(new Error("Database connection failed"));

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Failed to check migration status");
      expect(data.details).toBe("Database connection failed");
    });
  });

  describe("POST - Run Migration", () => {
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

    const mockMigrationResult = [
      { id: "exp-1", category_id: "cat-1", source_fund_id: "fund-1" },
      { id: "exp-2", category_id: "cat-2", source_fund_id: "fund-2" },
    ];

    const mockUnmigrated = [
      {
        id: "exp-3",
        description: "Orphaned expense",
        category_name: "Orphaned Category",
        category_legacy_fund: null,
        category_fund_relationships: 0,
      },
    ];

    const mockSampleMigrated = [
      {
        id: "exp-1",
        description: "Test expense 1",
        amount: 100,
        category_name: "Test Category",
        source_fund_name: "Test Fund",
        destination_fund_name: null,
      },
    ];

    beforeEach(() => {
      // Setup successful migration sequence
      mockSql
        .mockResolvedValueOnce([]) // ALTER TABLE
        .mockResolvedValueOnce([]) // CREATE INDEX
        .mockResolvedValueOnce([]) // CREATE validation function
        .mockResolvedValueOnce([]) // CREATE helper function
        .mockResolvedValueOnce([]) // CREATE status function
        .mockResolvedValueOnce([mockPreMigrationStatus]) // Pre-migration status
        .mockResolvedValueOnce(mockMigrationResult) // Migration UPDATE
        .mockResolvedValueOnce([mockPostMigrationStatus]) // Post-migration status
        .mockResolvedValueOnce(mockUnmigrated) // Unmigrated expenses
        .mockResolvedValueOnce(mockSampleMigrated); // Sample migrated
    });

    it("should run complete migration successfully", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe(
        "Expense source fund migration completed successfully"
      );
      expect(data.results.pre_migration).toEqual(mockPreMigrationStatus);
      expect(data.results.post_migration).toEqual(mockPostMigrationStatus);
      expect(data.results.migrated_count).toBe(2);
      expect(data.results.unmigrated_count).toBe(1);
      expect(data.results.sample_migrated).toEqual(mockSampleMigrated);
      expect(data.results.unmigrated_sample).toEqual([mockUnmigrated[0]]);

      // Check that all migration steps were executed
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS source_fund_id"
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "CREATE INDEX IF NOT EXISTS idx_expenses_source_fund_id"
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "CREATE OR REPLACE FUNCTION validate_expense_source_fund"
        )
      );

      consoleSpy.mockRestore();
    });

    it("should create all required database functions", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      await POST(request);

      // Check validation function creation
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "CREATE OR REPLACE FUNCTION validate_expense_source_fund"
        )
      );

      // Check helper function creation
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "CREATE OR REPLACE FUNCTION get_category_source_funds"
        )
      );

      // Check status function creation
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "CREATE OR REPLACE FUNCTION check_expense_source_fund_migration_status"
        )
      );
    });

    it("should execute migration query with correct logic", async () => {
      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      await POST(request);

      // Check migration UPDATE query
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE expenses")
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("SET source_fund_id = (")
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("COALESCE(")
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("category_fund_relationships cfr")
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("WHERE source_fund_id IS NULL")
      );
    });

    it("should log warnings for unmigrated expenses", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("1 expenses could not be migrated"),
        mockUnmigrated
      );

      consoleSpy.mockRestore();
    });

    it("should handle migration with no unmigrated expenses", async () => {
      // Override the unmigrated query to return empty
      mockSql
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockPreMigrationStatus])
        .mockResolvedValueOnce(mockMigrationResult)
        .mockResolvedValueOnce([mockPostMigrationStatus])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockSampleMigrated);

      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(data.results.unmigrated_count).toBe(0);
      expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle database errors during migration", async () => {
      mockSql.mockRejectedValueOnce(new Error("Migration failed"));

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Migration failed");
      expect(data.details).toBe("Migration failed");
    });

    it("should handle partial migration failures", async () => {
      // Simulate failure during migration UPDATE
      mockSql
        .mockResolvedValueOnce([]) // ALTER TABLE
        .mockResolvedValueOnce([]) // CREATE INDEX
        .mockResolvedValueOnce([]) // CREATE validation function
        .mockResolvedValueOnce([]) // CREATE helper function
        .mockResolvedValueOnce([]) // CREATE status function
        .mockResolvedValueOnce([mockPreMigrationStatus]) // Pre-migration status
        .mockRejectedValueOnce(new Error("Migration UPDATE failed")); // Migration fails

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.details).toBe("Migration UPDATE failed");
    });

    it("should handle function creation failures", async () => {
      mockSql
        .mockResolvedValueOnce([]) // ALTER TABLE
        .mockResolvedValueOnce([]) // CREATE INDEX
        .mockRejectedValueOnce(new Error("Function creation failed")); // Function creation fails

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.details).toBe("Function creation failed");
    });

    it("should log migration progress correctly", async () => {
      const consoleSpy = jest.spyOn(console, "log").mockImplementation();

      const request = new NextRequest(
        "http://localhost:3000/api/migrate-expense-source-funds",
        {
          method: "POST",
        }
      );

      await POST(request);

      expect(consoleSpy).toHaveBeenCalledWith(
        "Starting expense source fund migration..."
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ Added source_fund_id column to expenses table"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ Created index on source_fund_id column"
      );
      expect(consoleSpy).toHaveBeenCalledWith("✅ Created validation function");
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ Created helper function for getting category source funds"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "✅ Created migration status function"
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "📊 Pre-migration status:",
        mockPreMigrationStatus
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        `✅ Migrated ${mockMigrationResult.length} expenses with source fund data`
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "📊 Post-migration status:",
        mockPostMigrationStatus
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        "📋 Sample migrated expenses:",
        mockSampleMigrated
      );

      consoleSpy.mockRestore();
    });
  });
});
