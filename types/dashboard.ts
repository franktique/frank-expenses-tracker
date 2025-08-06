// Dashboard-related type definitions

/**
 * Budget summary item representing a category's budget and expense data
 * with separate budget columns for credit and cash/debit payment methods
 */
export interface BudgetSummaryItem {
  category_id: string;
  category_name: string;

  // Split budget fields - Requirements 1.2, 1.3
  credit_budget: number; // Sum of all credit budgets for this category
  cash_debit_budget: number; // Sum of all cash and debit budgets for this category

  // Legacy field maintained for backward compatibility
  expected_amount: number; // Total budget amount (credit_budget + cash_debit_budget)

  // Expense amounts by payment method
  total_amount: number; // Total expenses across all payment methods
  credit_amount: number; // Credit card expenses
  debit_amount: number; // Debit card expenses
  cash_amount: number; // Cash expenses

  // Calculated field
  remaining: number; // Budget remaining (expected_amount - total_amount)
}

/**
 * Dashboard data structure containing all information needed for the dashboard view
 */
export interface DashboardData {
  activePeriod: {
    id: string;
    name: string;
  } | null;
  totalIncome: number;
  totalExpenses: number;
  budgetSummary: BudgetSummaryItem[];
}

/**
 * Budget totals for verification and display in totals row
 * Requirements 2.1, 2.2, 2.3
 */
export interface BudgetTotals {
  totalCreditBudget: number; // Sum of all credit budgets
  totalCashDebitBudget: number; // Sum of all cash/debit budgets
  totalExpectedAmount: number; // Sum of all expected amounts
  totalActualAmount: number; // Sum of all actual expenses
  totalCreditAmount: number; // Sum of all credit expenses
  totalDebitAmount: number; // Sum of all debit expenses
  totalCashAmount: number; // Sum of all cash expenses
  totalRemaining: number; // Sum of all remaining amounts
}

/**
 * Type guard to check if budget summary item has the new split budget fields
 */
export function hasSplitBudgetFields(item: any): item is BudgetSummaryItem {
  return (
    typeof item === "object" &&
    item !== null &&
    typeof item.credit_budget === "number" &&
    typeof item.cash_debit_budget === "number"
  );
}

/**
 * Utility function to calculate budget totals from budget summary array
 */
export function calculateBudgetTotals(
  budgetSummary: BudgetSummaryItem[]
): BudgetTotals {
  return budgetSummary.reduce(
    (totals, item) => ({
      totalCreditBudget: totals.totalCreditBudget + item.credit_budget,
      totalCashDebitBudget:
        totals.totalCashDebitBudget + item.cash_debit_budget,
      totalExpectedAmount: totals.totalExpectedAmount + item.expected_amount,
      totalActualAmount: totals.totalActualAmount + item.total_amount,
      totalCreditAmount: totals.totalCreditAmount + item.credit_amount,
      totalDebitAmount: totals.totalDebitAmount + item.debit_amount,
      totalCashAmount: totals.totalCashAmount + item.cash_amount,
      totalRemaining: totals.totalRemaining + item.remaining,
    }),
    {
      totalCreditBudget: 0,
      totalCashDebitBudget: 0,
      totalExpectedAmount: 0,
      totalActualAmount: 0,
      totalCreditAmount: 0,
      totalDebitAmount: 0,
      totalCashAmount: 0,
      totalRemaining: 0,
    }
  );
}

/**
 * Utility function to verify that split budget totals equal expected amount
 * Requirements 2.3 - ensures sum of credit and cash/debit budgets equals total budget
 */
export function verifyBudgetTotals(budgetSummary: BudgetSummaryItem[]): {
  isValid: boolean;
  discrepancies: Array<{
    category_id: string;
    category_name: string;
    splitSum: number;
    expectedAmount: number;
    difference: number;
  }>;
} {
  const discrepancies: Array<{
    category_id: string;
    category_name: string;
    splitSum: number;
    expectedAmount: number;
    difference: number;
  }> = [];

  budgetSummary.forEach((item) => {
    const splitSum = item.credit_budget + item.cash_debit_budget;
    const difference = Math.abs(splitSum - item.expected_amount);

    // Allow for small floating point differences (1 cent)
    if (difference > 0.01) {
      discrepancies.push({
        category_id: item.category_id,
        category_name: item.category_name,
        splitSum,
        expectedAmount: item.expected_amount,
        difference: splitSum - item.expected_amount,
      });
    }
  });

  return {
    isValid: discrepancies.length === 0,
    discrepancies,
  };
}
