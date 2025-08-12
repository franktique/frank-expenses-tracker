/**
 * @jest-environment jsdom
 */

import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";

// Types for testing
type GrouperData = {
  grouper_id: number;
  grouper_name: string;
  total_amount: number;
  budget_amount?: number;
  isProjectiond?: boolean;
};

type CategoryData = {
  category_id: string;
  category_name: string;
  total_amount: number;
  budget_amount?: number;
  isProjectiond?: boolean;
};

describe("Projection Mode Data Transformation", () => {
  // Data transformation function (extracted from component)
  const processProjectionData = <T extends GrouperData | CategoryData>(
    data: T[],
    isProjecting: boolean
  ): T[] => {
    return data.map((item) => ({
      ...item,
      // Use budget_amount as total_amount when projecting
      total_amount: isProjecting ? item.budget_amount || 0 : item.total_amount,
      // Add projection flag for styling purposes
      isProjectiond: isProjecting,
    }));
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Grouper Data Transformation", () => {
    const mockGrouperData: GrouperData[] = [
      {
        grouper_id: 1,
        grouper_name: "Alimentación",
        total_amount: 500,
        budget_amount: 600,
      },
      {
        grouper_id: 2,
        grouper_name: "Transporte",
        total_amount: 200,
        budget_amount: 300,
      },
      {
        grouper_id: 3,
        grouper_name: "Entretenimiento",
        total_amount: 150,
        budget_amount: undefined,
      },
    ];

    it("should transform data for projection mode", () => {
      const result = processProjectionData(mockGrouperData, true);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        grouper_id: 1,
        grouper_name: "Alimentación",
        total_amount: 600, // Uses budget_amount
        budget_amount: 600,
        isProjectiond: true,
      });
      expect(result[1]).toEqual({
        grouper_id: 2,
        grouper_name: "Transporte",
        total_amount: 300, // Uses budget_amount
        budget_amount: 300,
        isProjectiond: true,
      });
    });

    it("should handle missing budget amounts in projection mode", () => {
      const result = processProjectionData(mockGrouperData, true);

      expect(result[2]).toEqual({
        grouper_id: 3,
        grouper_name: "Entretenimiento",
        total_amount: 0, // Falls back to 0 when budget_amount is undefined
        budget_amount: undefined,
        isProjectiond: true,
      });
    });

    it("should not transform data when not projecting", () => {
      const result = processProjectionData(mockGrouperData, false);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        grouper_id: 1,
        grouper_name: "Alimentación",
        total_amount: 500, // Uses original total_amount
        budget_amount: 600,
        isProjectiond: false,
      });
      expect(result[1]).toEqual({
        grouper_id: 2,
        grouper_name: "Transporte",
        total_amount: 200, // Uses original total_amount
        budget_amount: 300,
        isProjectiond: false,
      });
    });

    it("should handle null budget amounts", () => {
      const dataWithNullBudget: GrouperData[] = [
        {
          grouper_id: 1,
          grouper_name: "Test",
          total_amount: 100,
          budget_amount: null as any,
        },
      ];

      const result = processProjectionData(dataWithNullBudget, true);

      expect(result[0].total_amount).toBe(0);
      expect(result[0].isProjectiond).toBe(true);
    });

    it("should handle zero budget amounts", () => {
      const dataWithZeroBudget: GrouperData[] = [
        {
          grouper_id: 1,
          grouper_name: "Test",
          total_amount: 100,
          budget_amount: 0,
        },
      ];

      const result = processProjectionData(dataWithZeroBudget, true);

      expect(result[0].total_amount).toBe(0);
      expect(result[0].isProjectiond).toBe(true);
    });

    it("should preserve all original properties", () => {
      const result = processProjectionData(mockGrouperData, true);

      result.forEach((item, index) => {
        expect(item.grouper_id).toBe(mockGrouperData[index].grouper_id);
        expect(item.grouper_name).toBe(mockGrouperData[index].grouper_name);
        expect(item.budget_amount).toBe(mockGrouperData[index].budget_amount);
      });
    });
  });

  describe("Category Data Transformation", () => {
    const mockCategoryData: CategoryData[] = [
      {
        category_id: "1",
        category_name: "Supermercado",
        total_amount: 300,
        budget_amount: 400,
      },
      {
        category_id: "2",
        category_name: "Restaurantes",
        total_amount: 200,
        budget_amount: 200,
      },
      {
        category_id: "3",
        category_name: "Cafeterías",
        total_amount: 50,
        budget_amount: undefined,
      },
    ];

    it("should transform category data for projection mode", () => {
      const result = processProjectionData(mockCategoryData, true);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        category_id: "1",
        category_name: "Supermercado",
        total_amount: 400, // Uses budget_amount
        budget_amount: 400,
        isProjectiond: true,
      });
    });

    it("should handle missing category budget amounts", () => {
      const result = processProjectionData(mockCategoryData, true);

      expect(result[2]).toEqual({
        category_id: "3",
        category_name: "Cafeterías",
        total_amount: 0, // Falls back to 0
        budget_amount: undefined,
        isProjectiond: true,
      });
    });

    it("should not transform category data when not projecting", () => {
      const result = processProjectionData(mockCategoryData, false);

      expect(result[0]).toEqual({
        category_id: "1",
        category_name: "Supermercado",
        total_amount: 300, // Uses original total_amount
        budget_amount: 400,
        isProjectiond: false,
      });
    });

    it("should preserve category IDs as strings", () => {
      const result = processProjectionData(mockCategoryData, true);

      result.forEach((item, index) => {
        expect(typeof item.category_id).toBe("string");
        expect(item.category_id).toBe(mockCategoryData[index].category_id);
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty data array", () => {
      const result = processProjectionData([], true);
      expect(result).toEqual([]);
    });

    it("should handle data with all missing budget amounts", () => {
      const dataWithoutBudgets: GrouperData[] = [
        {
          grouper_id: 1,
          grouper_name: "Test 1",
          total_amount: 100,
          budget_amount: undefined,
        },
        {
          grouper_id: 2,
          grouper_name: "Test 2",
          total_amount: 200,
          budget_amount: undefined,
        },
      ];

      const result = processProjectionData(dataWithoutBudgets, true);

      expect(result).toHaveLength(2);
      expect(result[0].total_amount).toBe(0);
      expect(result[1].total_amount).toBe(0);
      expect(result[0].isProjectiond).toBe(true);
      expect(result[1].isProjectiond).toBe(true);
    });

    it("should handle data with negative budget amounts", () => {
      const dataWithNegativeBudget: GrouperData[] = [
        {
          grouper_id: 1,
          grouper_name: "Test",
          total_amount: 100,
          budget_amount: -50,
        },
      ];

      const result = processProjectionData(dataWithNegativeBudget, true);

      expect(result[0].total_amount).toBe(-50);
      expect(result[0].isProjectiond).toBe(true);
    });

    it("should handle data with very large budget amounts", () => {
      const dataWithLargeBudget: GrouperData[] = [
        {
          grouper_id: 1,
          grouper_name: "Test",
          total_amount: 100,
          budget_amount: 999999999,
        },
      ];

      const result = processProjectionData(dataWithLargeBudget, true);

      expect(result[0].total_amount).toBe(999999999);
      expect(result[0].isProjectiond).toBe(true);
    });

    it("should handle mixed data types correctly", () => {
      const mixedData: (GrouperData | CategoryData)[] = [
        {
          grouper_id: 1,
          grouper_name: "Grouper",
          total_amount: 100,
          budget_amount: 150,
        } as GrouperData,
        {
          category_id: "1",
          category_name: "Category",
          total_amount: 200,
          budget_amount: 250,
        } as CategoryData,
      ];

      const result = processProjectionData(mixedData, true);

      expect(result).toHaveLength(2);
      expect(result[0].total_amount).toBe(150);
      expect(result[1].total_amount).toBe(250);
      expect(result[0].isProjectiond).toBe(true);
      expect(result[1].isProjectiond).toBe(true);
    });
  });

  describe("Performance", () => {
    it("should handle large datasets efficiently", () => {
      const largeDataset: GrouperData[] = Array.from(
        { length: 1000 },
        (_, i) => ({
          grouper_id: i,
          grouper_name: `Grouper ${i}`,
          total_amount: Math.random() * 1000,
          budget_amount: Math.random() * 1000,
        })
      );

      const startTime = performance.now();
      const result = processProjectionData(largeDataset, true);
      const endTime = performance.now();

      expect(result).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it("should not mutate original data", () => {
      const originalData: GrouperData[] = [
        {
          grouper_id: 1,
          grouper_name: "Test",
          total_amount: 100,
          budget_amount: 150,
        },
      ];

      const originalDataCopy = JSON.parse(JSON.stringify(originalData));
      const result = processProjectionData(originalData, true);

      // Original data should remain unchanged
      expect(originalData).toEqual(originalDataCopy);
      // Result should be different
      expect(result[0].total_amount).toBe(150);
      expect(result[0].isProjectiond).toBe(true);
    });
  });

  describe("Type Safety", () => {
    it("should maintain type safety for GrouperData", () => {
      const grouperData: GrouperData[] = [
        {
          grouper_id: 1,
          grouper_name: "Test",
          total_amount: 100,
          budget_amount: 150,
        },
      ];

      const result = processProjectionData(grouperData, true);

      // TypeScript should ensure these properties exist
      expect(typeof result[0].grouper_id).toBe("number");
      expect(typeof result[0].grouper_name).toBe("string");
      expect(typeof result[0].total_amount).toBe("number");
      expect(typeof result[0].isProjectiond).toBe("boolean");
    });

    it("should maintain type safety for CategoryData", () => {
      const categoryData: CategoryData[] = [
        {
          category_id: "1",
          category_name: "Test",
          total_amount: 100,
          budget_amount: 150,
        },
      ];

      const result = processProjectionData(categoryData, true);

      // TypeScript should ensure these properties exist
      expect(typeof result[0].category_id).toBe("string");
      expect(typeof result[0].category_name).toBe("string");
      expect(typeof result[0].total_amount).toBe("number");
      expect(typeof result[0].isProjectiond).toBe("boolean");
    });
  });
});
