/**
 * Visibility-aware calculation utilities for budget simulations
 * Provides functions to filter and calculate budget values while respecting visibility state
 */

import type { VisibilityState } from "@/types/simulation";
import type { Subtotals } from "@/lib/subgroup-calculations";

/**
 * Check if an item is visible based on visibility state
 * Items are visible by default if not explicitly hidden in visibilityState
 */
export function isItemVisible(
  itemId: string | number,
  visibilityState: VisibilityState
): boolean {
  const key = String(itemId);
  // Default to visible (true) if not in visibility state
  return visibilityState[key] !== false;
}

/**
 * Check if a subgroup should be visible
 * A subgroup is visible if it's not explicitly hidden
 */
export function isSubgroupVisible(
  subgroupId: string,
  visibilityState: VisibilityState
): boolean {
  return isItemVisible(subgroupId, visibilityState);
}

/**
 * Check if a category should be visible
 * A category is visible if:
 * 1. It's not explicitly hidden AND
 * 2. Its parent subgroup (if any) is visible
 */
export function isCategoryVisible(
  categoryId: string | number,
  parentSubgroupId: string | undefined,
  visibilityState: VisibilityState
): boolean {
  // Check category's own visibility
  if (!isItemVisible(categoryId, visibilityState)) {
    return false;
  }

  // Check parent subgroup visibility
  if (parentSubgroupId && !isSubgroupVisible(parentSubgroupId, visibilityState)) {
    return false;
  }

  return true;
}

/**
 * Filter categories based on visibility state
 * Returns only visible categories
 */
export function filterVisibleCategories(
  categoryIds: (string | number)[],
  parentSubgroupId: string | undefined,
  visibilityState: VisibilityState
): (string | number)[] {
  return categoryIds.filter((catId) =>
    isCategoryVisible(catId, parentSubgroupId, visibilityState)
  );
}

/**
 * Calculate visible items count for a subgroup
 * Used to display the visible category count in subgroup headers
 */
export function countVisibleCategories(
  categoryIds: (string | number)[],
  subgroupId: string,
  visibilityState: VisibilityState
): number {
  const visible = filterVisibleCategories(categoryIds, subgroupId, visibilityState);
  return visible.length;
}

/**
 * Update visibility state by toggling an item's visibility
 */
export function toggleVisibility(
  visibilityState: VisibilityState,
  itemId: string | number
): VisibilityState {
  const key = String(itemId);
  return {
    ...visibilityState,
    [key]: !isItemVisible(itemId, visibilityState),
  };
}

/**
 * Set visibility state for an item
 */
export function setVisibility(
  visibilityState: VisibilityState,
  itemId: string | number,
  isVisible: boolean
): VisibilityState {
  const key = String(itemId);
  return {
    ...visibilityState,
    [key]: isVisible,
  };
}

/**
 * Set visibility for multiple items at once
 */
export function setMultipleVisibility(
  visibilityState: VisibilityState,
  itemIds: (string | number)[],
  isVisible: boolean
): VisibilityState {
  const updated = { ...visibilityState };
  itemIds.forEach((id) => {
    updated[String(id)] = isVisible;
  });
  return updated;
}

/**
 * Clear all visibility settings (revert to all visible)
 */
export function clearVisibilityState(): VisibilityState {
  return {};
}

/**
 * Get localStorage key for visibility state persistence
 */
export function getVisibilityStorageKey(simulationId: number): string {
  return `simulation_${simulationId}_visibility_state`;
}

/**
 * Save visibility state to localStorage
 */
export function saveVisibilityToStorage(
  simulationId: number,
  visibilityState: VisibilityState
): void {
  try {
    const key = getVisibilityStorageKey(simulationId);
    localStorage.setItem(key, JSON.stringify(visibilityState));
  } catch (error) {
    console.error("Error saving visibility state to localStorage:", error);
  }
}

/**
 * Load visibility state from localStorage
 */
export function loadVisibilityFromStorage(
  simulationId: number
): VisibilityState {
  try {
    const key = getVisibilityStorageKey(simulationId);
    const stored = localStorage.getItem(key);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === "object" && parsed !== null) {
        return parsed as VisibilityState;
      }
    }
  } catch (error) {
    console.error("Error loading visibility state from localStorage:", error);
  }
  return {};
}

/**
 * Clear visibility state from localStorage
 */
export function clearVisibilityFromStorage(simulationId: number): void {
  try {
    const key = getVisibilityStorageKey(simulationId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error("Error clearing visibility state from localStorage:", error);
  }
}

/**
 * Filter subtotals based on visibility state
 * Note: This adjusts calculations to only include visible items
 * The actual calculation logic should use filterVisibleCategories
 * This function is for reference/documentation
 */
export function getVisibleSubtotals(
  allSubtotals: Subtotals,
  visibleItemCount: number,
  totalItemCount: number
): Subtotals {
  // If all items are visible, return original subtotals
  if (visibleItemCount === totalItemCount) {
    return allSubtotals;
  }

  // If no items are visible, return zero subtotals
  if (visibleItemCount === 0) {
    return {
      efectivoAmount: 0,
      creditoAmount: 0,
      expectedSavings: 0,
      total: 0,
    };
  }

  // This is a placeholder - actual calculation happens at the source
  // (in subgroup calculations and category balance calculations)
  return allSubtotals;
}
