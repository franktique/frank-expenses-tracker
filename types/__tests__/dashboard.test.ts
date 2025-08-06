// Test file for dashboard types
import {
  BudgetSummaryItem,
  DashboardData,
  calculateBudgetTotals,
  verifyBudgetTotals,
  hasSplitBudgetFields,
} from "../dashboard";

describe("Dashboard Types", () => {
  const mockBudgetSummaryItem: BudgetSummaryItem = {
    category_id: "1",
    category_name: "Test Category",
    credit_budget: 100,
    cash_debit_budget: 200,
    expected_amount: 300,
    total_amount: 250,
    credit_amount: 150,
    debit_amount: 50,
    cash_amount: 50,
    remaining: 50,
  };

  const mockDashboardData: DashboardData = {
    activePeriod: {
      id: "1",
      name: "Test Period",
    },
    totalIncome: 1000,
    totalExpenses: 500,
    budgetSummary: [mockBudgetSummaryItem],
  };

  test("BudgetSummaryItem type should have all required fields", () => {
    expect(mockBudgetSummaryItem.category_id).toBe("1");
    expect(mockBudgetSummaryItem.credit_budget).toBe(100);
    expect(mockBudgetSummaryItem.cash_debit_budget).toBe(200);
    expect(mockBudgetSummaryItem.expected_amount).toBe(300);
  });

  test("DashboardData type should have all required fields", () => {
    expect(mockDashboardData.activePeriod?.id).toBe("1");
    expect(mockDashboardData.totalIncome).toBe(1000);
    expect(mockDashboardData.budgetSummary).toHaveLength(1);
  });

  test("calculateBudgetTotals should calculate correct totals", () => {
    const totals = calculateBudgetTotals([mockBudgetSummaryItem]);

    expect(totals.totalCreditBudget).toBe(100);
    expect(totals.totalCashDebitBudget).toBe(200);
    expect(totals.totalExpectedAmount).toBe(300);
    expect(totals.totalActualAmount).toBe(250);
    expect(totals.totalCreditAmount).toBe(150);
    expect(totals.totalDebitAmount).toBe(50);
    expect(totals.totalCashAmount).toBe(50);
    expect(totals.totalRemaining).toBe(50);
  });

  test("verifyBudgetTotals should validate budget consistency", () => {
    const result = verifyBudgetTotals([mockBudgetSummaryItem]);

    expect(result.isValid).toBe(true);
    expect(result.discrepancies).toHaveLength(0);
  });

  test("verifyBudgetTotals should detect discrepancies", () => {
    const invalidItem: BudgetSummaryItem = {
      ...mockBudgetSummaryItem,
      credit_budget: 100,
      cash_debit_budget: 150, // This makes total 250, but expected_amount is 300
      expected_amount: 300,
    };

    const result = verifyBudgetTotals([invalidItem]);

    expect(result.isValid).toBe(false);
    expect(result.discrepancies).toHaveLength(1);
    expect(result.discrepancies[0].difference).toBe(-50); // 250 - 300 = -50
  });

  test("hasSplitBudgetFields should validate object structure", () => {
    expect(hasSplitBudgetFields(mockBudgetSummaryItem)).toBe(true);
    expect(hasSplitBudgetFields({})).toBe(false);
    expect(hasSplitBudgetFields(null)).toBe(false);
    expect(hasSplitBudgetFields({ credit_budget: "invalid" })).toBe(false);
  });

  test("calculateBudgetTotals should handle empty array", () => {
    const totals = calculateBudgetTotals([]);

    expect(totals.totalCreditBudget).toBe(0);
    expect(totals.totalCashDebitBudget).toBe(0);
    expect(totals.totalExpectedAmount).toBe(0);
  });

  test("calculateBudgetTotals should handle multiple items", () => {
    const item2: BudgetSummaryItem = {
      category_id: "2",
      category_name: "Test Category 2",
      credit_budget: 50,
      cash_debit_budget: 75,
      expected_amount: 125,
      total_amount: 100,
      credit_amount: 60,
      debit_amount: 20,
      cash_amount: 20,
      remaining: 25,
    };

    const totals = calculateBudgetTotals([mockBudgetSummaryItem, item2]);

    expect(totals.totalCreditBudget).toBe(150); // 100 + 50
    expect(totals.totalCashDebitBudget).toBe(275); // 200 + 75
    expect(totals.totalExpectedAmount).toBe(425); // 300 + 125
    expect(totals.totalActualAmount).toBe(350); // 250 + 100
  });
});
