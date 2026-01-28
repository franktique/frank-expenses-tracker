import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import {
  validateSourceFundForCategory,
  validateExpenseSourceFunds,
  getAvailableSourceFundsForCategory,
  validateSourceFundUpdate,
  validateSourceFundSelection,
  SOURCE_FUND_VALIDATION_MESSAGES,
} from "../source-fund-validation";

// Mock the database
jest.mock("@/lib/db", () => ({
  sql: jest.fn(),
}));

import { sql } from "@/lib/db";
const mockSql = jest.mocked(sql);

describe("Source Fund Validation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("validateSourceFundForCategory", () => {
    it("should validate successfully when source fund is related to category", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock source fund exists
      mockSql.mockResolvedValueOnce([
        { id: "fund1", name: "Test Fund", current_balance: 1000 },
      ]);

      // Mock category has fund relationships
      mockSql.mockResolvedValueOnce([
        { id: "fund1", name: "Test Fund", current_balance: 1000 },
      ]);

      const result = await validateSourceFundForCategory("cat1", "fund1");

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toBeDefined();
      expect(result.data.categoryName).toBe("Test Category");
      expect(result.data.sourceFundName).toBe("Test Fund");
    });

    it("should fail when category does not exist", async () => {
      // Mock category does not exist
      mockSql.mockResolvedValueOnce([]);

      const result = await validateSourceFundForCategory(
        "nonexistent",
        "fund1"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("La categoría especificada no existe");
    });

    it("should fail when source fund does not exist", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock source fund does not exist
      mockSql.mockResolvedValueOnce([]);

      const result = await validateSourceFundForCategory("cat1", "nonexistent");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El fondo origen especificado no existe");
    });

    it("should fail when source fund is not related to category", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock source fund exists
      mockSql.mockResolvedValueOnce([
        { id: "fund1", name: "Test Fund", current_balance: 1000 },
      ]);

      // Mock category has no fund relationships with this fund
      mockSql.mockResolvedValueOnce([]);

      // Mock no legacy fund relationship
      mockSql.mockResolvedValueOnce([]);

      // Mock all funds (for unrestricted case)
      mockSql.mockResolvedValueOnce([
        { id: "fund2", name: "Other Fund", current_balance: 500 },
      ]);

      const result = await validateSourceFundForCategory("cat1", "fund1");

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain("no está asociado con la categoría");
    });

    it("should add warning for low balance fund", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock source fund exists with zero balance
      mockSql.mockResolvedValueOnce([
        { id: "fund1", name: "Test Fund", current_balance: 0 },
      ]);

      // Mock category has fund relationships
      mockSql.mockResolvedValueOnce([
        { id: "fund1", name: "Test Fund", current_balance: 0 },
      ]);

      const result = await validateSourceFundForCategory("cat1", "fund1");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining("balance cero o negativo")
      );
    });

    it("should handle unrestricted categories", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock source fund exists
      mockSql.mockResolvedValueOnce([
        { id: "fund1", name: "Test Fund", current_balance: 1000 },
      ]);

      // Mock category has no specific fund relationships
      mockSql.mockResolvedValueOnce([]);

      // Mock no legacy fund relationship
      mockSql.mockResolvedValueOnce([]);

      // Mock all funds
      mockSql.mockResolvedValueOnce([
        { id: "fund1", name: "Test Fund", current_balance: 1000 },
        { id: "fund2", name: "Other Fund", current_balance: 500 },
      ]);

      const result = await validateSourceFundForCategory("cat1", "fund1");

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining("no tiene fondos específicos asociados")
      );
      expect(result.data.hasSpecificFundRestrictions).toBe(false);
    });
  });

  describe("validateExpenseSourceFunds", () => {
    it("should validate expense with source and destination funds", async () => {
      // Mock successful source fund validation
      mockSql
        .mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 1000 },
        ])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 1000 },
        ]);

      // Mock destination fund exists
      mockSql.mockResolvedValueOnce([
        { id: "fund2", name: "Dest Fund", current_balance: 500 },
      ]);

      const result = await validateExpenseSourceFunds(
        "cat1",
        "fund1",
        "fund2",
        100
      );

      expect(result.isValid).toBe(true);
      expect(result.data.isTransfer).toBe(true);
      expect(result.data.destinationFundName).toBe("Dest Fund");
      expect(result.warnings).toContain(
        expect.stringContaining("transferencia")
      );
    });

    it("should fail when destination fund does not exist", async () => {
      // Mock successful source fund validation
      mockSql
        .mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 1000 },
        ])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 1000 },
        ]);

      // Mock destination fund does not exist
      mockSql.mockResolvedValueOnce([]);

      const result = await validateExpenseSourceFunds(
        "cat1",
        "fund1",
        "nonexistent"
      );

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "El fondo de destino especificado no existe"
      );
    });

    it("should fail when source and destination funds are the same", async () => {
      // Mock successful source fund validation
      mockSql
        .mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 1000 },
        ])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 1000 },
        ]);

      const result = await validateExpenseSourceFunds("cat1", "fund1", "fund1");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "No se puede transferir dinero al mismo fondo"
      );
    });

    it("should add warning when amount exceeds balance", async () => {
      // Mock successful source fund validation
      mockSql
        .mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 100 },
        ])
        .mockResolvedValueOnce([
          { id: "fund1", name: "Source Fund", current_balance: 100 },
        ]);

      const result = await validateExpenseSourceFunds(
        "cat1",
        "fund1",
        undefined,
        200
      );

      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining("excede el balance disponible")
      );
    });
  });

  describe("getAvailableSourceFundsForCategory", () => {
    it("should return funds with restrictions when category has specific relationships", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock category has specific fund relationships
      mockSql.mockResolvedValueOnce([
        {
          id: "fund1",
          name: "Fund 1",
          description: "Desc 1",
          current_balance: 1000,
        },
        {
          id: "fund2",
          name: "Fund 2",
          description: "Desc 2",
          current_balance: 500,
        },
      ]);

      const result = await getAvailableSourceFundsForCategory("cat1");

      expect(result.funds).toHaveLength(2);
      expect(result.hasRestrictions).toBe(true);
      expect(result.categoryName).toBe("Test Category");
    });

    it("should return legacy fund when no specific relationships exist", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock no specific fund relationships
      mockSql.mockResolvedValueOnce([]);

      // Mock legacy fund relationship
      mockSql.mockResolvedValueOnce([
        {
          id: "fund1",
          name: "Legacy Fund",
          description: "Legacy",
          current_balance: 1000,
        },
      ]);

      const result = await getAvailableSourceFundsForCategory("cat1");

      expect(result.funds).toHaveLength(1);
      expect(result.hasRestrictions).toBe(true);
      expect(result.funds[0].name).toBe("Legacy Fund");
    });

    it("should return all funds when no restrictions exist", async () => {
      // Mock category exists
      mockSql.mockResolvedValueOnce([{ id: "cat1", name: "Test Category" }]);

      // Mock no specific fund relationships
      mockSql.mockResolvedValueOnce([]);

      // Mock no legacy fund relationship
      mockSql.mockResolvedValueOnce([]);

      // Mock all funds
      mockSql.mockResolvedValueOnce([
        {
          id: "fund1",
          name: "Fund 1",
          description: "Desc 1",
          current_balance: 1000,
        },
        {
          id: "fund2",
          name: "Fund 2",
          description: "Desc 2",
          current_balance: 500,
        },
        {
          id: "fund3",
          name: "Fund 3",
          description: "Desc 3",
          current_balance: 750,
        },
      ]);

      const result = await getAvailableSourceFundsForCategory("cat1");

      expect(result.funds).toHaveLength(3);
      expect(result.hasRestrictions).toBe(false);
    });

    it("should handle non-existent category", async () => {
      // Mock category does not exist
      mockSql.mockResolvedValueOnce([]);

      const result = await getAvailableSourceFundsForCategory("nonexistent");

      expect(result.funds).toHaveLength(0);
      expect(result.hasRestrictions).toBe(false);
      expect(result.categoryName).toBe("");
    });
  });

  describe("validateSourceFundUpdate", () => {
    it("should validate expense update with source fund changes", async () => {
      // Mock existing expense
      mockSql.mockResolvedValueOnce([
        {
          id: "exp1",
          category_id: "cat1",
          source_fund_id: "fund1",
          destination_fund_id: null,
          amount: 100,
          category_name: "Old Category",
          source_fund_name: "Old Fund",
          destination_fund_name: null,
        },
      ]);

      // Mock validation for new configuration
      mockSql
        .mockResolvedValueOnce([{ id: "cat2", name: "New Category" }])
        .mockResolvedValueOnce([
          { id: "fund2", name: "New Fund", current_balance: 1000 },
        ])
        .mockResolvedValueOnce([
          { id: "fund2", name: "New Fund", current_balance: 1000 },
        ]);

      const result = await validateSourceFundUpdate("exp1", "cat2", "fund2");

      expect(result.isValid).toBe(true);
      expect(result.data.isUpdate).toBe(true);
      expect(result.warnings).toContain(
        expect.stringContaining("categoría cambiará")
      );
      expect(result.warnings).toContain(
        expect.stringContaining("fondo origen cambiará")
      );
    });

    it("should fail when expense does not exist", async () => {
      // Mock expense does not exist
      mockSql.mockResolvedValueOnce([]);

      const result = await validateSourceFundUpdate("nonexistent");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("El gasto especificado no existe");
    });
  });

  describe("validateSourceFundSelection", () => {
    const mockFunds = [
      { id: "fund1", name: "Fund 1", current_balance: 1000 } as any,
      { id: "fund2", name: "Fund 2", current_balance: 500 } as any,
    ];

    it("should validate when source fund is in available funds", () => {
      const result = validateSourceFundSelection(mockFunds[0], mockFunds, true);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail when no source fund is selected and required", () => {
      const result = validateSourceFundSelection(null, mockFunds, true);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        SOURCE_FUND_VALIDATION_MESSAGES.SOURCE_FUND_REQUIRED
      );
    });

    it("should pass when no source fund is selected and not required", () => {
      const result = validateSourceFundSelection(null, mockFunds, false);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should fail when selected fund is not in available funds", () => {
      const unavailableFund = {
        id: "fund3",
        name: "Fund 3",
        current_balance: 200,
      } as any;
      const result = validateSourceFundSelection(
        unavailableFund,
        mockFunds,
        true
      );

      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        SOURCE_FUND_VALIDATION_MESSAGES.SOURCE_FUND_INVALID_FOR_CATEGORY
      );
    });

    it("should pass when no category funds restrictions exist", () => {
      const anyFund = {
        id: "fund3",
        name: "Fund 3",
        current_balance: 200,
      } as any;
      const result = validateSourceFundSelection(anyFund, [], true);

      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      // Mock database error
      mockSql.mockRejectedValueOnce(new Error("Database connection failed"));

      const result = await validateSourceFundForCategory("cat1", "fund1");

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Error interno del servidor al validar el fondo origen"
      );
    });

    it("should handle network timeouts", async () => {
      // Mock timeout error
      mockSql.mockRejectedValueOnce(new Error("Timeout"));

      const result = await getAvailableSourceFundsForCategory("cat1");

      expect(result.funds).toHaveLength(0);
      expect(result.hasRestrictions).toBe(false);
    });
  });
});
