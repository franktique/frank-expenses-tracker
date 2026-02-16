// Dashboard-related type definitions
import { PaymentMethod } from './estudios';

/**
 * Budget summary item representing a category's budget and expense data
 * with separate budget columns for credit and cash/debit payment methods
 */
export interface BudgetSummaryItem {
  category_id: string;
  category_name: string;
  default_day?: number | null; // Default day of month for category (1-31)

  // Split budget fields - Requirements 1.2, 1.3
  credit_budget: number; // Sum of all credit budgets for this category
  cash_debit_budget: number; // Sum of all cash and debit budgets for this category

  // Legacy field maintained for backward compatibility
  expected_amount: number; // Total budget amount (credit_budget + cash_debit_budget)

  // Expense amounts by payment method
  total_amount: number; // Total expenses across all payment methods
  confirmed_amount: number; // Confirmed expenses (excluding pending)
  pending_amount: number; // Pending expenses
  credit_amount: number; // Credit card expenses
  debit_amount: number; // Debit card expenses
  cash_amount: number; // Cash expenses

  // Calculated field
  remaining: number; // Budget remaining (expected_amount - total_amount + pending_amount)
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
    typeof item === 'object' &&
    item !== null &&
    typeof item.credit_budget === 'number' &&
    typeof item.cash_debit_budget === 'number'
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

/**
 * Dashboard grouper result with payment method filtering support
 * Requirements 2.1, 2.2 - reflects filtered data based on payment method selections
 */
export interface DashboardGrouperResult {
  grouper_id: number;
  grouper_name: string;
  total_amount: string;
  budget_amount?: string;
  // Metadata about payment method filtering applied
  payment_methods_applied?: PaymentMethod[] | null;
}

/**
 * Enhanced dashboard groupers response with filtering metadata
 * Requirements 2.1, 2.2 - provides context about applied filters
 */
export interface DashboardGroupersResponse {
  data: DashboardGrouperResult[];
  metadata: {
    estudio_id?: number;
    period_id: string;
    payment_method_filtering_applied: boolean;
    projection_mode: boolean;
    includes_budgets: boolean;
    total_groupers: number;
    filtered_groupers: number;
  };
}

/**
 * Payment method filter configuration for dashboard queries
 */
export interface PaymentMethodFilter {
  expense_payment_methods?: PaymentMethod[];
  budget_payment_methods?: PaymentMethod[];
  estudio_based_filtering?: boolean;
}

/**
 * Utility function to check if payment method filtering is active
 */
export function hasPaymentMethodFiltering(
  filter: PaymentMethodFilter
): boolean {
  return !!(
    filter.expense_payment_methods?.length ||
    filter.budget_payment_methods?.length ||
    filter.estudio_based_filtering
  );
}
