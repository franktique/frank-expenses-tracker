/**
 * Unit tests for category styling utility functions
 */

import { getCategoryNameStyle } from "../category-styling";
import { BudgetSummaryItem } from "@/types/dashboard";

describe("getCategoryNameStyle", () => {
  // Helper function to create a mock BudgetSummaryItem
  const createMockItem = (total_amount: number): BudgetSummaryItem => ({
    category_id: "test-id",
    category_name: "Test Category",
    credit_budget: 100,
    cash_debit_budget: 50,
    expected_amount: 150,
    total_amount,
    credit_amount: 0,
    debit_amount: 0,
    cash_amount: 0,
    remaining: 150 - total_amount,
  });

  describe("active categories (with expenses)", () => {
    it("should return empty string for categories with positive expenses", () => {
      const item = createMockItem(50);
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for categories with negative expenses (refunds)", () => {
      const item = createMockItem(-25);
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for categories with very small positive expenses", () => {
      const item = createMockItem(0.01);
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for categories with large expenses", () => {
      const item = createMockItem(1000);
      expect(getCategoryNameStyle(item)).toBe("");
    });
  });

  describe("inactive categories (no expenses)", () => {
    it("should return muted text class for categories with zero expenses", () => {
      const item = createMockItem(0);
      expect(getCategoryNameStyle(item)).toBe("text-muted-foreground");
    });

    it("should return muted text class for categories with exactly zero expenses", () => {
      const item = createMockItem(0.0);
      expect(getCategoryNameStyle(item)).toBe("text-muted-foreground");
    });
  });

  describe("edge cases and error handling", () => {
    it("should return empty string for null item", () => {
      expect(getCategoryNameStyle(null as any)).toBe("");
    });

    it("should return empty string for undefined item", () => {
      expect(getCategoryNameStyle(undefined as any)).toBe("");
    });

    it("should return empty string for item with null total_amount", () => {
      const item = { ...createMockItem(0), total_amount: null as any };
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for item with undefined total_amount", () => {
      const item = { ...createMockItem(0), total_amount: undefined as any };
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for item with string total_amount", () => {
      const item = { ...createMockItem(0), total_amount: "50" as any };
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for item with NaN total_amount", () => {
      const item = { ...createMockItem(0), total_amount: NaN };
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for item with Infinity total_amount", () => {
      const item = { ...createMockItem(0), total_amount: Infinity };
      expect(getCategoryNameStyle(item)).toBe("");
    });

    it("should return empty string for empty object", () => {
      expect(getCategoryNameStyle({} as any)).toBe("");
    });
  });

  describe("requirements verification", () => {
    it("should meet requirement 1.1: gray out categories with no expenses", () => {
      const itemWithExpenses = createMockItem(100);
      const itemWithoutExpenses = createMockItem(0);

      expect(getCategoryNameStyle(itemWithExpenses)).toBe("");
      expect(getCategoryNameStyle(itemWithoutExpenses)).toBe(
        "text-muted-foreground"
      );
    });

    it("should meet requirement 2.1: use muted text color for accessibility", () => {
      const item = createMockItem(0);
      const result = getCategoryNameStyle(item);

      // Verify it uses the Tailwind muted foreground class
      expect(result).toBe("text-muted-foreground");
    });

    it("should handle requirement 1.4: support dynamic updates", () => {
      // Test that the function returns different results for different states
      const baseItem = createMockItem(0);

      // Initially no expenses
      expect(getCategoryNameStyle(baseItem)).toBe("text-muted-foreground");

      // After adding expenses
      const updatedItem = { ...baseItem, total_amount: 50 };
      expect(getCategoryNameStyle(updatedItem)).toBe("");

      // After removing expenses
      const backToZeroItem = { ...baseItem, total_amount: 0 };
      expect(getCategoryNameStyle(backToZeroItem)).toBe(
        "text-muted-foreground"
      );
    });
  });
});
