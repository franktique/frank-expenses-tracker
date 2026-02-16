/**
 * Sub-Group Reordering Utilities
 * Handles logic for reordering sub-groups and uncategorized categories in the simulation budget table
 */

import type { Subgroup } from '@/types/simulation';
import type { TableRowItem } from '@/lib/subgroup-table-utils';

/**
 * Move a sub-group to a new position in the order array
 *
 * @param subgroupOrder - Current array of sub-group IDs
 * @param draggedId - ID of sub-group being dragged
 * @param targetId - ID of target sub-group (or null for end)
 * @param position - "before" or "after" relative to target
 * @returns New subgroupOrder array
 */
export function moveSubgroupInOrder(
  subgroupOrder: string[],
  draggedId: string,
  targetId: string | null,
  position: 'before' | 'after'
): string[] {
  const newOrder = [...subgroupOrder];

  // Find indices
  const draggedIndex = newOrder.indexOf(draggedId);
  if (draggedIndex === -1) return subgroupOrder;

  // Remove dragged item
  const [draggedItem] = newOrder.splice(draggedIndex, 1);

  // Find target index and insert
  if (targetId) {
    let targetIndex = newOrder.indexOf(targetId);
    if (targetIndex === -1) {
      // Target not found, append to end
      newOrder.push(draggedItem);
    } else {
      if (position === 'after') {
        targetIndex += 1;
      }
      newOrder.splice(targetIndex, 0, draggedItem);
    }
  } else {
    // No target, append to end
    newOrder.push(draggedItem);
  }

  return newOrder;
}

/**
 * Reorganize table rows based on custom sub-group order
 *
 * @param subgroups - Array of all sub-groups
 * @param subgroupOrder - Custom ordering of sub-group IDs
 * @param categories - All filtered categories
 * @param expandedSubgroups - Set of expanded sub-group IDs
 * @param excludedCategoryIds - Categories to exclude
 * @returns Reorganized table rows
 */
export function reorganizeTableRowsWithSubgroupOrder(
  subgroups: Subgroup[],
  subgroupOrder: string[],
  categories: Array<{ id: string | number; name: string }>,
  expandedSubgroups: Set<string>,
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

  // Get uncategorized categories
  const uncategorizedCategories = categories.filter(
    (cat) =>
      !categoriesInSubgroups.has(cat.id) &&
      !excludedCategoryIds.includes(cat.id)
  );

  // Create mapping of sub-group ID to sub-group for quick lookup
  const subgroupMap = new Map<string, Subgroup>();
  for (const sg of subgroups) {
    subgroupMap.set(sg.id, sg);
  }

  // Use custom order if available, otherwise use database displayOrder
  let orderedSubgroupIds: string[];

  if (subgroupOrder.length > 0) {
    // Filter existing IDs from custom order and add any new subgroups not in custom order
    const customOrderedIds = subgroupOrder.filter((id) => subgroupMap.has(id));
    const newSubgroupIds = Array.from(subgroupMap.keys()).filter(
      (id) => !customOrderedIds.includes(id)
    );
    // Add new subgroups at the end, sorted by displayOrder
    const newSubgroupsSorted = newSubgroupIds.sort(
      (a, b) =>
        (subgroupMap.get(a)?.displayOrder ?? 0) -
        (subgroupMap.get(b)?.displayOrder ?? 0)
    );
    orderedSubgroupIds = [...customOrderedIds, ...newSubgroupsSorted];
  } else {
    orderedSubgroupIds = subgroups
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((s) => s.id);
  }

  // Process sub-groups in custom order
  for (let sgIndex = 0; sgIndex < orderedSubgroupIds.length; sgIndex++) {
    const subgroupId = orderedSubgroupIds[sgIndex];
    const subgroup = subgroupMap.get(subgroupId);

    if (!subgroup) continue;

    // Add sub-group header
    rows.push({
      type: 'subgroup_header',
      id: subgroup.id,
      subgroupId: subgroup.id,
      subgroupName: subgroup.name,
      categoryCount: subgroup.categoryIds.length,
      displayOrder: sgIndex,
    });

    // Add categories within the sub-group (only if expanded)
    if (expandedSubgroups.has(subgroupId)) {
      for (const categoryId of subgroup.categoryIds) {
        if (!excludedCategoryIds.includes(categoryId)) {
          rows.push({
            type: 'category',
            id: categoryId,
            categoryId,
            displayOrder: sgIndex,
          });
        }
      }
    }

    // Add sub-group subtotal row
    rows.push({
      type: 'subgroup_subtotal',
      id: `${subgroup.id}_subtotal`,
      subgroupId: subgroup.id,
      displayOrder: sgIndex,
    });
  }

  // Add uncategorized categories
  for (const category of uncategorizedCategories) {
    rows.push({
      type: 'category',
      id: category.id,
      categoryId: category.id,
      displayOrder: Infinity,
    });
  }

  return rows;
}

/**
 * Validate that a dragged sub-group ID exists
 *
 * @param subgroupId - ID to validate
 * @param subgroups - Array of all sub-groups
 * @returns true if sub-group exists
 */
export function validateSubgroupId(
  subgroupId: string,
  subgroups: Subgroup[]
): boolean {
  return subgroups.some((sg) => sg.id === subgroupId);
}

/**
 * Clean up sub-group order by removing deleted sub-groups
 *
 * @param subgroupOrder - Current ordering
 * @param subgroups - Current sub-groups
 * @returns Cleaned sub-group order
 */
export function cleanupSubgroupOrder(
  subgroupOrder: string[],
  subgroups: Subgroup[]
): string[] {
  const validIds = new Set(subgroups.map((s) => s.id));
  return subgroupOrder.filter((id) => validIds.has(id));
}

/**
 * Initialize sub-group order from database displayOrder
 *
 * @param subgroups - Array of sub-groups from database
 * @returns Array of sub-group IDs in displayOrder sequence
 */
export function initializeSubgroupOrder(subgroups: Subgroup[]): string[] {
  return subgroups
    .sort((a, b) => a.displayOrder - b.displayOrder)
    .map((s) => s.id);
}
