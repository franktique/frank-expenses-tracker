import { NextRequest } from "next/server";
import { GET, PUT, DELETE } from "../route";
import { sql } from "@/lib/db";
import { validateSourceFundUpdate } from "@/lib/source-fund-validation";

// Mock dependencies
jest.mock("@/lib/db", () => ({
  sql: jest.fn(),
}));

jest.mock("@/lib/source-fund-validation", () => ({
  validateSourceFundUpdate: jest.fn(),
}));

const mockSql = sql as jest.MockedFunction<typeof sql>;
const mockValidateSourceFundUpdate =
  validateSourceFundUpdate as jest.MockedFunction<
    typeof validateSourceFundUpdate
  >;

describe("/api/expenses/[id]", () => {
  const mockExpense = {
    id: "expense-1",
    category_id: "cat-1",
    period_id: "period-1",
    date: "2024-01-15",
    event: "Test event",
    payment_method: "credit",
    description: "Test expense",
    amount: 100,
    source_fund_id: "fund-1",
    destination_fund_id: "fund-2",
    category_name: "Test Category",
    period_name: "January 2024",
    source_fund_name: "Source Fund",
    destination_fund_name: "Destination Fund",
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return expense with source fund information", async () => {
      mockSql.mockResolvedValueOnce([mockExpense]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1"
      );
      const response = await GET(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockExpense);
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "LEFT JOIN funds sf ON e.source_fund_id = sf.id"
        )
      );
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining(
          "LEFT JOIN funds df ON e.destination_fund_id = df.id"
        )
      );
    });

    it("should return 404 when expense not found", async () => {
      mockSql.mockResolvedValueOnce([]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/nonexistent"
      );
      const response = await GET(request, { params: { id: "nonexistent" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Expense not found");
    });

    it("should handle database errors", async () => {
      mockSql.mockRejectedValueOnce(new Error("Database query failed"));

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1"
      );
      const response = await GET(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database query failed");
    });
  });

  describe("PUT", () => {
    const existingExpense = {
      id: "expense-1",
      category_id: "cat-1",
      period_id: "period-1",
      date: "2024-01-15",
      event: "Test event",
      payment_method: "credit",
      description: "Test expense",
      amount: 100,
      source_fund_id: "fund-1",
      destination_fund_id: "fund-2",
    };

    const updateData = {
      description: "Updated expense",
      amount: 150,
      source_fund_id: "fund-3",
    };

    beforeEach(() => {
      mockValidateSourceFundUpdate.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: [],
        data: {
          isUpdate: true,
          sourceFundName: "New Source Fund",
        },
      });
    });

    it("should update expense with source fund validation", async () => {
      const updatedExpense = { ...existingExpense, ...updateData };
      const updatedExpenseWithFunds = {
        ...mockExpense,
        ...updateData,
        source_fund_name: "New Source Fund",
      };

      mockSql
        .mockResolvedValueOnce([existingExpense]) // GET existing expense
        .mockResolvedValueOnce([]) // Revert old source fund balance
        .mockResolvedValueOnce([]) // Revert old destination fund balance
        .mockResolvedValueOnce([updatedExpense]) // UPDATE expense
        .mockResolvedValueOnce([]) // Apply new source fund balance
        .mockResolvedValueOnce([]) // Apply new destination fund balance
        .mockResolvedValueOnce([updatedExpenseWithFunds]); // SELECT updated expense with funds

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.description).toBe("Updated expense");
      expect(data.amount).toBe(150);
      expect(mockValidateSourceFundUpdate).toHaveBeenCalledWith(
        "expense-1",
        undefined, // category_id not changed
        "fund-3", // source_fund_id changed
        undefined, // destination_fund_id not changed
        150 // amount changed
      );
    });

    it("should revert and apply fund balance changes correctly", async () => {
      mockSql
        .mockResolvedValueOnce([existingExpense])
        .mockResolvedValueOnce([]) // Revert old source fund (+100)
        .mockResolvedValueOnce([]) // Revert old destination fund (-100)
        .mockResolvedValueOnce([{ ...existingExpense, ...updateData }])
        .mockResolvedValueOnce([]) // Apply new source fund (-150)
        .mockResolvedValueOnce([]) // Apply new destination fund (+150)
        .mockResolvedValueOnce([mockExpense]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      await PUT(request, { params: { id: "expense-1" } });

      // Check fund balance reversals
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE funds"),
        expect.stringContaining(
          "current_balance = current_balance + ${oldAmount}"
        ),
        expect.stringContaining("WHERE id = ${oldSourceFundId}")
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE funds"),
        expect.stringContaining(
          "current_balance = current_balance - ${oldAmount}"
        ),
        expect.stringContaining("WHERE id = ${oldDestinationFundId}")
      );

      // Check new fund balance applications
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE funds"),
        expect.stringContaining(
          "current_balance = current_balance - ${amount}"
        ),
        expect.stringContaining("WHERE id = ${source_fund_id}")
      );
    });

    it("should handle partial updates correctly", async () => {
      const partialUpdate = { description: "Partially updated" };

      mockSql
        .mockResolvedValueOnce([existingExpense])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...existingExpense, ...partialUpdate }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...mockExpense, ...partialUpdate }]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "PUT",
          body: JSON.stringify(partialUpdate),
        }
      );

      const response = await PUT(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.description).toBe("Partially updated");
      expect(data.amount).toBe(100); // Should keep original amount
      expect(data.source_fund_id).toBe("fund-1"); // Should keep original source fund
    });

    it("should handle expenses without destination fund", async () => {
      const expenseWithoutDestination = {
        ...existingExpense,
        destination_fund_id: null,
      };

      mockSql
        .mockResolvedValueOnce([expenseWithoutDestination])
        .mockResolvedValueOnce([]) // Revert source fund only
        .mockResolvedValueOnce([
          { ...expenseWithoutDestination, ...updateData },
        ])
        .mockResolvedValueOnce([]) // Apply new source fund
        .mockResolvedValueOnce([mockExpense]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      await PUT(request, { params: { id: "expense-1" } });

      // Should only update source fund balance (no destination fund operations)
      expect(mockSql).toHaveBeenCalledTimes(5); // GET, revert source, UPDATE, apply source, SELECT
    });

    it("should return 404 when expense not found", async () => {
      mockSql.mockResolvedValueOnce([]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/nonexistent",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, { params: { id: "nonexistent" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Expense not found");
    });

    it("should reject invalid update data", async () => {
      const invalidData = { amount: -50 }; // Negative amount

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "PUT",
          body: JSON.stringify(invalidData),
        }
      );

      const response = await PUT(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });

    it("should reject updates that fail source fund validation", async () => {
      mockValidateSourceFundUpdate.mockResolvedValue({
        isValid: false,
        errors: ["El fondo origen no está asociado con la nueva categoría"],
        warnings: [],
        data: null,
      });

      mockSql.mockResolvedValueOnce([existingExpense]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Validation failed");
      expect(data.details).toContain(
        "El fondo origen no está asociado con la nueva categoría"
      );
    });

    it("should log warnings but still update expense", async () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      mockValidateSourceFundUpdate.mockResolvedValue({
        isValid: true,
        errors: [],
        warnings: ["La categoría cambiará de Test Category a New Category"],
        data: { isUpdate: true },
      });

      mockSql
        .mockResolvedValueOnce([existingExpense])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ ...existingExpense, ...updateData }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([mockExpense]);

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "PUT",
          body: JSON.stringify(updateData),
        }
      );

      const response = await PUT(request, { params: { id: "expense-1" } });

      expect(response.status).toBe(200);
      expect(consoleSpy).toHaveBeenCalledWith("Expense update warnings:", [
        "La categoría cambiará de Test Category a New Category",
      ]);

      consoleSpy.mockRestore();
    });
  });

  describe("DELETE", () => {
    const expenseToDelete = {
      id: "expense-1",
      category_id: "cat-1",
      period_id: "period-1",
      date: "2024-01-15",
      event: "Test event",
      payment_method: "credit",
      description: "Test expense",
      amount: 100,
      source_fund_id: "fund-1",
      destination_fund_id: "fund-2",
    };

    it("should delete expense and revert fund balances", async () => {
      mockSql
        .mockResolvedValueOnce([expenseToDelete]) // GET expense before delete
        .mockResolvedValueOnce([expenseToDelete]) // DELETE expense
        .mockResolvedValueOnce([]) // Revert source fund balance (+100)
        .mockResolvedValueOnce([]); // Revert destination fund balance (-100)

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(expenseToDelete);

      // Check fund balance reversals
      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE funds"),
        expect.stringContaining(
          "current_balance = current_balance + ${expenseToDelete.amount}"
        ),
        expect.stringContaining("WHERE id = ${expenseToDelete.source_fund_id}")
      );

      expect(mockSql).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE funds"),
        expect.stringContaining(
          "current_balance = current_balance - ${expenseToDelete.amount}"
        ),
        expect.stringContaining(
          "WHERE id = ${expenseToDelete.destination_fund_id}"
        )
      );
    });

    it("should handle expenses without destination fund", async () => {
      const expenseWithoutDestination = {
        ...expenseToDelete,
        destination_fund_id: null,
      };

      mockSql
        .mockResolvedValueOnce([expenseWithoutDestination])
        .mockResolvedValueOnce([expenseWithoutDestination])
        .mockResolvedValueOnce([]); // Only revert source fund

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, { params: { id: "expense-1" } });

      expect(response.status).toBe(200);
      // Should only update source fund balance (no destination fund operations)
      expect(mockSql).toHaveBeenCalledTimes(3); // GET, DELETE, revert source
    });

    it("should return 404 when expense not found for deletion", async () => {
      mockSql.mockResolvedValueOnce([]); // Expense not found

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/nonexistent",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, { params: { id: "nonexistent" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Expense not found");
    });

    it("should return 404 when delete operation fails", async () => {
      mockSql
        .mockResolvedValueOnce([expenseToDelete]) // GET succeeds
        .mockResolvedValueOnce([]); // DELETE returns empty (not found)

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe("Expense not found");
    });

    it("should handle database errors during deletion", async () => {
      mockSql
        .mockResolvedValueOnce([expenseToDelete])
        .mockRejectedValueOnce(new Error("Database delete failed"));

      const request = new NextRequest(
        "http://localhost:3000/api/expenses/expense-1",
        {
          method: "DELETE",
        }
      );

      const response = await DELETE(request, { params: { id: "expense-1" } });
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe("Database delete failed");
    });
  });
});
