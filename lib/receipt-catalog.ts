import type { CategorySubgroup } from '@/types/funds';

/**
 * Pure helpers shared by the receipt scan review flow: catalog name matching
 * (same normalization as the mobile app) and the line-items sum check.
 */

/** Lowercase → strip diacritics → non-alphanumerics to spaces → trim. */
export function normalizeCatalogName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export interface CatalogItemRef {
  itemId: string;
  subgroupName: string;
}

/**
 * Indexes every catalog item by normalized name → its item id and subgroup
 * name. On duplicate normalized names the first occurrence wins.
 */
export function buildCatalogItemIndex(
  subgroups: CategorySubgroup[]
): Map<string, CatalogItemRef> {
  const index = new Map<string, CatalogItemRef>();
  for (const subgroup of subgroups) {
    for (const item of subgroup.items ?? []) {
      const key = normalizeCatalogName(item.name);
      if (key && !index.has(key)) {
        index.set(key, { itemId: item.id, subgroupName: subgroup.name });
      }
    }
  }
  return index;
}

/** Sums line amounts, ignoring non-numeric entries. */
export function sumLineAmounts(items: { amount: number }[]): number {
  return items.reduce((total, item) => {
    const amount = Number(item.amount);
    return Number.isFinite(amount) ? total + amount : total;
  }, 0);
}

/**
 * True when the line-item total drifts from the expense total by more than
 * 0.5 (same tolerance as the mobile review screen).
 */
export function hasSumMismatch(
  detailsTotal: number,
  expenseAmount: number
): boolean {
  return Math.abs(detailsTotal - expenseAmount) > 0.5;
}
