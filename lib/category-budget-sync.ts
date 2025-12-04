/**
 * Service functions for syncing category changes to budget dates
 * Handles automatic updates of budget default_dates when category default_day changes
 */

import { sql } from "@/lib/db";
import { calculateDefaultDate } from "@/lib/default-day-utils";

/**
 * Interface for period information needed to calculate budget dates
 */
interface PeriodInfo {
  id: string;
  month: number;
  year: number;
}

/**
 * Interface for budget update information
 */
interface BudgetForUpdate {
  id: string;
  period_id: string;
}

/**
 * Update all budget default_dates for a category when its default_day changes
 *
 * This function:
 * 1. Fetches all budgets for the given category
 * 2. For each budget, gets the associated period information
 * 3. Calculates the default_date based on the new default_day and period end date
 * 4. Updates all budgets atomically using a transaction
 *
 * @param categoryId - The ID of the category being updated
 * @param defaultDay - The new default day (1-31) or null
 * @returns An object with success status, number of budgets updated, and any errors
 *
 * @example
 * // When a category's default_day is changed to 15
 * const result = await updateBudgetDefaultDatesForCategory(categoryId, 15);
 * console.log(`Updated ${result.updated_count} budgets`);
 */
export async function updateBudgetDefaultDatesForCategory(
  categoryId: string,
  defaultDay: number | null
): Promise<{
  success: boolean;
  updated_count: number;
  message: string;
  error?: string;
}> {
  try {
    // Step 1: Fetch all budgets for this category with their associated periods
    const budgets = await sql`
      SELECT
        b.id,
        b.period_id,
        p.month,
        p.year
      FROM budgets b
      JOIN periods p ON b.period_id = p.id
      WHERE b.category_id = ${categoryId}
      ORDER BY p.year DESC, p.month DESC
    `;

    // If no budgets found, return early
    if (!budgets || budgets.length === 0) {
      return {
        success: true,
        updated_count: 0,
        message: "No budgets found for this category",
      };
    }

    console.log(`Found ${budgets.length} budgets for category ${categoryId}`);

    // Step 2: Calculate default_date for each budget
    // Use the last day of the period's month as the end date for calculation
    const updates: Array<{
      budgetId: string;
      defaultDate: string | null;
    }> = [];

    for (const budget of budgets) {
      // Create start and end dates for the period based on month and year
      // NOTE: database stores months as 0-indexed (0-11), JavaScript Date also uses 0-indexed months
      const periodStartDate = new Date(budget.year, budget.month, 1);
      // Get the last day of the month (day 0 of next month)
      const periodEndDate = new Date(budget.year, budget.month + 1, 0);

      const calculatedDate = calculateDefaultDate(
        defaultDay,
        periodStartDate,
        periodEndDate
      );

      updates.push({
        budgetId: budget.id,
        defaultDate: calculatedDate,
      });

      console.log(
        `Budget ${budget.id} (${budget.year}-${String(budget.month).padStart(2, "0")}): default_date = ${calculatedDate}`
      );
    }

    // Step 3: Update all budgets
    // Execute updates sequentially to avoid connection issues
    let updateCount = 0;
    const errors: string[] = [];

    for (const update of updates) {
      try {
        // Use a simple UPDATE statement with explicit parameter substitution
        const budgetId = update.budgetId;
        const defaultDate = update.defaultDate;

        const result = await sql`UPDATE budgets SET default_date = ${defaultDate} WHERE id = ${budgetId} RETURNING id`;
        if (result && result.length > 0) {
          updateCount++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        errors.push(`Budget ${update.budgetId}: ${errorMsg}`);
        console.error(`Error updating budget ${update.budgetId}:`, err);
      }
    }

    console.log(`✓ Updated ${updateCount}/${updates.length} budgets with new default_dates`);

    if (errors.length > 0) {
      console.warn(`Update errors: ${errors.join("; ")}`);
    }

    return {
      success: updateCount > 0,
      updated_count: updateCount,
      message: `Successfully updated ${updateCount}/${updates.length} budget(s) with default_date`,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error updating budget default dates:", error);

    return {
      success: false,
      updated_count: 0,
      message: "Failed to update budget default_dates",
      error: errorMessage,
    };
  }
}

/**
 * Get all budgets for a category with their period information
 *
 * @param categoryId - The ID of the category
 * @returns Array of budgets with period information
 */
export async function getBudgetsForCategory(categoryId: string) {
  try {
    const budgets = await sql`
      SELECT
        b.id,
        b.category_id,
        b.period_id,
        b.expected_amount,
        b.payment_method,
        b.default_date,
        p.name as period_name,
        p.month,
        p.year
      FROM budgets b
      JOIN periods p ON b.period_id = p.id
      WHERE b.category_id = ${categoryId}
      ORDER BY p.year DESC, p.month DESC
    `;

    return budgets || [];
  } catch (error) {
    console.error("Error fetching budgets for category:", error);
    return [];
  }
}

/**
 * Clear all default_dates for budgets in a category
 * Useful for removing the default date feature from a category
 *
 * @param categoryId - The ID of the category
 * @returns Number of budgets updated
 */
export async function clearBudgetDefaultDatesForCategory(categoryId: string): Promise<number> {
  try {
    const result = await sql`
      UPDATE budgets
      SET default_date = NULL
      WHERE category_id = ${categoryId}
      RETURNING id
    `;

    const count = result?.length || 0;
    console.log(`Cleared default_dates for ${count} budgets in category ${categoryId}`);

    return count;
  } catch (error) {
    console.error("Error clearing budget default dates:", error);
    return 0;
  }
}

/**
 * Validate that a category's default_day is consistent across all its budgets
 * This is primarily for debugging/verification purposes
 *
 * @param categoryId - The ID of the category
 * @returns Object with validation results
 */
export async function validateCategoryBudgetDates(categoryId: string): Promise<{
  valid: boolean;
  category_default_day: number | null;
  budget_count: number;
  budgets_with_dates: number;
  issues: string[];
}> {
  try {
    // Get the category's default_day
    const categoryResult = await sql`
      SELECT default_day
      FROM categories
      WHERE id = $1
    `;

    const category = categoryResult?.[0];
    const categoryDefaultDay = category?.default_day || null;

    // Get all budgets for the category
    const budgets = await getBudgetsForCategory(categoryId);

    const issues: string[] = [];
    let budgetsWithDates = 0;

    // Check consistency
    for (const budget of budgets) {
      if (budget.default_date) {
        budgetsWithDates++;
      }

      // If category has default_day but budget doesn't have date (and should), flag it
      if (categoryDefaultDay && !budget.default_date) {
        issues.push(
          `Budget ${budget.id} (${budget.period_name}) is missing default_date`
        );
      }
    }

    return {
      valid: issues.length === 0,
      category_default_day: categoryDefaultDay,
      budget_count: budgets.length,
      budgets_with_dates: budgetsWithDates,
      issues,
    };
  } catch (error) {
    console.error("Error validating category budget dates:", error);
    return {
      valid: false,
      category_default_day: null,
      budget_count: 0,
      budgets_with_dates: 0,
      issues: [error instanceof Error ? error.message : String(error)],
    };
  }
}
