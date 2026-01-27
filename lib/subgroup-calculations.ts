/**
 * Sub-Group Calculation Utilities
 * Handles calculations for sub-group subtotals and aggregations
 */

import type { Subgroup, VisibilityState } from "@/types/simulation";

/**
 * Subtotal data structure for display
 */
export type Subtotals = {
  efectivoAmount: number;
  creditoAmount: number;
  ahorroEfectivoAmount: number;
  ahorroCreditoAmount: number;
  total: number;
};

/**
 * Budget data for a category
 */
export type CategoryBudgetData = {
  efectivo_amount: string | number;
  credito_amount: string | number;
  ahorro_efectivo_amount: string | number;
  ahorro_credito_amount: string | number;
  expected_savings?: string | number; // Optional for backward compatibility
};

/**
 * Calculate subtotals for a sub-group
 * @param subgroup - The sub-group to calculate subtotals for
 * @param budgetData - Object mapping category IDs to budget data
 * @param visibilityState - Optional visibility state to exclude hidden categories
 * @returns Subtotals object with calculated values
 */
export function calculateSubgroupSubtotals(
  subgroup: Subgroup,
  budgetData: Record<string, CategoryBudgetData>,
  visibilityState?: VisibilityState
): Subtotals {
  let efectivoAmount = 0;
  let creditoAmount = 0;
  let ahorroEfectivoAmount = 0;
  let ahorroCreditoAmount = 0;

  // Sum values for all categories in the sub-group
  for (const categoryId of subgroup.categoryIds) {
    const categoryKey = String(categoryId);
    const data = budgetData[categoryKey];

    // Skip hidden categories if visibility state is provided
    if (visibilityState) {
      const isSubgroupVisible = visibilityState[subgroup.id] !== false;
      const isCategoryVisible = visibilityState[categoryKey] !== false;
      if (!isSubgroupVisible || !isCategoryVisible) {
        continue;
      }
    }

    if (data) {
      const efectivo = parseFloat(String(data.efectivo_amount)) || 0;
      const credito = parseFloat(String(data.credito_amount)) || 0;
      const ahorroEfectivo = parseFloat(String(data.ahorro_efectivo_amount)) || 0;
      const ahorroCredito = parseFloat(String(data.ahorro_credito_amount)) || 0;

      efectivoAmount += efectivo;
      creditoAmount += credito;
      ahorroEfectivoAmount += ahorroEfectivo;
      ahorroCreditoAmount += ahorroCredito;
    }
  }

  const total = efectivoAmount + creditoAmount - ahorroEfectivoAmount - ahorroCreditoAmount;

  return {
    efectivoAmount,
    creditoAmount,
    ahorroEfectivoAmount,
    ahorroCreditoAmount,
    total,
  };
}

/**
 * Get the primary tipo_gasto for a sub-group
 * Determines the most common tipo_gasto among categories in the sub-group
 * @param subgroup - The sub-group
 * @param categories - Array of category objects with id, name, tipo_gasto
 * @returns The primary tipo_gasto or undefined
 */
export function getPrimaryTipoGasto(
  subgroup: Subgroup,
  categories: Array<{ id: string | number; tipo_gasto?: string }>
): string | undefined {
  if (subgroup.categoryIds.length === 0) {
    return undefined;
  }

  // Count occurrences of each tipo_gasto in the sub-group
  const tipoGastoCount: Record<string, number> = {};
  let firstTipoGasto: string | undefined = undefined;

  for (const categoryId of subgroup.categoryIds) {
    const category = categories.find(
      (c) => String(c.id) === String(categoryId)
    );

    if (category && category.tipo_gasto) {
      // Record first tipo_gasto as fallback
      if (!firstTipoGasto) {
        firstTipoGasto = category.tipo_gasto;
      }

      // Count occurrences
      tipoGastoCount[category.tipo_gasto] =
        (tipoGastoCount[category.tipo_gasto] || 0) + 1;
    }
  }

  // Find the most frequent tipo_gasto
  let maxCount = 0;
  let primaryTipoGasto: string | undefined = undefined;

  for (const [tipoGasto, count] of Object.entries(tipoGastoCount)) {
    if (count > maxCount) {
      maxCount = count;
      primaryTipoGasto = tipoGasto;
    }
  }

  // Return primary tipo_gasto or fallback to first one found
  return primaryTipoGasto || firstTipoGasto;
}

/**
 * Check if a sub-group is empty (no categories or all categories have zero values)
 * @param subgroup - The sub-group
 * @param budgetData - Object mapping category IDs to budget data
 * @returns true if sub-group should be hidden, false otherwise
 */
export function isSubgroupEmpty(
  subgroup: Subgroup,
  budgetData: Record<string, CategoryBudgetData>
): boolean {
  if (subgroup.categoryIds.length === 0) {
    return true;
  }

  // Check if all categories in the sub-group have zero values
  for (const categoryId of subgroup.categoryIds) {
    const categoryKey = String(categoryId);
    const data = budgetData[categoryKey];

    if (data) {
      const efectivo = parseFloat(String(data.efectivo_amount)) || 0;
      const credito = parseFloat(String(data.credito_amount)) || 0;

      // If any category has non-zero values, sub-group is not empty
      if (efectivo !== 0 || credito !== 0) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Get the count of categories in a sub-group that have valid budget data
 * @param subgroup - The sub-group
 * @param budgetData - Object mapping category IDs to budget data
 * @returns Count of categories with budget data
 */
export function getSubgroupCategoryCount(
  subgroup: Subgroup,
  budgetData: Record<string, CategoryBudgetData>
): number {
  let count = 0;

  for (const categoryId of subgroup.categoryIds) {
    const categoryKey = String(categoryId);
    if (budgetData[categoryKey]) {
      count++;
    }
  }

  return count;
}

/**
 * Format subtotals for display in the UI
 * @param subtotals - The subtotals object
 * @returns Formatted object with currency strings
 */
export function formatSubtotalsForDisplay(subtotals: Subtotals) {
  return {
    efectivoAmount: subtotals.efectivoAmount,
    creditoAmount: subtotals.creditoAmount,
    ahorroEfectivoAmount: subtotals.ahorroEfectivoAmount,
    ahorroCreditoAmount: subtotals.ahorroCreditoAmount,
    total: subtotals.total,
  };
}
