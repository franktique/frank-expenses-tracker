/**
 * Sub-Group Table Rendering Utilities
 * Handles organizing and rendering table data with sub-groups and uncategorized categories
 */

import type { Subgroup } from "@/types/simulation";

/**
 * Represents a row in the organized table
 */
export type TableRowItem = {
  type: "subgroup_header" | "category" | "subgroup_subtotal";
  id: string | number; // Category ID for regular rows, subgroupId for headers/subtotals
  categoryId?: string | number; // Only for regular category rows
  subgroupId?: string; // Only for subgroup header/subtotal rows
  subgroupName?: string; // Only for subgroup header rows
  categoryCount?: number; // Only for subgroup header rows
  displayOrder?: number; // For sorting
};

/**
 * Organize table data with sub-groups and uncategorized categories
 * Returns an array of table row items that should be rendered in order
 *
 * @param subgroups - Array of sub-groups
 * @param allCategories - Array of all categories
 * @param excludedCategoryIds - Categories to exclude from display
 * @returns Organized array of table row items
 */
export function organizeTableRowsWithSubgroups(
  subgroups: Subgroup[],
  allCategories: Array<{ id: string | number; name: string }>,
  excludedCategoryIds: (string | number)[] = []
): TableRowItem[] {
  const rows: TableRowItem[] = [];

  // Get all category IDs that are in sub-groups
  const categoriesInSubgroups = new Set<string | number>();
  for (const subgroup of subgroups) {
    for (const categoryId of subgroup.categoryIds) {
      categoriesInSubgroups.add(categoryId);
    }
  }

  // Get uncategorized categories (not in any sub-group and not excluded)
  const uncategorizedCategories = allCategories.filter(
    (cat) => !categoriesInSubgroups.has(cat.id) && !excludedCategoryIds.includes(cat.id)
  );

  // Create a map for quick lookup of uncategorized categories
  const uncategorizedMap = new Map<string | number, typeof allCategories[0]>();
  for (const cat of uncategorizedCategories) {
    uncategorizedMap.set(cat.id, cat);
  }

  // Process sub-groups in order
  for (const subgroup of subgroups) {
    // Add sub-group header
    rows.push({
      type: "subgroup_header",
      id: subgroup.id,
      subgroupId: subgroup.id,
      subgroupName: subgroup.name,
      categoryCount: subgroup.categoryIds.length,
      displayOrder: subgroup.displayOrder,
    });

    // Add categories within the sub-group
    for (const categoryId of subgroup.categoryIds) {
      if (!excludedCategoryIds.includes(categoryId)) {
        rows.push({
          type: "category",
          id: categoryId,
          categoryId,
          displayOrder: subgroup.displayOrder,
        });
      }
    }

    // Add sub-group subtotal row
    rows.push({
      type: "subgroup_subtotal",
      id: `${subgroup.id}_subtotal`,
      subgroupId: subgroup.id,
      displayOrder: subgroup.displayOrder,
    });
  }

  // Add uncategorized categories
  for (const category of uncategorizedCategories) {
    rows.push({
      type: "category",
      id: category.id,
      categoryId: category.id,
      displayOrder: Infinity, // Place uncategorized at the end by default
    });
  }

  return rows;
}

/**
 * Get only the category rows from organized table rows
 * Useful for rendering category data
 *
 * @param tableRows - Organized table rows
 * @returns Array of category IDs
 */
export function getCategoryRowsFromTableRows(
  tableRows: TableRowItem[]
): (string | number)[] {
  return tableRows
    .filter((row) => row.type === "category")
    .map((row) => row.categoryId!)
    .filter((id) => id !== undefined);
}

/**
 * Check if a row is part of an expanded sub-group
 * A row should be hidden if its sub-group header is collapsed
 *
 * @param rowItem - The table row item to check
 * @param tableRows - All organized table rows
 * @param expandedSubgroups - Set of expanded sub-group IDs
 * @returns true if the row should be visible, false if hidden
 */
export function shouldShowRow(
  rowItem: TableRowItem,
  tableRows: TableRowItem[],
  expandedSubgroups: Set<string>
): boolean {
  // Headers and subtotals are always shown
  if (rowItem.type === "subgroup_header" || rowItem.type === "subgroup_subtotal") {
    return true;
  }

  // Regular category rows are shown if they're not part of a collapsed sub-group
  // Find if this category is part of a sub-group by looking at the table structure
  let currentSubgroupId: string | undefined = undefined;

  for (const row of tableRows) {
    if (row.type === "subgroup_header") {
      currentSubgroupId = row.subgroupId;
    } else if (row.type === "subgroup_subtotal") {
      currentSubgroupId = undefined;
    } else if (row.type === "category" && row.id === rowItem.id) {
      // Found the row
      if (currentSubgroupId) {
        // It's part of a sub-group, check if expanded
        return expandedSubgroups.has(currentSubgroupId);
      } else {
        // It's uncategorized, always show
        return true;
      }
    }
  }

  return true;
}

/**
 * Get the sub-group ID for a category row if it belongs to one
 * Returns undefined if the category is uncategorized
 *
 * @param categoryId - The category ID to find
 * @param tableRows - All organized table rows
 * @returns Sub-group ID or undefined
 */
export function getSubgroupForCategory(
  categoryId: string | number,
  tableRows: TableRowItem[]
): string | undefined {
  let currentSubgroupId: string | undefined = undefined;

  for (const row of tableRows) {
    if (row.type === "subgroup_header") {
      currentSubgroupId = row.subgroupId;
    } else if (row.type === "subgroup_subtotal") {
      currentSubgroupId = undefined;
    } else if (row.type === "category" && row.id === categoryId) {
      return currentSubgroupId;
    }
  }

  return undefined;
}
