/**
 * Utility functions for category styling in dashboard components
 */

import { BudgetSummaryItem } from "@/types/dashboard";

/**
 * Determines CSS classes for category name styling based on expense data
 *
 * @param item - Budget summary item containing category and expense data
 * @returns CSS class string for styling the category name
 *
 * Requirements:
 * - 1.1: Gray out category names when no expenses exist for current period
 * - 1.4: Update styling when expenses are added/removed
 * - 2.1: Use muted text color that maintains accessibility
 */
export function getCategoryNameStyle(item: BudgetSummaryItem): string {
  // Handle edge cases for null, undefined, and invalid values
  if (!item || typeof item.total_amount !== "number") {
    // Default to active styling for invalid data
    return "";
  }

  // Category has no expenses if total_amount is 0
  // Negative expenses (refunds) are considered as having activity
  const hasNoExpenses = item.total_amount === 0;

  // Return appropriate Tailwind CSS classes
  return hasNoExpenses ? "!text-black dark:!text-white" : "";
}
